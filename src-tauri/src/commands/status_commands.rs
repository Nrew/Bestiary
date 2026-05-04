use crate::db::queries;
use crate::error::AppError;
use crate::models::{StatusExport, ID};
use sqlx::{Pool, Sqlite};
use tauri::State;

#[tauri::command]
pub async fn search_statuses(
    query: String,
    limit: u32,
    offset: u32,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<Vec<StatusExport>, AppError> {
    queries::search_statuses(&pool, &query, limit, offset).await
}

#[tauri::command]
pub async fn get_status_search_count(
    query: String,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<i64, AppError> {
    queries::get_status_search_count(&pool, &query).await
}

#[tauri::command]
pub async fn get_status_details(
    id: ID,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<StatusExport, AppError> {
    queries::get_status_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn save_status(
    status: StatusExport,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<StatusExport, AppError> {
    queries::save_status(&pool, status).await
}

#[tauri::command]
pub async fn delete_status(id: ID, pool: State<'_, Pool<Sqlite>>) -> Result<(), AppError> {
    queries::delete_status(&pool, &id).await
}
