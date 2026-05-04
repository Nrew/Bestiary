#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod db;
mod error;
mod models;
mod util;

use tauri::{Emitter, Manager, WebviewWindow};

fn main() {
    // Configure logging to reduce TAO event loop warnings
    env_logger::Builder::from_env(
        env_logger::Env::default()
            .default_filter_or("warn,bestiary=info")
            .default_write_style_or("auto"),
    )
    .filter_module(
        "tao::platform_impl::platform::event_loop::runner",
        log::LevelFilter::Error,
    )
    .init();

    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            let main_window: WebviewWindow = app.get_webview_window("main")
                .ok_or_else(|| tauri::Error::WindowNotFound)?;

            // Window starts hidden via tauri.conf.json; shown after backend init succeeds.
            log::info!("Starting backend initialization...");

            if let Err(e) = util::initialize_app_directories(&handle) {
                let message = "Bestiary could not prepare its local data folders. Please restart the app; if the problem persists, check that the app can write to its data directory.".to_string();
                log::error!("Fatal: Failed to initialize app directories: {}", e);
                let _ = handle.emit("backend-error", message);
                let _ = main_window.show();
                let _ = main_window.set_focus();
                return Ok(());
            }

            let pool = match tauri::async_runtime::block_on(
                db::connection::create_connection_pool(&handle)
            ) {
                Ok(p) => p,
                Err(e) => {
                    let message = "Bestiary could not open its local database. Please restart the app; if the problem persists, restore from your latest export or reinstall Bestiary.".to_string();
                    log::error!("Fatal: Failed to create database connection pool: {}", e);
                    let _ = handle.emit("backend-error", message);
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                    return Ok(());
                }
            };

            if let Err(e) = tauri::async_runtime::block_on(
                db::connection::initialize_database(&pool)
            ) {
                let message = "Bestiary could not update its local database. Your saved data was not changed. Please restart the app; if the problem persists, restore from your latest export or reinstall Bestiary.".to_string();
                log::error!("Fatal: Failed to initialize database with migrations: {}", e);
                let _ = handle.emit("backend-error", message);
                let _ = main_window.show();
                let _ = main_window.set_focus();
                return Ok(());
            }

            if let Err(e) = tauri::async_runtime::block_on(
                db::seeding::seed_database_if_needed(&pool)
            ) {
                let message =
                    "Bestiary could not load its bundled starting data. Your saved data was not changed. \
                     This usually means the app package is incomplete or outdated. Please update or reinstall Bestiary; \
                     if you rely on backups, keep your latest export available before retrying."
                        .to_string();
                log::error!("Fatal: Failed to seed bundled starting data: {}", e);
                let _ = handle.emit("backend-error", message);
                let _ = main_window.show();
                let _ = main_window.set_focus();
                return Ok(());
            }

            handle.manage(commands::utility_commands::ImportRateLimit(
                std::sync::Mutex::new(None),
            ));
            handle.manage(pool);
            log::info!("Backend initialization complete. Database is ready.");

            if let Err(e) = main_window.show() {
                log::error!("Failed to show main window: {}", e);
            }
            if let Err(e) = main_window.set_focus() {
                log::error!("Failed to focus main window: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // --- Entity Commands ---
            commands::entity_commands::search_entities,
            commands::entity_commands::get_entity_search_count,
            commands::entity_commands::get_entity_details,
            commands::entity_commands::save_entity,
            commands::entity_commands::delete_entity,

            // --- Item Commands ---
            commands::item_commands::search_items,
            commands::item_commands::get_item_search_count,
            commands::item_commands::get_item_details,
            commands::item_commands::save_item,
            commands::item_commands::delete_item,

            // --- Status Commands ---
            commands::status_commands::search_statuses,
            commands::status_commands::get_status_search_count,
            commands::status_commands::get_status_details,
            commands::status_commands::save_status,
            commands::status_commands::delete_status,

            // --- Ability Commands ---
            commands::ability_commands::search_abilities,
            commands::ability_commands::get_ability_search_count,
            commands::ability_commands::get_ability_details,
            commands::ability_commands::save_ability,
            commands::ability_commands::delete_ability,

            // --- Utility Commands ---
            commands::utility_commands::store_image,
            commands::utility_commands::resolve_image_url,
            commands::utility_commands::export_database,
            commands::utility_commands::import_database,
            commands::utility_commands::delete_image,
            commands::utility_commands::cleanup_orphaned_images,
            commands::utility_commands::get_game_enums,
            commands::utility_commands::get_app_ready,
        ])
        .build(tauri::generate_context!())
        .unwrap_or_else(|error| {
            eprintln!("Fatal: Failed to build Tauri application: {error}");
            std::process::exit(1);
        })
        .run(|app_handle, event| {
            // On clean exit, checkpoint the SQLite WAL so the WAL file doesn't
            // accumulate across sessions. This is best-effort: if we're killed with
            // SIGKILL/Ctrl+C the WAL will still be valid; SQLite recovers it on next
            // open, but an explicit TRUNCATE checkpoint keeps the DB file compact.
            if let tauri::RunEvent::Exit = event {
                if let Some(pool) =
                    app_handle.try_state::<sqlx::Pool<sqlx::Sqlite>>()
                {
                    tauri::async_runtime::block_on(async {
                        if let Err(e) = sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
                            .execute(&*pool)
                            .await
                        {
                            log::warn!("WAL checkpoint on exit failed (non-fatal): {}", e);
                        } else {
                            log::info!("WAL checkpoint complete.");
                        }
                    });
                }
            }
        });
}
