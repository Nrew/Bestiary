use crate::db::queries;
use crate::error::AppError;
use crate::models::{AbilityExport, ID};
use sqlx::{Pool, Sqlite};
use tauri::State;

#[tauri::command]
pub async fn search_abilities(
    query: String,
    limit: u32,
    offset: u32,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<Vec<AbilityExport>, AppError> {
    queries::search_abilities(&pool, &query, limit, offset).await
}

#[tauri::command]
pub async fn get_ability_search_count(
    query: String,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<i64, AppError> {
    queries::get_ability_search_count(&pool, &query).await
}

#[tauri::command]
pub async fn get_ability_details(
    id: ID,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<AbilityExport, AppError> {
    queries::get_ability_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn save_ability(
    ability: AbilityExport,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<AbilityExport, AppError> {
    queries::save_ability(&pool, ability).await
}

#[tauri::command]
pub async fn delete_ability(id: ID, pool: State<'_, Pool<Sqlite>>) -> Result<(), AppError> {
    queries::delete_ability(&pool, &id).await
}
