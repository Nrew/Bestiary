use crate::db::queries;
use crate::error::AppError;
use crate::models::{ItemExport, ID};
use sqlx::{Pool, Sqlite};
use tauri::State;

#[tauri::command]
pub async fn search_items(
    query: String,
    limit: u32,
    offset: u32,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<Vec<ItemExport>, AppError> {
    queries::search_items(&pool, &query, limit, offset).await
}

#[tauri::command]
pub async fn get_item_search_count(
    query: String,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<i64, AppError> {
    queries::get_item_search_count(&pool, &query).await
}

#[tauri::command]
pub async fn get_item_details(
    id: ID,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<ItemExport, AppError> {
    queries::get_item_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn save_item(
    item: ItemExport,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<ItemExport, AppError> {
    queries::save_item(&pool, item).await
}

#[tauri::command]
pub async fn delete_item(id: ID, pool: State<'_, Pool<Sqlite>>) -> Result<(), AppError> {
    queries::delete_item(&pool, &id).await
}
