use crate::db::Repository;
use crate::error::AppError;
use crate::models::{
    Ability, AbilityExport, Entity, EntityExport, Item, ItemExport, LootDrop, Status, StatusExport,
    ID,
};
use async_trait::async_trait;
use chrono::Utc;
use futures::try_join;
use serde::Serialize;
use sqlx::{types::Json, Pool, Sqlite, Transaction};
use std::collections::{HashMap, HashSet};
use std::path::Path;

/// Build a comma-separated list of positional SQLite bind parameters: `?1, ?2, ?3, ...`
fn sql_placeholders(count: usize) -> String {
    (0..count)
        .map(|i| format!("?{}", i + 1))
        .collect::<Vec<_>>()
        .join(", ")
}

fn enum_to_db_string<T: Serialize>(value: &T, label: &str) -> Result<String, AppError> {
    let serialized = serde_json::to_string(value).map_err(|error| {
        log::error!(
            "Failed to serialize {} for database storage: {}",
            label,
            error
        );
        AppError::Database {
            message: format!("Failed to serialize {} for storage.", label),
        }
    })?;

    Ok(serialized.trim_matches('"').to_string())
}

/// Validates a managed image reference stored in the database.
///
/// The persistence contract is that `entity_images.image_path` always holds a
/// bare managed filename (no path separators, no leading dot, no control
/// characters) with a whitelisted extension. Any caller that writes to that
/// column MUST run the value through this function first.
fn validate_image_reference(image_ref: &str) -> Result<(), AppError> {
    if image_ref.is_empty() || image_ref.contains('\0') {
        return Err(AppError::Validation {
            errors: vec!["Image reference must be a non-empty managed filename.".to_string()],
        });
    }
    if image_ref.contains('/') || image_ref.contains('\\') {
        return Err(AppError::Validation {
            errors: vec![
                "Image references must be bare filenames without path separators.".to_string(),
            ],
        });
    }
    if image_ref.starts_with('.') {
        return Err(AppError::Validation {
            errors: vec!["Image references must not start with a dot.".to_string()],
        });
    }

    // file_name() should be a no-op on a bare filename; the extra round-trip
    // catches rare odd inputs that survived the slash/dot checks.
    let filename = Path::new(image_ref)
        .file_name()
        .and_then(|f| f.to_str())
        .filter(|f| *f == image_ref)
        .ok_or_else(|| AppError::Validation {
            errors: vec!["Image reference is not a valid managed filename.".to_string()],
        })?;

    let extension = Path::new(filename)
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .ok_or_else(|| AppError::Validation {
            errors: vec!["Image references must include a valid image extension.".to_string()],
        })?;

    if !matches!(extension.as_str(), "jpg" | "jpeg" | "png" | "gif" | "webp") {
        return Err(AppError::Validation {
            errors: vec![
                "Image references must use jpg, jpeg, png, gif, or webp files.".to_string(),
            ],
        });
    }

    Ok(())
}

#[cfg(test)]
#[allow(clippy::items_after_test_module)]
mod image_ref_validation_tests {
    use super::validate_image_reference;

    #[test]
    fn accepts_bare_uuid_filename() {
        assert!(validate_image_reference("0a7e64dc-0ee6-4f5e-bf4a-7cdfe9ef5f1c.webp").is_ok());
    }

    #[test]
    fn rejects_forward_slash_path() {
        assert!(validate_image_reference("subdir/foo.webp").is_err());
    }

    #[test]
    fn rejects_backslash_path() {
        assert!(validate_image_reference("subdir\\foo.webp").is_err());
    }

    #[test]
    fn rejects_absolute_windows_path() {
        assert!(validate_image_reference("C:\\Users\\victim\\.ssh\\id_rsa").is_err());
    }

    #[test]
    fn rejects_absolute_unix_path() {
        assert!(validate_image_reference("/etc/passwd").is_err());
    }

    #[test]
    fn rejects_path_traversal() {
        assert!(validate_image_reference("..\\evil.webp").is_err());
        assert!(validate_image_reference("../evil.webp").is_err());
    }

    #[test]
    fn rejects_dotfile() {
        assert!(validate_image_reference(".hidden.webp").is_err());
    }

    #[test]
    fn rejects_unsupported_extension() {
        assert!(validate_image_reference("payload.exe").is_err());
    }

    #[test]
    fn rejects_empty() {
        assert!(validate_image_reference("").is_err());
    }
}

/// Validate that all referenced IDs exist in a hard-coded database table.
/// Uses a single batched `IN` query instead of N individual round-trips.
async fn validate_existing_ids(
    tx: &mut Transaction<'_, Sqlite>,
    table: &'static str,
    label: &'static str,
    ids: &[ID],
) -> Result<(), AppError> {
    if ids.is_empty() {
        return Ok(());
    }
    const MAX_IDS_TO_VALIDATE: usize = 100;
    if ids.len() > MAX_IDS_TO_VALIDATE {
        return Err(AppError::Validation {
            errors: vec![format!(
                "Too many {} references: {} exceeds maximum of {}",
                label,
                ids.len(),
                MAX_IDS_TO_VALIDATE
            )],
        });
    }

    // Single query for all IDs - safe because values are bound as parameters
    let sql = format!(
        "SELECT id FROM {} WHERE id IN ({})",
        table,
        sql_placeholders(ids.len())
    );
    let mut query = sqlx::query_as::<_, (String,)>(&sql);
    for id in ids {
        query = query.bind(id);
    }
    let found: Vec<(String,)> = query.fetch_all(&mut **tx).await?;

    if found.len() == ids.len() {
        return Ok(());
    }

    let found_set: std::collections::HashSet<&str> =
        found.iter().map(|(id,)| id.as_str()).collect();
    let missing: Vec<&str> = ids
        .iter()
        .filter(|id| !found_set.contains(id.as_str()))
        .map(|id| id.as_str())
        .take(5)
        .collect();

    Err(AppError::Validation {
        errors: vec![format!(
            "The following {} references do not exist: {}",
            label,
            missing.join(", ")
        )],
    })
}

// --- Domain repositories ---

pub struct StatusRepository;

#[async_trait]
impl Repository<StatusExport, Status> for StatusRepository {
    fn table_name() -> &'static str {
        "statuses"
    }

    fn fts_table_name() -> Option<&'static str> {
        Some("statuses_fts")
    }

    async fn prepare_for_save(
        tx: &mut Transaction<'_, Sqlite>,
        export: &StatusExport,
    ) -> Result<(), AppError> {
        let now = Utc::now();
        sqlx::query(
            r#"
            INSERT INTO statuses (id, name, short_tag, icon, color, summary, description, payload_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name, short_tag = excluded.short_tag, icon = excluded.icon,
                color = excluded.color, summary = excluded.summary, description = excluded.description,
                payload_json = excluded.payload_json, updated_at = excluded.updated_at
            "#
        )
        .bind(&export.id)
        .bind(&export.name)
        .bind(&export.short_tag)
        .bind(&export.icon)
        .bind(&export.color)
        .bind(&export.summary)
        .bind(&export.description)
        .bind(Json(&export.payload))
        .bind(now)
        .bind(now)
        .execute(&mut **tx)
        .await?;
        Ok(())
    }

    fn get_id(export: &StatusExport) -> String {
        export.id.clone()
    }
}

pub struct ItemRepository;

#[async_trait]
impl Repository<ItemExport, Item> for ItemRepository {
    fn table_name() -> &'static str {
        "items"
    }

    fn fts_table_name() -> Option<&'static str> {
        Some("items_fts")
    }

    async fn prepare_for_save(
        tx: &mut Transaction<'_, Sqlite>,
        export: &ItemExport,
    ) -> Result<(), AppError> {
        let now = Utc::now();
        sqlx::query(
            r#"
            INSERT INTO items (id, name, slug, type, description, icon, weight, bulk, rarity,
                               properties_json, equip_slots_json, stat_modifiers_json, durability_json,
                               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name, slug = excluded.slug, type = excluded.type,
                description = excluded.description, icon = excluded.icon, weight = excluded.weight,
                bulk = excluded.bulk, rarity = excluded.rarity, properties_json = excluded.properties_json,
                equip_slots_json = excluded.equip_slots_json, stat_modifiers_json = excluded.stat_modifiers_json,
                durability_json = excluded.durability_json, updated_at = excluded.updated_at
            "#
        )
        .bind(&export.id)
        .bind(&export.name)
        .bind(&export.slug)
        .bind(&export.r#type)
        .bind(&export.description)
        .bind(&export.icon)
        .bind(export.weight)
        .bind(export.bulk)
        .bind(&export.rarity)
        .bind(Json(&export.properties))
        .bind(Json(&export.equip_slots))
        .bind(Json(&export.stat_modifiers))
        .bind(export.durability.as_ref().map(Json))
        .bind(now)
        .bind(now)
        .execute(&mut **tx)
        .await?;
        Ok(())
    }

    fn get_id(export: &ItemExport) -> String {
        export.id.clone()
    }
}

pub struct AbilityRepository;

#[async_trait]
impl Repository<AbilityExport, Ability> for AbilityRepository {
    fn table_name() -> &'static str {
        "abilities"
    }

    fn fts_table_name() -> Option<&'static str> {
        Some("abilities_fts")
    }

    async fn prepare_for_save(
        tx: &mut Transaction<'_, Sqlite>,
        export: &AbilityExport,
    ) -> Result<(), AppError> {
        let now = Utc::now();
        sqlx::query(
            r#"
            INSERT INTO abilities (id, name, slug, description, type, target_json, casting_time,
                                   requires_concentration, components_json, recharge, effects_json,
                                   created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name, slug = excluded.slug, description = excluded.description,
                type = excluded.type, target_json = excluded.target_json, casting_time = excluded.casting_time,
                requires_concentration = excluded.requires_concentration, components_json = excluded.components_json,
                recharge = excluded.recharge, effects_json = excluded.effects_json,
                updated_at = excluded.updated_at
            "#
        )
        .bind(&export.id)
        .bind(&export.name)
        .bind(&export.slug)
        .bind(&export.description)
        .bind(&export.r#type)
        .bind(export.target.as_ref().map(Json))
        .bind(&export.casting_time)
        .bind(export.requires_concentration)
        .bind(export.components.as_ref().map(Json))
        .bind(&export.recharge)
        .bind(Json(&export.effects))
        .bind(now)
        .bind(now)
        .execute(&mut **tx)
        .await?;
        Ok(())
    }

    fn get_id(export: &AbilityExport) -> String {
        export.id.clone()
    }
}

pub struct EntityRepository;

#[async_trait]
impl Repository<EntityExport, Entity> for EntityRepository {
    fn table_name() -> &'static str {
        "entities"
    }

    fn fts_table_name() -> Option<&'static str> {
        Some("entities_fts")
    }

    async fn hydrate(pool: &Pool<Sqlite>, entities: &mut [Entity]) -> Result<(), AppError> {
        if entities.is_empty() {
            return Ok(());
        }

        let mut ability_map: HashMap<String, Vec<String>> = HashMap::new();
        let mut status_map: HashMap<String, Vec<String>> = HashMap::new();
        let mut inventory_map: HashMap<String, Vec<LootDrop>> = HashMap::new();
        let mut image_map: HashMap<String, Vec<String>> = HashMap::new();

        for chunk in entities.chunks(500) {
            let ids: Vec<&str> = chunk.iter().map(|e| e.id.as_str()).collect();
            let placeholders = sql_placeholders(ids.len());

            let ability_sql = format!(
                "SELECT entity_id, ability_id FROM entity_abilities WHERE entity_id IN ({})",
                placeholders
            );
            let status_sql = format!(
                "SELECT entity_id, status_id FROM entity_statuses WHERE entity_id IN ({})",
                placeholders
            );
            let inventory_sql = format!(
                "SELECT entity_id, item_id, quantity, drop_chance FROM entity_inventory WHERE entity_id IN ({})",
                placeholders
            );
            let image_sql = format!(
                "SELECT entity_id, image_path FROM entity_images WHERE entity_id IN ({})",
                placeholders
            );

            let mut ability_q = sqlx::query_as::<_, (String, String)>(&ability_sql);
            let mut status_q = sqlx::query_as::<_, (String, String)>(&status_sql);
            let mut inventory_q =
                sqlx::query_as::<_, (String, String, String, f64)>(&inventory_sql);
            let mut image_q = sqlx::query_as::<_, (String, String)>(&image_sql);

            for id in &ids {
                ability_q = ability_q.bind(id);
                status_q = status_q.bind(id);
                inventory_q = inventory_q.bind(id);
                image_q = image_q.bind(id);
            }

            let (abilities, statuses, inventory, images): (
                Vec<(String, String)>,
                Vec<(String, String)>,
                Vec<(String, String, String, f64)>,
                Vec<(String, String)>,
            ) = try_join!(
                ability_q.fetch_all(pool),
                status_q.fetch_all(pool),
                inventory_q.fetch_all(pool),
                image_q.fetch_all(pool),
            )?;

            for (entity_id, ability_id) in abilities {
                ability_map.entry(entity_id).or_default().push(ability_id);
            }
            for (entity_id, status_id) in statuses {
                status_map.entry(entity_id).or_default().push(status_id);
            }
            for (entity_id, item_id, quantity, drop_chance) in inventory {
                inventory_map.entry(entity_id).or_default().push(LootDrop {
                    item_id,
                    quantity,
                    drop_chance,
                });
            }
            for (entity_id, image_path) in images {
                image_map.entry(entity_id).or_default().push(image_path);
            }
        }

        for entity in entities.iter_mut() {
            entity.ability_ids = ability_map.remove(&entity.id).unwrap_or_default();
            entity.status_ids = status_map.remove(&entity.id).unwrap_or_default();
            entity.inventory = inventory_map.remove(&entity.id).unwrap_or_default();
            entity.images = image_map.remove(&entity.id).unwrap_or_default();
        }

        Ok(())
    }

    async fn prepare_for_save(
        tx: &mut Transaction<'_, Sqlite>,
        export: &EntityExport,
    ) -> Result<(), AppError> {
        // status_immunities is JSON, not an FK column; enforce referential integrity manually
        validate_existing_ids(tx, "statuses", "status immunity", &export.status_immunities).await?;
        validate_existing_ids(tx, "statuses", "status effect", &export.status_ids).await?;
        validate_existing_ids(tx, "abilities", "ability", &export.ability_ids).await?;
        let inventory_item_ids: Vec<ID> = export
            .inventory
            .iter()
            .map(|loot| loot.item_id.clone())
            .collect();
        validate_existing_ids(tx, "items", "inventory item", &inventory_item_ids).await?;

        let now = Utc::now();

        let size_str = export
            .size
            .as_ref()
            .map(|size| enum_to_db_string(size, "entity size"))
            .transpose()?;

        let threat_str = export
            .threat_level
            .as_ref()
            .map(|threat| enum_to_db_string(threat, "threat level"))
            .transpose()?;

        let saving_throws_for_db: HashMap<String, i32> = export
            .saving_throws
            .iter()
            .map(|(attr, val)| {
                let key = enum_to_db_string(attr, "attribute")?;
                Ok((key, *val))
            })
            .collect::<Result<_, AppError>>()?;

        sqlx::query(
            r#"
            INSERT INTO entities (
                id, name, slug, taxonomy_json, size, threat_level, alignment,
                challenge_rating, experience_points, proficiency_bonus, legendary_actions_per_round,
                saving_throws_json, skills_json, damage_resistances_json,
                status_immunities_json, senses_json, languages_json,
                habitats_json, description, stat_block_json, notes, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name, slug = excluded.slug, taxonomy_json = excluded.taxonomy_json,
                size = excluded.size, threat_level = excluded.threat_level, alignment = excluded.alignment,
                challenge_rating = excluded.challenge_rating, experience_points = excluded.experience_points,
                proficiency_bonus = excluded.proficiency_bonus, legendary_actions_per_round = excluded.legendary_actions_per_round,
                saving_throws_json = excluded.saving_throws_json, skills_json = excluded.skills_json,
                damage_resistances_json = excluded.damage_resistances_json,
                status_immunities_json = excluded.status_immunities_json,
                senses_json = excluded.senses_json, languages_json = excluded.languages_json,
                habitats_json = excluded.habitats_json, description = excluded.description,
                stat_block_json = excluded.stat_block_json, notes = excluded.notes,
                updated_at = excluded.updated_at
            "#
        )
        .bind(&export.id)
        .bind(&export.name)
        .bind(&export.slug)
        .bind(Json(&export.taxonomy))
        .bind(size_str)
        .bind(threat_str)
        .bind(&export.alignment)
        .bind(export.challenge_rating)
        .bind(export.experience_points)
        .bind(export.proficiency_bonus)
        .bind(export.legendary_actions_per_round)
        .bind(Json(&saving_throws_for_db))
        .bind(Json(&export.skills))
        .bind(Json(&export.damage_resistances))
        .bind(Json(&export.status_immunities))
        .bind(Json(&export.senses))
        .bind(Json(&export.languages))
        .bind(Json(&export.habitats))
        .bind(&export.description)
        .bind(Json(&export.stat_block))
        .bind(&export.notes)
        .bind(now)
        .bind(now)
        .execute(&mut **tx)
        .await?;

        update_entity_abilities(tx, &export.id, &export.ability_ids).await?;
        update_entity_statuses(tx, &export.id, &export.status_ids).await?;
        update_entity_inventory(tx, &export.id, &export.inventory).await?;
        update_entity_images(tx, &export.id, &export.images).await?;

        Ok(())
    }

    fn get_id(export: &EntityExport) -> String {
        export.id.clone()
    }
}

// --- Entity junction helpers ---

/// Generic many-to-many updater for junction tables that link an entity to a
/// list of IDs (abilities, statuses, images). Computes the symmetric difference
/// between the current DB state and the desired state, then issues targeted
/// INSERT/DELETE statements rather than a full replace; this preserves any
/// extra columns that might be added to the junction table in future migrations.
///
/// `table` and `id_column` are always compile-time string literals; they are
/// never derived from user input, so building the SQL strings here is safe.
async fn update_junction_ids(
    tx: &mut Transaction<'_, Sqlite>,
    entity_id: &ID,
    table: &str,
    id_column: &str,
    desired_ids: &[ID],
) -> Result<(), AppError> {
    let rows: Vec<(String,)> = sqlx::query_as(&format!(
        "SELECT {id_column} FROM {table} WHERE entity_id = ?"
    ))
    .bind(entity_id)
    .fetch_all(&mut **tx)
    .await?;

    let current_ids: HashSet<String> = rows.into_iter().map(|(id,)| id).collect();
    let desired_set: HashSet<String> = desired_ids.iter().cloned().collect();

    for id_to_add in desired_set.difference(&current_ids) {
        sqlx::query(&format!(
            "INSERT INTO {table} (entity_id, {id_column}) VALUES (?, ?)"
        ))
        .bind(entity_id)
        .bind(id_to_add)
        .execute(&mut **tx)
        .await?;
    }

    for id_to_remove in current_ids.difference(&desired_set) {
        sqlx::query(&format!(
            "DELETE FROM {table} WHERE entity_id = ? AND {id_column} = ?"
        ))
        .bind(entity_id)
        .bind(id_to_remove)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

async fn update_entity_abilities(
    tx: &mut Transaction<'_, Sqlite>,
    entity_id: &ID,
    desired_ids: &[ID],
) -> Result<(), AppError> {
    update_junction_ids(tx, entity_id, "entity_abilities", "ability_id", desired_ids).await
}

async fn update_entity_statuses(
    tx: &mut Transaction<'_, Sqlite>,
    entity_id: &ID,
    desired_ids: &[ID],
) -> Result<(), AppError> {
    update_junction_ids(tx, entity_id, "entity_statuses", "status_id", desired_ids).await
}

async fn update_entity_inventory(
    tx: &mut Transaction<'_, Sqlite>,
    entity_id: &ID,
    desired_inventory: &[LootDrop],
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM entity_inventory WHERE entity_id = ?")
        .bind(entity_id)
        .execute(&mut **tx)
        .await?;

    for loot in desired_inventory {
        sqlx::query(
            "INSERT INTO entity_inventory (entity_id, item_id, quantity, drop_chance) VALUES (?, ?, ?, ?)",
        )
        .bind(entity_id)
        .bind(&loot.item_id)
        .bind(&loot.quantity)
        .bind(loot.drop_chance)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

async fn update_entity_images(
    tx: &mut Transaction<'_, Sqlite>,
    entity_id: &ID,
    desired_images: &[String],
) -> Result<(), AppError> {
    for image in desired_images {
        validate_image_reference(image)?;
    }
    update_junction_ids(tx, entity_id, "entity_images", "image_path", desired_images).await
}

pub async fn delete_entity_image_reference(
    pool: &Pool<Sqlite>,
    image_path: &str,
) -> Result<(), AppError> {
    sqlx::query("DELETE FROM entity_images WHERE image_path = ?")
        .bind(image_path)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn count_image_references(
    pool: &Pool<Sqlite>,
    image_path: &str,
) -> Result<i64, AppError> {
    let (count,): (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM entity_images WHERE image_path = ?")
            .bind(image_path)
            .fetch_one(pool)
            .await?;
    Ok(count)
}

/// Fetch all image paths associated with an entity. Used to identify image files
/// that should be removed from disk when the entity is deleted; the DB rows
/// themselves are removed via FK cascade on the `entities` delete.
pub async fn get_entity_image_paths(pool: &Pool<Sqlite>, id: &ID) -> Result<Vec<String>, AppError> {
    let rows: Vec<(String,)> =
        sqlx::query_as("SELECT image_path FROM entity_images WHERE entity_id = ?")
            .bind(id)
            .fetch_all(pool)
            .await?;
    Ok(rows.into_iter().map(|(p,)| p).collect())
}

// --- Query entry points ---

pub async fn search_entities(
    pool: &Pool<Sqlite>,
    query: &str,
    limit: u32,
    offset: u32,
) -> Result<Vec<EntityExport>, AppError> {
    EntityRepository::search(pool, query, limit, offset).await
}

pub async fn get_entity_search_count(pool: &Pool<Sqlite>, query: &str) -> Result<i64, AppError> {
    EntityRepository::count(pool, query).await
}

pub async fn get_entity_by_id(pool: &Pool<Sqlite>, id: &ID) -> Result<EntityExport, AppError> {
    EntityRepository::get_by_id(pool, id).await
}

pub async fn get_all_entities_unpaginated(
    pool: &Pool<Sqlite>,
) -> Result<Vec<EntityExport>, AppError> {
    EntityRepository::get_all(pool).await
}

pub async fn save_entity(
    pool: &Pool<Sqlite>,
    entity: EntityExport,
) -> Result<EntityExport, AppError> {
    EntityRepository::save(pool, entity).await
}

pub async fn delete_entity(pool: &Pool<Sqlite>, id: &ID) -> Result<(), AppError> {
    EntityRepository::delete(pool, id).await
}

pub async fn search_items(
    pool: &Pool<Sqlite>,
    query: &str,
    limit: u32,
    offset: u32,
) -> Result<Vec<ItemExport>, AppError> {
    ItemRepository::search(pool, query, limit, offset).await
}

pub async fn get_item_search_count(pool: &Pool<Sqlite>, query: &str) -> Result<i64, AppError> {
    ItemRepository::count(pool, query).await
}

pub async fn get_item_by_id(pool: &Pool<Sqlite>, id: &ID) -> Result<ItemExport, AppError> {
    ItemRepository::get_by_id(pool, id).await
}

pub async fn get_all_items_unpaginated(pool: &Pool<Sqlite>) -> Result<Vec<ItemExport>, AppError> {
    ItemRepository::get_all(pool).await
}

pub async fn save_item(pool: &Pool<Sqlite>, item: ItemExport) -> Result<ItemExport, AppError> {
    ItemRepository::save(pool, item).await
}

pub async fn delete_item(pool: &Pool<Sqlite>, id: &ID) -> Result<(), AppError> {
    ItemRepository::delete(pool, id).await
}

pub async fn search_statuses(
    pool: &Pool<Sqlite>,
    query: &str,
    limit: u32,
    offset: u32,
) -> Result<Vec<StatusExport>, AppError> {
    StatusRepository::search(pool, query, limit, offset).await
}

pub async fn get_status_search_count(pool: &Pool<Sqlite>, query: &str) -> Result<i64, AppError> {
    StatusRepository::count(pool, query).await
}

pub async fn get_status_by_id(pool: &Pool<Sqlite>, id: &ID) -> Result<StatusExport, AppError> {
    StatusRepository::get_by_id(pool, id).await
}

pub async fn get_all_statuses(pool: &Pool<Sqlite>) -> Result<Vec<StatusExport>, AppError> {
    StatusRepository::get_all(pool).await
}

pub async fn save_status(
    pool: &Pool<Sqlite>,
    status: StatusExport,
) -> Result<StatusExport, AppError> {
    StatusRepository::save(pool, status).await
}

pub async fn delete_status(pool: &Pool<Sqlite>, id: &ID) -> Result<(), AppError> {
    StatusRepository::delete(pool, id).await
}

pub async fn search_abilities(
    pool: &Pool<Sqlite>,
    query: &str,
    limit: u32,
    offset: u32,
) -> Result<Vec<AbilityExport>, AppError> {
    AbilityRepository::search(pool, query, limit, offset).await
}

pub async fn get_ability_search_count(pool: &Pool<Sqlite>, query: &str) -> Result<i64, AppError> {
    AbilityRepository::count(pool, query).await
}

pub async fn get_ability_by_id(pool: &Pool<Sqlite>, id: &ID) -> Result<AbilityExport, AppError> {
    AbilityRepository::get_by_id(pool, id).await
}

pub async fn get_all_abilities(pool: &Pool<Sqlite>) -> Result<Vec<AbilityExport>, AppError> {
    AbilityRepository::get_all(pool).await
}

pub async fn save_ability(
    pool: &Pool<Sqlite>,
    ability: AbilityExport,
) -> Result<AbilityExport, AppError> {
    AbilityRepository::save(pool, ability).await
}

pub async fn delete_ability(pool: &Pool<Sqlite>, id: &ID) -> Result<(), AppError> {
    AbilityRepository::delete(pool, id).await
}
