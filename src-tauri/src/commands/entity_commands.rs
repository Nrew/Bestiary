use crate::commands::utility_commands::delete_image_file_on_disk;
use crate::db::queries;
use crate::error::AppError;
use crate::models::{EntityExport, ID};
use crate::util;
use sqlx::{Pool, Sqlite};
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn search_entities(
    query: String,
    limit: u32,
    offset: u32,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<Vec<EntityExport>, AppError> {
    queries::search_entities(&pool, &query, limit, offset).await
}

#[tauri::command]
pub async fn get_entity_search_count(
    query: String,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<i64, AppError> {
    queries::get_entity_search_count(&pool, &query).await
}

#[tauri::command]
pub async fn get_entity_details(
    id: ID,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<EntityExport, AppError> {
    queries::get_entity_by_id(&pool, &id).await
}

/// Saves an entity and best-effort removes image files that were detached by
/// the update and are no longer referenced by any entity.
#[tauri::command]
pub async fn save_entity(
    app_handle: AppHandle,
    entity: EntityExport,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<EntityExport, AppError> {
    let previous_image_paths = queries::get_entity_image_paths(&pool, &entity.id)
        .await
        .unwrap_or_default();
    let saved = queries::save_entity(&pool, entity).await?;
    cleanup_removed_entity_images(&app_handle, &pool, previous_image_paths, &saved.images).await;
    Ok(saved)
}

async fn cleanup_removed_entity_images(
    app_handle: &AppHandle,
    pool: &Pool<Sqlite>,
    previous_image_paths: Vec<String>,
    saved_image_paths: &[String],
) {
    let saved_image_paths: std::collections::HashSet<&String> = saved_image_paths.iter().collect();
    let removed_image_paths: Vec<String> = previous_image_paths
        .into_iter()
        .filter(|image_ref| !saved_image_paths.contains(image_ref))
        .collect();

    if removed_image_paths.is_empty() {
        return;
    }

    let images_dir = match util::get_app_data_dir(app_handle) {
        Ok(dir) => dir.join("images"),
        Err(e) => {
            log::warn!(
                "save_entity: unable to resolve app data dir for removed image cleanup: {}",
                e
            );
            return;
        }
    };

    for image_ref in removed_image_paths {
        let remaining_refs = match queries::count_image_references(pool, &image_ref).await {
            Ok(count) => count,
            Err(e) => {
                log::warn!("save_entity: unable to count remaining image refs: {}", e);
                continue;
            }
        };

        if remaining_refs > 0 {
            continue;
        }

        if let Err(e) = delete_image_file_on_disk(&images_dir, &image_ref) {
            log::warn!(
                "save_entity: failed to remove unreferenced image file: {}",
                e
            );
        }
    }
}

/// Deletes an entity row first, then best-effort removes image files that no
/// remaining entity references. File cleanup failures are logged so a stale
/// file cannot turn into a lost database delete.
#[tauri::command]
pub async fn delete_entity(
    app_handle: AppHandle,
    id: ID,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<(), AppError> {
    // FK cascade removes entity_images with the entity row.
    let image_paths = queries::get_entity_image_paths(&pool, &id).await?;

    queries::delete_entity(&pool, &id).await?;

    let images_dir = match util::get_app_data_dir(&app_handle) {
        Ok(dir) => dir.join("images"),
        Err(e) => {
            log::warn!(
                "delete_entity: unable to resolve app data dir for image cleanup: {}",
                e
            );
            return Ok(());
        }
    };

    for image_ref in image_paths {
        let remaining_refs = match queries::count_image_references(&pool, &image_ref).await {
            Ok(count) => count,
            Err(e) => {
                log::warn!(
                    "delete_entity: unable to count remaining image refs for '{}': {}",
                    image_ref,
                    e
                );
                continue;
            }
        };

        if remaining_refs > 0 {
            continue;
        }

        if let Err(e) = delete_image_file_on_disk(&images_dir, &image_ref) {
            log::warn!(
                "delete_entity: failed to remove image file '{}': {}",
                image_ref,
                e
            );
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::db::queries;
    use sqlx::sqlite::SqlitePoolOptions;

    #[tokio::test]
    async fn counts_remaining_image_references_after_one_entity_row_is_removed() {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("in-memory sqlite pool should open");

        sqlx::query(
            "CREATE TABLE entity_images (
                entity_id TEXT NOT NULL,
                image_path TEXT NOT NULL,
                PRIMARY KEY (entity_id, image_path)
            )",
        )
        .execute(&pool)
        .await
        .expect("test table should be created");

        for entity_id in ["entity-a", "entity-b"] {
            sqlx::query("INSERT INTO entity_images (entity_id, image_path) VALUES (?, ?)")
                .bind(entity_id)
                .bind("shared.webp")
                .execute(&pool)
                .await
                .expect("test image reference should insert");
        }

        sqlx::query("DELETE FROM entity_images WHERE entity_id = ?")
            .bind("entity-a")
            .execute(&pool)
            .await
            .expect("test delete should succeed");

        let remaining = queries::count_image_references(&pool, "shared.webp")
            .await
            .expect("remaining image refs should be counted");

        assert_eq!(remaining, 1);
    }
}
