use crate::error::AppError;
use crate::util::{get_app_data_dir, redact_path};
use sqlx::{migrate::Migrator, sqlite::SqliteConnectOptions, Pool, Sqlite};
use std::fs;
use std::str::FromStr;
use tauri::AppHandle;

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

mod config {
    use std::time::Duration;

    /// Maximum time to wait for a database lock (prevents indefinite hangs)
    pub const BUSY_TIMEOUT: Duration = Duration::from_secs(30);
    pub const MAX_CONNECTIONS: u32 = 5;
    pub const IDLE_TIMEOUT: Duration = Duration::from_secs(300);
    pub const MAX_LIFETIME: Duration = Duration::from_secs(1800);
}

pub async fn create_connection_pool(app_handle: &AppHandle) -> Result<Pool<Sqlite>, AppError> {
    let app_data_dir = get_app_data_dir(app_handle)?;
    let db_path = app_data_dir.join("bestiary.sqlite");

    if let Some(parent_dir) = db_path.parent() {
        if !parent_dir.exists() {
            log::info!(
                "Creating application data directory at: {}",
                redact_path(parent_dir)
            );
            fs::create_dir_all(parent_dir).map_err(|e| AppError::Io {
                message: format!(
                    "Failed to create database directory '{}': {}",
                    redact_path(parent_dir),
                    e
                ),
            })?;
        }
    }

    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
    // Note: db_url is not logged because it contains the absolute path.
    log::info!("Opening SQLite database at {}", redact_path(&db_path));

    let options = SqliteConnectOptions::from_str(&db_url)?
        .foreign_keys(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
        .busy_timeout(config::BUSY_TIMEOUT);

    let pool = sqlx::pool::PoolOptions::new()
        .max_connections(config::MAX_CONNECTIONS)
        .idle_timeout(Some(config::IDLE_TIMEOUT))
        .max_lifetime(Some(config::MAX_LIFETIME))
        .connect_with(options)
        .await?;

    log::info!(
        "Database connection pool created successfully. Max connections: {}, Busy timeout: {:?}",
        config::MAX_CONNECTIONS,
        config::BUSY_TIMEOUT
    );
    Ok(pool)
}

pub async fn initialize_database(pool: &Pool<Sqlite>) -> Result<(), AppError> {
    log::info!("Running database migrations...");
    MIGRATOR.run(pool).await?;
    log::info!("Database migrations completed successfully.");
    Ok(())
}
