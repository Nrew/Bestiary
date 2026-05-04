use serde::Serialize;
use sqlx::migrate::MigrateError;
use thiserror::Error;
use ts_rs::TS;

#[derive(Debug, Error, Serialize, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(tag = "type", content = "content", rename_all = "camelCase")]
pub enum AppError {
    #[error("Database error: {message}")]
    Database { message: String },
    #[error("Resource not found: {entity_type} with id {id}")]
    NotFound {
        id: String,
        #[serde(rename = "entityType")]
        #[ts(rename = "entityType")]
        entity_type: String,
    },
    #[error("Validation failed: {errors:?}")]
    Validation { errors: Vec<String> },
    #[error("Slug conflict: The slug '{slug}' is already in use.")]
    SlugConflict { slug: String },
    #[error("Dependency conflict: {message}")]
    DependencyConflict { message: String },
    #[error("I/O error: {message}")]
    Io { message: String },
    #[error("Tauri operation failed: {message}")]
    Tauri { message: String },
}

/// Surfaces constraint-specific messages rather than raw SQLite errors.
impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        match error {
            sqlx::Error::RowNotFound => AppError::NotFound {
                id: "unknown".to_string(),
                entity_type: "Database Record".to_string(),
            },
            sqlx::Error::Database(db_err) => {
                let msg = db_err.message();
                // Verbose SQLite text can include schema details; keep it at debug only.
                log::debug!("Database constraint error: {}", msg);

                if msg.contains("UNIQUE constraint failed") {
                    // Extract the column name (e.g. "items.slug") without exposing the
                    // offending value. Only slug/short_tag columns carry UNIQUE constraints,
                    // so surfacing the column name is safe and more helpful to users.
                    let column = msg
                        .split("UNIQUE constraint failed:")
                        .nth(1)
                        .and_then(|s| s.split(',').next())
                        .map(str::trim)
                        .and_then(|c| c.rsplit('.').next())
                        .unwrap_or("");

                    let slug_message = match column {
                        "short_tag" => {
                            "This short tag is already in use. Please choose a different one."
                                .to_string()
                        }
                        "slug" => "This slug is already in use. Please choose a different one."
                            .to_string(),
                        _ => "A unique value is already in use. Please choose a different one."
                            .to_string(),
                    };

                    AppError::SlugConflict { slug: slug_message }
                } else if msg.contains("FOREIGN KEY constraint failed") {
                    AppError::DependencyConflict {
                        message: "Cannot delete this item because it is currently in use."
                            .to_string(),
                    }
                } else {
                    // Return a generic message to prevent database schema disclosure
                    AppError::Database {
                        message: "A database error occurred. Please try again.".to_string(),
                    }
                }
            }
            other => {
                log::debug!("Unexpected database error: {:?}", other);
                AppError::Database {
                    message: "A database error occurred. Please try again.".to_string(),
                }
            }
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        AppError::Io {
            message: error.to_string(),
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        log::error!("JSON serialization/deserialization error: {}", error);
        AppError::Validation {
            errors: vec!["Invalid JSON data. Please check the file and try again.".to_string()],
        }
    }
}

impl From<image::ImageError> for AppError {
    fn from(error: image::ImageError) -> Self {
        AppError::Io {
            message: format!("Image processing error: {}", error),
        }
    }
}

impl From<Vec<String>> for AppError {
    fn from(errors: Vec<String>) -> Self {
        AppError::Validation { errors }
    }
}

impl From<tauri::Error> for AppError {
    fn from(error: tauri::Error) -> Self {
        AppError::Tauri {
            message: error.to_string(),
        }
    }
}

impl From<MigrateError> for AppError {
    fn from(error: MigrateError) -> Self {
        log::error!("Database migration failed: {}", error);
        AppError::Database {
            message: "Bestiary could not update its local database. Your saved data was not changed. Please restart the app; if the problem persists, restore from your latest export or reinstall Bestiary.".to_string(),
        }
    }
}
