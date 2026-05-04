use crate::db::queries::{AbilityRepository, EntityRepository, ItemRepository, StatusRepository};
use crate::db::Repository;
use crate::error::AppError;
use crate::models::{AbilityExport, EntityExport, ItemExport, StatusExport};
use serde::Deserialize;
use sqlx::{Pool, Sqlite};

const SEED_DATA: &str = include_str!("../../seed/seed.json");

const SEED_VERSION_KEY: &str = "seed.version";

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct SeedFile {
    version: String,
    data: SeedData,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct SeedData {
    statuses: Vec<StatusExport>,
    items: Vec<ItemExport>,
    abilities: Vec<AbilityExport>,
    entities: Vec<EntityExport>,
}

/// Seeds from the bundled `seed.json` on first run; no-op if already seeded.
pub async fn seed_database_if_needed(pool: &Pool<Sqlite>) -> Result<bool, AppError> {
    let seeded: Option<(String,)> = sqlx::query_as("SELECT value FROM app_metadata WHERE key = ?")
        .bind(SEED_VERSION_KEY)
        .fetch_optional(pool)
        .await?;

    if let Some((version,)) = seeded {
        log::info!(
            "Database seed marker '{}' exists. Skipping seed process.",
            version
        );
        return Ok(false);
    }

    let content_count: (i64,) = sqlx::query_as(
        r#"
        SELECT
            (SELECT COUNT(*) FROM entities) +
            (SELECT COUNT(*) FROM items) +
            (SELECT COUNT(*) FROM statuses) +
            (SELECT COUNT(*) FROM abilities)
        "#,
    )
    .fetch_one(pool)
    .await?;

    if content_count.0 > 0 {
        log::info!(
            "Database already contains {} content records. Marking seed as skipped.",
            content_count.0
        );
        sqlx::query(
            "INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
        )
        .bind(SEED_VERSION_KEY)
        .bind("existing-content")
        .execute(pool)
        .await?;
        return Ok(false);
    }

    log::info!("Database is empty. Proceeding with initial data seeding.");

    seed_database_from_json(pool, SEED_DATA).await?;

    Ok(true)
}

pub(crate) async fn seed_database_from_json(
    pool: &Pool<Sqlite>,
    json_data: &str,
) -> Result<String, AppError> {
    log::info!("Starting database seeding from JSON data...");

    let seed_file: SeedFile = serde_json::from_str(json_data).map_err(|e| {
        log::error!("Failed to parse seed JSON: {}", e);
        AppError::Io {
            message: format!("Invalid seed file format: {}", e),
        }
    })?;

    log::info!("Seeding from version '{}'.", seed_file.version);

    let mut tx = pool.begin().await?;

    log::warn!("Clearing all existing data from the database before seeding.");
    sqlx::query("DELETE FROM entity_inventory")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM entity_abilities")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM entity_statuses")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM entity_images")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM entities")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM items").execute(&mut *tx).await?;
    sqlx::query("DELETE FROM statuses")
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM abilities")
        .execute(&mut *tx)
        .await?;

    let seed_version = seed_file.version;
    let seed_data = seed_file.data;

    log::info!("Seeding {} statuses...", seed_data.statuses.len());
    for status in seed_data.statuses {
        StatusRepository::prepare_for_save(&mut tx, &status).await?;
    }

    log::info!("Seeding {} items...", seed_data.items.len());
    for item in seed_data.items {
        ItemRepository::prepare_for_save(&mut tx, &item).await?;
    }

    log::info!("Seeding {} abilities...", seed_data.abilities.len());
    for ability in seed_data.abilities {
        AbilityRepository::prepare_for_save(&mut tx, &ability).await?;
    }

    log::info!("Seeding {} entities...", seed_data.entities.len());
    for entity in seed_data.entities {
        EntityRepository::prepare_for_save(&mut tx, &entity).await?;
    }

    // Write the seed version marker INSIDE the same transaction so that a process
    // kill between seeding and marker write cannot leave us in a partial state.
    // Either the data and the marker are both committed, or neither is.
    sqlx::query(
        "INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
    )
    .bind(SEED_VERSION_KEY)
    .bind(&seed_version)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    log::info!("Database seeding complete.");
    Ok(seed_version)
}
