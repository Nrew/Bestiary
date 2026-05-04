use crate::db;
use crate::db::queries::{AbilityRepository, EntityRepository, ItemRepository, StatusRepository};
use crate::db::Repository;
use crate::error::AppError;
use crate::models::{
    AbilityExport, AbilityType, AoeShape, Attribute, DamageType, EntityExport, EntitySize,
    GameEnums, ItemExport, ItemType, Rarity, ResistanceLevel, StatusExport, ThreatLevel,
    Validatable,
};
use crate::util;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{Pool, Sqlite};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Instant;
use tauri::ipc::{InvokeBody, Request};
use tauri::{AppHandle, State};
use ts_rs::TS;
use uuid::Uuid;

const MAX_IMAGE_SIZE: usize = 50 * 1024 * 1024;
const MAX_IMAGE_DIMENSION: u32 = 16_384;
const MAX_IMAGE_PIXELS: u64 = 64_000_000;

/// Maximum allowed import payload size (250 MB).
///
/// Backups may include image bytes in JSON, which is intentionally larger than
/// the per-image limit because JSON array encoding adds overhead.
const MAX_IMPORT_SIZE: usize = 250 * 1024 * 1024;

const ALLOWED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp"];
const IMPORT_COOLDOWN_SECS: u64 = 5;
const CURRENT_BACKUP_SCHEMA_VERSION: u64 = 1;

/// App-state token used to enforce the import cooldown. Managed by Tauri.
pub struct ImportRateLimit(pub Mutex<Option<Instant>>);

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupImage {
    filename: String,
    bytes: Vec<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub file_name: String,
    pub display_path: String,
}

fn export_filename(exported_at: chrono::DateTime<chrono::Utc>) -> String {
    format!(
        "bestiary_export_{}_{}.json",
        exported_at.format("%Y%m%d_%H%M%S"),
        Uuid::new_v4()
    )
}

// --- Image path and validation ---

fn image_filename_from_ref(image_ref: &str) -> Result<&str, AppError> {
    let filename = Path::new(image_ref)
        .file_name()
        .and_then(|f| f.to_str())
        .filter(|f| !f.is_empty() && !f.starts_with('.') && !f.contains('\0'))
        .ok_or_else(|| AppError::Io {
            message: "Invalid image path provided.".to_string(),
        })?;

    let extension = Path::new(filename)
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .ok_or_else(|| AppError::Io {
            message: "Invalid image path provided.".to_string(),
        })?;

    if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
        return Err(AppError::Io {
            message: "Invalid image path provided.".to_string(),
        });
    }

    Ok(filename)
}

fn safe_image_ref_for_log(image_ref: &str) -> String {
    image_filename_from_ref(image_ref)
        .map(str::to_string)
        .unwrap_or_else(|_| "<invalid-image-ref>".to_string())
}

/// Resolves an image ref to a canonical path that is guaranteed to sit inside
/// `images_dir`. Returns `None` if the file does not exist.
///
/// `image_ref` is either a bare managed filename (`<uuid>.<ext>`) or a legacy
/// absolute path from before the managed-ref migration. Relative paths that
/// contain directory separators are rejected as path traversal attempts. The
/// resolved path is canonicalized and prefix-checked so symlinks and `..`
/// segments cannot escape the images directory.
fn resolve_stored_image_path(
    images_dir: &Path,
    image_ref: &str,
) -> Result<Option<PathBuf>, AppError> {
    let filename = image_filename_from_ref(image_ref)?;
    let raw_path = Path::new(image_ref);

    if !raw_path.is_absolute() && image_ref != filename {
        return Err(AppError::Io {
            message: "Invalid image path provided.".to_string(),
        });
    }

    let file_path = if raw_path.is_absolute() {
        raw_path.to_path_buf()
    } else {
        images_dir.join(filename)
    };

    if !file_path.exists() {
        return Ok(None);
    }

    let meta = fs::symlink_metadata(&file_path).map_err(|e| AppError::Io {
        message: format!("Failed to stat image file: {}", e),
    })?;
    if meta.file_type().is_symlink() || !meta.is_file() {
        return Err(AppError::Io {
            message: "Invalid image path provided.".to_string(),
        });
    }

    let canonical_images_dir = images_dir.canonicalize().map_err(|e| AppError::Io {
        message: format!("Failed to resolve images directory: {}", e),
    })?;
    let canonical_file = file_path.canonicalize().map_err(|e| AppError::Io {
        message: format!("Failed to resolve file path: {}", e),
    })?;

    if !canonical_file.starts_with(&canonical_images_dir) {
        return Err(AppError::Io {
            message: "Invalid image path provided.".to_string(),
        });
    }

    Ok(Some(canonical_file))
}

fn validate_image_bytes(file_bytes: &[u8]) -> Result<String, AppError> {
    if file_bytes.len() > MAX_IMAGE_SIZE {
        return Err(AppError::Validation {
            errors: vec![format!(
                "Image exceeds maximum size of {} MB",
                MAX_IMAGE_SIZE / (1024 * 1024)
            )],
        });
    }

    if file_bytes.is_empty() {
        return Err(AppError::Validation {
            errors: vec!["Image file is empty".to_string()],
        });
    }

    let format = image::guess_format(file_bytes).map_err(|_| AppError::Validation {
        errors: vec!["Uploaded file is not a valid image.".to_string()],
    })?;
    let extension = match format {
        image::ImageFormat::Jpeg => "jpg",
        image::ImageFormat::Png => "png",
        image::ImageFormat::Gif => "gif",
        image::ImageFormat::WebP => "webp",
        _ => {
            return Err(AppError::Validation {
                errors: vec![format!(
                    "File type not allowed. Allowed types: {}",
                    ALLOWED_EXTENSIONS.join(", ")
                )],
            })
        }
    };

    let image = image::load_from_memory_with_format(file_bytes, format).map_err(|_| {
        AppError::Validation {
            errors: vec!["Uploaded file is not a valid image.".to_string()],
        }
    })?;

    let width = image.width();
    let height = image.height();
    if width > MAX_IMAGE_DIMENSION
        || height > MAX_IMAGE_DIMENSION
        || u64::from(width) * u64::from(height) > MAX_IMAGE_PIXELS
    {
        return Err(AppError::Validation {
            errors: vec!["Image dimensions are too large.".to_string()],
        });
    }

    Ok(extension.to_string())
}

// --- Image IPC ---

#[tauri::command]
pub async fn store_image(app_handle: AppHandle, request: Request<'_>) -> Result<String, AppError> {
    log::debug!("Executing command: store_image for user-selected file.");

    let InvokeBody::Raw(file_bytes) = request.body() else {
        return Err(AppError::Validation {
            errors: vec!["Image upload must use a raw binary payload.".to_string()],
        });
    };
    let extension = validate_image_bytes(file_bytes)?;

    let images_dir = util::get_app_data_dir(&app_handle)?.join("images");
    fs::create_dir_all(&images_dir)?;
    let new_filename = format!("{}.{}", Uuid::new_v4(), extension);
    let file_path = images_dir.join(&new_filename);
    fs::write(&file_path, file_bytes)?;
    log::info!("Stored image: {}", util::redact_path(&file_path));
    // Return the bare managed filename (no path). The frontend persists this
    // managed ref; rendering goes through `resolve_image_url`.
    Ok(new_filename)
}

// --- Backup export ---

#[tauri::command]
pub async fn export_database(
    app_handle: AppHandle,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<ExportResult, AppError> {
    log::info!("Executing command: export_database");
    let entities = db::queries::get_all_entities_unpaginated(&pool).await?;
    let items = db::queries::get_all_items_unpaginated(&pool).await?;
    let statuses = db::queries::get_all_statuses(&pool).await?;
    let abilities = db::queries::get_all_abilities(&pool).await?;
    let images_dir = util::get_app_data_dir(&app_handle)?.join("images");

    let mut seen_image_filenames = HashSet::new();
    let mut images = Vec::new();
    for entity in &entities {
        for image_ref in &entity.images {
            let filename = match image_filename_from_ref(image_ref) {
                Ok(filename) => filename.to_string(),
                Err(e) => {
                    return Err(AppError::Io {
                        message: format!(
                            "Export aborted because an entry contains an invalid image reference: {}",
                            e
                        ),
                    });
                }
            };

            if !seen_image_filenames.insert(filename.clone()) {
                continue;
            }

            match resolve_stored_image_path(&images_dir, image_ref) {
                Ok(Some(path)) => {
                    let bytes = fs::read(&path).map_err(|e| AppError::Io {
                        message: format!(
                            "Failed to read image file '{}': {}",
                            util::redact_path(&path),
                            e
                        ),
                    })?;
                    images.push(BackupImage { filename, bytes });
                }
                Ok(None) => {
                    return Err(AppError::Io {
                        message: format!(
                            "Export aborted because referenced image '{}' is missing. Re-attach the image or run cleanup before exporting.",
                            filename
                        ),
                    });
                }
                Err(e) => {
                    return Err(AppError::Io {
                        message: format!(
                            "Export aborted because referenced image '{}' could not be validated: {}",
                            filename, e
                        ),
                    });
                }
            }
        }
    }

    let exported_at = chrono::Utc::now();
    let export_data = json!({
        "appVersion": env!("CARGO_PKG_VERSION"),
        "backupSchemaVersion": CURRENT_BACKUP_SCHEMA_VERSION,
        "exportedAt": exported_at.to_rfc3339(),
        "data": {
            "entities": entities,
            "items": items,
            "statuses": statuses,
            "abilities": abilities,
            "images": images,
        }
    });

    let json_str = serde_json::to_string_pretty(&export_data)?;

    let filename = export_filename(exported_at);
    let export_dir = util::get_app_data_dir(&app_handle)?.join("backups");
    fs::create_dir_all(&export_dir).map_err(|e| AppError::Io {
        message: format!("Failed to create backup directory: {}", e),
    })?;
    let export_path = export_dir.join(&filename);
    let tmp_path = export_dir.join(format!("{}.tmp", filename));

    fs::write(&tmp_path, &json_str).map_err(|e| AppError::Io {
        message: format!("Failed to write export file: {}", e),
    })?;
    fs::rename(&tmp_path, &export_path).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        AppError::Io {
            message: format!("Failed to finalize export file: {}", e),
        }
    })?;

    log::info!("Exported database to {}", util::redact_path(&export_path));
    Ok(ExportResult {
        file_name: filename,
        display_path: util::redact_path(&export_path),
    })
}

#[tauri::command]
pub async fn delete_image(
    app_handle: AppHandle,
    pool: State<'_, Pool<Sqlite>>,
    image_ref: String,
) -> Result<(), AppError> {
    // The value MUST be a managed bare filename. Anything containing a path
    // separator or absolute path is rejected by `image_filename_from_ref`.
    log::info!(
        "Executing command: delete_image for ref: {}",
        safe_image_ref_for_log(&image_ref)
    );

    let images_dir = util::get_app_data_dir(&app_handle)?.join("images");
    let filename = image_filename_from_ref(&image_ref)?;

    if image_ref != filename {
        log::warn!("delete_image rejected non-managed ref (contains path component)");
        return Err(AppError::Io {
            message: "Image references must be bare managed filenames.".to_string(),
        });
    }

    let ref_count = db::queries::count_image_references(&pool, &image_ref).await?;
    if ref_count > 1 {
        return Err(AppError::DependencyConflict {
            message: "This image is still used by another entry and cannot be deleted globally."
                .to_string(),
        });
    }

    // Remove the single remaining DB reference first. If file deletion fails
    // afterwards, cleanup_orphaned_images can safely sweep the orphaned file.
    db::queries::delete_entity_image_reference(&pool, &image_ref).await?;
    delete_image_file_on_disk(&images_dir, filename)?;

    log::info!("Deleted image: {}", safe_image_ref_for_log(&image_ref));
    Ok(())
}

/// Resolve a managed image filename to a safe asset URL the webview can
/// render directly. Validates the filename, ensures the file exists inside the
/// app-managed images directory, and rejects symlinks / traversal. Returns
/// only a URL, never the underlying absolute path, so the frontend cannot
/// write the URL back into persistence.
#[tauri::command]
pub async fn resolve_image_url(
    app_handle: AppHandle,
    filename: String,
) -> Result<String, AppError> {
    let images_dir = util::get_app_data_dir(&app_handle)?.join("images");
    let resolved =
        resolve_stored_image_path(&images_dir, &filename)?.ok_or_else(|| AppError::NotFound {
            entity_type: "Image".to_string(),
            id: filename.clone(),
        })?;

    Ok(build_asset_url(&resolved.to_string_lossy()))
}

/// Build a webview-renderable asset URL for an absolute filesystem path. The
/// produced URL must match Tauri 2's `@tauri-apps/api/core#convertFileSrc`
/// behaviour exactly; anything else either fails CSP, fails the asset
/// protocol scope match, or fails percent-decoding inside the webview.
///
/// On Windows the webview serves the asset protocol over
/// `http://asset.localhost/<encodeURIComponent(absolute-path)>` (note: HTTP,
/// not HTTPS; Tauri 2.x switched away from the HTTPS variant Tauri 1 used,
/// see `@tauri-apps/api/core` docstring for `convertFileSrc`). On other
/// platforms it serves over `asset://localhost/<encodeURIComponent(...)>`.
/// In both cases the entire absolute path (drive letter, separators, and all)
/// is passed through `encodeURIComponent`, so we cannot leave path separators
/// unescaped.
fn build_asset_url(absolute_path: &str) -> String {
    // `canonicalize()` on Windows returns `\\?\`-prefixed verbatim paths;
    // `convertFileSrc` on the frontend would never produce that prefix, and
    // it confuses the webview's asset-protocol scope matcher. Strip it so the
    // URL is shaped exactly like the frontend helper's output.
    let path = absolute_path.strip_prefix(r"\\?\").unwrap_or(absolute_path);
    let encoded = encode_uri_component(path);
    if cfg!(target_os = "windows") {
        format!("http://asset.localhost/{}", encoded)
    } else {
        format!("asset://localhost/{}", encoded)
    }
}

/// Mirror of JavaScript's `encodeURIComponent`: encodes every byte except
/// `A-Z a-z 0-9 - _ . ! ~ * ' ( )`. Used so the Rust-side URL builder produces
/// byte-identical output to `convertFileSrc` on the frontend.
fn encode_uri_component(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'-'
            | b'_'
            | b'.'
            | b'!'
            | b'~'
            | b'*'
            | b'\''
            | b'('
            | b')' => out.push(byte as char),
            _ => out.push_str(&format!("%{:02X}", byte)),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::{
        build_asset_url, encode_uri_component, export_filename, image_filename_from_ref,
        parse_required_collection_array, read_backup_schema_version,
    };
    use crate::error::AppError;
    use serde_json::json;

    #[test]
    fn parse_required_collection_array_rejects_missing_key() {
        let err = parse_required_collection_array::<serde_json::Value>(None, "statuses", "Status")
            .unwrap_err();
        match err {
            AppError::Validation { errors } => {
                assert!(errors[0].contains("data.statuses"));
            }
            _ => panic!("expected validation error"),
        }
    }

    #[test]
    fn parse_required_collection_array_accepts_empty_array() {
        let v = json!([]);
        let out: Vec<serde_json::Value> =
            parse_required_collection_array(Some(&v), "entities", "Entity").unwrap();
        assert!(out.is_empty());
    }

    #[test]
    fn image_filename_from_ref_accepts_supported_filenames() {
        assert_eq!(
            image_filename_from_ref("550e8400-e29b-41d4-a716-446655440000.webp").unwrap(),
            "550e8400-e29b-41d4-a716-446655440000.webp"
        );
    }

    #[test]
    fn image_filename_from_ref_rejects_unsupported_extensions() {
        assert!(image_filename_from_ref("payload.exe").is_err());
    }

    #[test]
    fn encode_uri_component_matches_js_semantics() {
        // Slashes, colons, and backslashes are escaped (encodeURIComponent does).
        assert_eq!(
            encode_uri_component("/Users/me/x.png"),
            "%2FUsers%2Fme%2Fx.png"
        );
        assert_eq!(
            encode_uri_component("C:\\Users\\me\\x.png"),
            "C%3A%5CUsers%5Cme%5Cx.png"
        );
        // Spaces and unicode get percent-encoded byte-by-byte.
        assert_eq!(encode_uri_component("a b"), "a%20b");
        // Allowed pass-through set.
        assert_eq!(
            encode_uri_component("ABCabc012-_.!~*'()"),
            "ABCabc012-_.!~*'()"
        );
    }

    #[test]
    fn build_asset_url_uses_correct_scheme_per_platform() {
        // The builder uses `cfg!(target_os = "windows")`, so the assertion here
        // pivots on the host running the test. We assert the full URL shape so
        // a future regression on either platform is caught.
        #[cfg(target_os = "windows")]
        {
            assert_eq!(
                build_asset_url("C:\\images\\a.webp"),
                "http://asset.localhost/C%3A%5Cimages%5Ca.webp"
            );
        }
        #[cfg(not(target_os = "windows"))]
        {
            assert_eq!(
                build_asset_url("/var/data/images/a.webp"),
                "asset://localhost/%2Fvar%2Fdata%2Fimages%2Fa.webp"
            );
        }
    }

    #[test]
    fn export_filename_is_unique_even_for_same_second() {
        let exported_at = chrono::DateTime::parse_from_rfc3339("2026-05-02T12:00:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc);

        let first = export_filename(exported_at);
        let second = export_filename(exported_at);

        assert_ne!(first, second);
        assert!(first.starts_with("bestiary_export_20260502_120000_"));
        assert!(first.ends_with(".json"));
    }

    #[test]
    fn backup_schema_version_requires_current_positive_integer() {
        let valid = json!({ "backupSchemaVersion": 1 });
        assert_eq!(read_backup_schema_version(&valid).unwrap(), 1);

        for invalid in [
            json!({}),
            json!({ "backupSchemaVersion": 0 }),
            json!({ "backupSchemaVersion": "1" }),
        ] {
            assert!(matches!(
                read_backup_schema_version(&invalid),
                Err(AppError::Validation { .. })
            ));
        }
    }

    #[test]
    fn backup_schema_version_rejects_future_backups() {
        let future = json!({ "backupSchemaVersion": 2 });

        let err = read_backup_schema_version(&future).unwrap_err();

        match err {
            AppError::Validation { errors } => {
                assert!(errors[0].contains("newer version"));
            }
            _ => panic!("expected validation error"),
        }
    }
}

#[tauri::command]
pub async fn cleanup_orphaned_images(
    app_handle: AppHandle,
    pool: State<'_, Pool<Sqlite>>,
) -> Result<u64, AppError> {
    log::info!("Executing command: cleanup_orphaned_images");
    let images_dir = util::get_app_data_dir(&app_handle)?.join("images");
    let db_images: Vec<(String,)> = sqlx::query_as("SELECT image_path FROM entity_images")
        .fetch_all(&*pool)
        .await?;

    let referenced_filenames: HashSet<String> = db_images
        .into_iter()
        .map(|(path,)| {
            Path::new(&path)
                .file_name()
                .map(|f| f.to_string_lossy().to_string())
                .unwrap_or(path)
        })
        .collect();

    let mut orphaned_count = 0u64;
    if images_dir.exists() {
        for entry in fs::read_dir(&images_dir)? {
            let entry = entry?;
            let file_path = entry.path();
            // Use symlink_metadata so we check the link itself, not its target
            let meta = match fs::symlink_metadata(&file_path) {
                Ok(m) => m,
                Err(_) => continue,
            };
            if meta.is_file() && !meta.file_type().is_symlink() {
                let filename = file_path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                if !referenced_filenames.contains(&filename) {
                    log::warn!(
                        "Found orphaned image, deleting: {}",
                        util::redact_path(&file_path)
                    );
                    fs::remove_file(&file_path)?;
                    orphaned_count += 1;
                }
            }
        }
    }
    log::info!(
        "Cleanup complete. Deleted {} orphaned images.",
        orphaned_count
    );
    Ok(orphaned_count)
}

/// Remove every file directly inside the given staging directory, then remove
/// the directory itself. Errors are logged but not propagated because this is
/// invoked on rollback paths where we already have a primary error to return.
fn cleanup_staging(staging_dir: &Path) {
    if !staging_dir.exists() {
        return;
    }
    match fs::read_dir(staging_dir) {
        Ok(entries) => {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Err(e) = fs::remove_file(&path) {
                    log::warn!(
                        "cleanup_staging: failed to remove staged file {}: {}",
                        util::redact_path(&path),
                        e
                    );
                }
            }
        }
        Err(e) => {
            log::warn!(
                "cleanup_staging: failed to list staging dir {}: {}",
                util::redact_path(staging_dir),
                e
            );
        }
    }
    if let Err(e) = fs::remove_dir(staging_dir) {
        log::warn!(
            "cleanup_staging: failed to remove staging dir {}: {}",
            util::redact_path(staging_dir),
            e
        );
    }
}

/// Deletes a managed image file from disk.
///
/// Delegates to `resolve_stored_image_path` for path validation, symlink
/// rejection, and `images_dir` containment checks. Missing files are
/// treated as success; any other I/O failure is returned as an error.
pub fn delete_image_file_on_disk(images_dir: &Path, image_ref: &str) -> Result<(), AppError> {
    let Some(canonical_file) = resolve_stored_image_path(images_dir, image_ref)? else {
        return Ok(());
    };
    fs::remove_file(&canonical_file).map_err(|e| AppError::Io {
        message: format!("Failed to delete image file: {}", e),
    })?;
    Ok(())
}

// --- Backup import ---

/// Check `records` (slug-or-tag, id, name) for two classes of conflict:
///
/// 1. Duplicates *within* the import file (two records sharing the same slug).
/// 2. Conflicts with *existing DB records*: a different row already owns
///    that slug, so the transaction would hit a UNIQUE constraint mid-write.
///
/// `table` and `slug_col` are always compile-time string literals (never user
/// input), so string-formatting them into the SQL is safe.
async fn check_slug_conflicts(
    pool: &Pool<Sqlite>,
    records: Vec<(&str, &str, &str)>, // (slug_or_tag, id, name)
    table: &str,
    slug_col: &str,
) -> Result<(), AppError> {
    if records.is_empty() {
        return Ok(());
    }

    // 1. Intra-file duplicate check.
    {
        let mut seen = std::collections::HashSet::new();
        let mut errors = Vec::new();
        for (slug, _, name) in &records {
            if !seen.insert(*slug) {
                errors.push(format!(
                    "Duplicate {} '{}' in import file (record: '{}').",
                    slug_col, slug, name
                ));
            }
        }
        if !errors.is_empty() {
            return Err(AppError::Validation { errors });
        }
    }

    // 2. DB conflict check: existing rows whose slug matches but whose id differs.
    let slugs: Vec<&str> = records.iter().map(|(s, _, _)| *s).collect();
    let ids: Vec<&str> = records.iter().map(|(_, id, _)| *id).collect();
    let slug_ph: String = slugs.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
    let id_ph: String = ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");

    let sql = format!(
        "SELECT {slug_col}, name FROM {table} \
         WHERE {slug_col} IN ({slug_ph}) AND id NOT IN ({id_ph})"
    );

    let mut q = sqlx::query(&sql);
    for s in &slugs {
        q = q.bind(s);
    }
    for id in &ids {
        q = q.bind(id);
    }

    let rows = q.fetch_all(pool).await?;
    if !rows.is_empty() {
        use sqlx::Row;
        let errors: Vec<String> = rows
            .iter()
            .map(|row| {
                let slug: String = row.try_get(0).unwrap_or_default();
                let name: String = row.try_get(1).unwrap_or_default();
                format!(
                    "Slug '{}' is already owned by '{}' in the database. \
                     Rename this record in the import before importing.",
                    slug, name
                )
            })
            .collect();
        return Err(AppError::Validation { errors });
    }

    Ok(())
}

fn read_backup_schema_version(root: &serde_json::Value) -> Result<u64, AppError> {
    let Some(value) = root.get("backupSchemaVersion") else {
        return Err(AppError::Validation {
            errors: vec![
                "Backup is missing backupSchemaVersion. Export a fresh backup from Bestiary 1.0."
                    .to_string(),
            ],
        });
    };

    let Some(schema_version) = value.as_u64() else {
        return Err(AppError::Validation {
            errors: vec!["backupSchemaVersion must be a positive integer.".to_string()],
        });
    };

    if schema_version == 0 {
        return Err(AppError::Validation {
            errors: vec!["backupSchemaVersion must be a positive integer.".to_string()],
        });
    }

    if schema_version > CURRENT_BACKUP_SCHEMA_VERSION {
        return Err(AppError::Validation {
            errors: vec![format!(
                "This backup was created by a newer version of Bestiary (schema v{}). \
                 Please update the app before importing.",
                schema_version
            )],
        });
    }

    Ok(schema_version)
}

#[tauri::command]
pub async fn import_database(
    app_handle: AppHandle,
    pool: State<'_, Pool<Sqlite>>,
    rate_limit: State<'_, ImportRateLimit>,
    json_str: String,
) -> Result<ImportResult, AppError> {
    log::info!(
        "Executing command: import_database ({} bytes)",
        json_str.len()
    );

    {
        let mut guard = rate_limit.0.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(last) = *guard {
            if last.elapsed() < std::time::Duration::from_secs(IMPORT_COOLDOWN_SECS) {
                return Err(AppError::Validation {
                    errors: vec![format!(
                        "Please wait {} seconds between imports.",
                        IMPORT_COOLDOWN_SECS
                    )],
                });
            }
        }
        *guard = Some(Instant::now());
    }

    if json_str.len() > MAX_IMPORT_SIZE {
        return Err(AppError::Validation {
            errors: vec![format!(
                "Import file is too large (max {} MB)",
                MAX_IMPORT_SIZE / (1024 * 1024)
            )],
        });
    }

    let root: serde_json::Value =
        serde_json::from_str(&json_str).map_err(|e| AppError::Validation {
            errors: vec![format!("Invalid JSON: {}", e)],
        })?;

    read_backup_schema_version(&root)?;

    let data = root.get("data").ok_or_else(|| AppError::Validation {
        errors: vec![
            "JSON is missing a 'data' field. Is this a valid bestiary export?".to_string(),
        ],
    })?;

    // Phase 1: parse and validate everything before touching the filesystem or database.
    // A single malformed record aborts the entire import; partial writes are not allowed.
    let parsed_statuses: Vec<StatusExport> =
        parse_required_collection_array(data.get("statuses"), "statuses", "Status")?;
    let parsed_items: Vec<ItemExport> =
        parse_required_collection_array(data.get("items"), "items", "Item")?;
    let parsed_abilities: Vec<AbilityExport> =
        parse_required_collection_array(data.get("abilities"), "abilities", "Ability")?;
    let parsed_entities: Vec<EntityExport> =
        parse_required_collection_array(data.get("entities"), "entities", "Entity")?;

    // Images are parsed separately because we also validate bytes before
    // touching disk.
    let parsed_images: Vec<BackupImage> =
        parse_required_collection_array(data.get("images"), "images", "Image")?;
    for image in &parsed_images {
        let filename = image_filename_from_ref(&image.filename)?.to_string();
        if filename != image.filename {
            return Err(AppError::Validation {
                errors: vec!["Backup image filenames must not include paths.".to_string()],
            });
        }
        validate_image_bytes(&image.bytes).map_err(|_| AppError::Validation {
            errors: vec![format!("Backup image '{}' is not a valid image.", filename)],
        })?;
    }

    // Validate every parsed record before we begin so we cannot half-import.
    for s in &parsed_statuses {
        s.validate()?;
    }
    for i in &parsed_items {
        i.validate()?;
    }
    for a in &parsed_abilities {
        a.validate()?;
    }
    for e in &parsed_entities {
        e.validate()?;
    }

    // Reject duplicate IDs within each entity type in the import file.
    // The DB uses ON CONFLICT DO UPDATE which would silently overwrite records;
    // detecting duplicates here surfaces the problem before any writes occur.
    {
        use std::collections::HashSet;
        let check = |ids: Vec<&String>, label: &str| -> Result<(), AppError> {
            let mut seen = HashSet::new();
            for id in ids {
                if !seen.insert(id.as_str()) {
                    return Err(AppError::Validation {
                        errors: vec![format!(
                            "Duplicate {} ID in import file: '{}'. Each record must have a unique ID.",
                            label, id
                        )],
                    });
                }
            }
            Ok(())
        };
        check(parsed_statuses.iter().map(|r| &r.id).collect(), "status")?;
        check(parsed_items.iter().map(|r| &r.id).collect(), "item")?;
        check(parsed_abilities.iter().map(|r| &r.id).collect(), "ability")?;
        check(parsed_entities.iter().map(|r| &r.id).collect(), "entity")?;
    }

    // Pre-detect slug/short_tag conflicts (both within the import file and
    // against existing DB records) so a UNIQUE constraint failure surfaces a
    // named offender instead of a cryptic DB error.
    tokio::try_join!(
        check_slug_conflicts(
            &pool,
            parsed_statuses
                .iter()
                .map(|r| (r.short_tag.as_str(), r.id.as_str(), r.name.as_str()))
                .collect(),
            "statuses",
            "short_tag",
        ),
        check_slug_conflicts(
            &pool,
            parsed_items
                .iter()
                .map(|r| (r.slug.as_str(), r.id.as_str(), r.name.as_str()))
                .collect(),
            "items",
            "slug",
        ),
        check_slug_conflicts(
            &pool,
            parsed_abilities
                .iter()
                .map(|r| (r.slug.as_str(), r.id.as_str(), r.name.as_str()))
                .collect(),
            "abilities",
            "slug",
        ),
        check_slug_conflicts(
            &pool,
            parsed_entities
                .iter()
                .map(|r| (r.slug.as_str(), r.id.as_str(), r.name.as_str()))
                .collect(),
            "entities",
            "slug",
        ),
    )?;

    // Phase 2: stage images in a temp subdirectory of `images_dir`.
    // Staged files are invisible to the app until promoted in Phase 3 because the app resolves
    // image refs as flat filenames in `images_dir`, not in subdirectories.
    // Any failure from here through commit triggers `cleanup_staging`.
    let images_dir = util::get_app_data_dir(&app_handle)?.join("images");
    fs::create_dir_all(&images_dir).map_err(|e| AppError::Io {
        message: format!("Failed to create images directory: {}", e),
    })?;

    let staging_dir = images_dir.join(format!("{}{}", util::IMPORT_STAGING_PREFIX, Uuid::new_v4()));
    fs::create_dir_all(&staging_dir).map_err(|e| AppError::Io {
        message: format!("Failed to create image staging directory: {}", e),
    })?;
    let staging_meta = fs::symlink_metadata(&staging_dir).map_err(|e| AppError::Io {
        message: format!("Failed to inspect image staging directory: {}", e),
    })?;
    if staging_meta.file_type().is_symlink() || !staging_meta.is_dir() {
        return Err(AppError::Io {
            message: "Invalid image staging directory.".to_string(),
        });
    }

    // Map: original-backup-filename -> (staged_path, final_path, managed_filename)
    // The DB stores the managed filename only. `staged_path` and `final_path`
    // are used during phase 4 promotion to move the bytes into images_dir.
    let mut staged: HashMap<String, (PathBuf, PathBuf, String)> = HashMap::new();

    for image in parsed_images {
        let extension = Path::new(&image.filename)
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("png");
        let restored_filename = format!("{}.{}", Uuid::new_v4(), extension);
        let staged_path = staging_dir.join(&restored_filename);
        let final_path = images_dir.join(&restored_filename);

        if let Err(e) = fs::write(&staged_path, &image.bytes) {
            cleanup_staging(&staging_dir);
            return Err(AppError::Io {
                message: format!("Failed to stage image '{}': {}", image.filename, e),
            });
        }

        // Map: backup-filename -> (staged_path_for_promotion, managed_filename_for_db).
        // The DB stores the managed filename only, never the absolute path.
        staged.insert(image.filename, (staged_path, final_path, restored_filename));
    }

    // Re-map entity image refs to managed filenames so the saved DB rows point
    // at the new managed filenames once the staged files are promoted.
    let mut rewritten_entities: Vec<EntityExport> = Vec::with_capacity(parsed_entities.len());
    for mut export in parsed_entities {
        let mut rewritten_images = Vec::with_capacity(export.images.len());
        for image_ref in export.images {
            let filename = image_filename_from_ref(&image_ref)?;
            let Some((_, _, managed)) = staged.get(filename) else {
                cleanup_staging(&staging_dir);
                return Err(AppError::Validation {
                    errors: vec![format!(
                        "Import file references image '{}' but does not include its bytes.",
                        filename
                    )],
                });
            };
            rewritten_images.push(managed.clone());
        }
        export.images = rewritten_images;
        rewritten_entities.push(export);
    }

    // Phase 3: run all DB writes and image promotions inside a single transaction.
    // SQLx rolls back implicitly when `tx` is dropped without `.commit()`, so any Err returned
    // before the final commit undoes all writes. Images are promoted before commit so a failed
    // rename/copy can still abort the transaction; no DB rows will reference missing files.
    let mut result = ImportResult::default();

    let commit_outcome: Result<Vec<PathBuf>, AppError> = async {
        let mut tx = pool.begin().await?;

        // Ordering: statuses -> items -> abilities -> entities
        // Entities reference statuses (status_immunities) and items (inventory)
        // and abilities (ability_ids); those must exist in the same tx first.
        for status in &parsed_statuses {
            StatusRepository::prepare_for_save(&mut tx, status).await?;
            result.statuses_imported += 1;
        }
        for item in &parsed_items {
            ItemRepository::prepare_for_save(&mut tx, item).await?;
            result.items_imported += 1;
        }
        for ability in &parsed_abilities {
            AbilityRepository::prepare_for_save(&mut tx, ability).await?;
            result.abilities_imported += 1;
        }
        for entity in &rewritten_entities {
            EntityRepository::prepare_for_save(&mut tx, entity).await?;
            result.entities_imported += 1;
        }

        let mut promoted_paths = Vec::new();
        for (original_filename, (staged_path, final_path, _managed)) in &staged {
            if let Err(rename_err) = fs::rename(staged_path, final_path) {
                match fs::copy(staged_path, final_path) {
                    Ok(_) => {
                        let _ = fs::remove_file(staged_path);
                    }
                    Err(copy_err) => {
                        for promoted_path in &promoted_paths {
                            let _ = fs::remove_file(promoted_path);
                        }
                        return Err(AppError::Io {
                            message: format!(
                                "Import aborted because image '{}' could not be saved to disk: rename={}, copy={}",
                                original_filename, rename_err, copy_err
                            ),
                        });
                    }
                }
            }
            promoted_paths.push(final_path.clone());
        }

        if let Err(e) = tx.commit().await {
            for promoted_path in &promoted_paths {
                let _ = fs::remove_file(promoted_path);
            }
            return Err(e.into());
        }

        Ok(promoted_paths)
    }
    .await;

    let promoted_paths = match commit_outcome {
        Ok(paths) => paths,
        Err(e) => {
            // Any DB write failure -> reset counters so the caller does not see
            // misleading partial-success numbers; rollback happens via tx drop.
            result.entities_imported = 0;
            result.items_imported = 0;
            result.statuses_imported = 0;
            result.abilities_imported = 0;
            result.errors.push(format!("Import aborted: {}", e));

            cleanup_staging(&staging_dir);
            return Err(e);
        }
    };

    // Remove the now-empty staging dir (best effort).
    let _ = fs::remove_dir(&staging_dir);

    log::info!(
        "Import complete: {} entities, {} items, {} statuses, {} abilities ({} errors)",
        result.entities_imported,
        result.items_imported,
        result.statuses_imported,
        result.abilities_imported,
        result.errors.len()
    );
    log::info!("Promoted {} imported image(s).", promoted_paths.len());
    Ok(result)
}

/// Parse a required `data.<key>` JSON array into a `Vec<T>`, failing if the key
/// is missing or the value is not an array. Empty collections must be sent as
/// `[]` so partial/foreign JSON cannot silently wipe a table on import.
fn parse_required_collection_array<T: for<'de> serde::Deserialize<'de>>(
    value: Option<&serde_json::Value>,
    data_key: &str,
    record_label: &str,
) -> Result<Vec<T>, AppError> {
    let Some(raw) = value else {
        return Err(AppError::Validation {
            errors: vec![format!(
                "Backup is missing required field 'data.{}'. Each export must include this key as a JSON array (use [] for an empty collection).",
                data_key
            )],
        });
    };
    let arr = raw.as_array().ok_or_else(|| AppError::Validation {
        errors: vec![format!("'data.{}' must be a JSON array.", data_key)],
    })?;
    let mut out = Vec::with_capacity(arr.len());
    for (idx, item) in arr.iter().enumerate() {
        let parsed: T = serde_json::from_value(item.clone()).map_err(|e| AppError::Validation {
            errors: vec![format!(
                "{} parse error at index {}: {}",
                record_label, idx, e
            )],
        })?;
        out.push(parsed);
    }
    Ok(out)
}

#[derive(Debug, Default, serde::Serialize, TS)]
#[ts(export_to = "../../src/types/generated.ts")]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub entities_imported: u32,
    pub items_imported: u32,
    pub statuses_imported: u32,
    pub abilities_imported: u32,
    pub errors: Vec<String>,
}

#[tauri::command]
pub async fn get_game_enums() -> Result<GameEnums, AppError> {
    log::info!("Executing command: get_game_enums");

    Ok(build_game_enums())
}

/// Returns game enums after verifying the database pool is available.
///
/// The `_pool` parameter is not used directly; Tauri's State resolver rejects
/// the invocation if the pool was never managed, which signals a startup
/// failure. The frontend calls this command as its startup liveness check.
#[tauri::command]
pub async fn get_app_ready(_pool: State<'_, Pool<Sqlite>>) -> Result<GameEnums, AppError> {
    log::info!("Executing command: get_app_ready");

    Ok(build_game_enums())
}

fn build_game_enums() -> GameEnums {
    GameEnums {
        item_types: vec![
            ItemType::Weapon,
            ItemType::Armor,
            ItemType::Consumable,
            ItemType::Trinket,
            ItemType::Material,
            ItemType::Organic,
            ItemType::Tool,
        ],
        rarities: vec![
            Rarity::Common,
            Rarity::Uncommon,
            Rarity::Rare,
            Rarity::VeryRare,
            Rarity::Legendary,
            Rarity::Mythic,
            Rarity::Unique,
        ],
        ability_types: vec![
            AbilityType::Action,
            AbilityType::BonusAction,
            AbilityType::Reaction,
            AbilityType::Passive,
            AbilityType::Legendary,
            AbilityType::Lair,
            AbilityType::Mythic,
        ],
        aoe_shapes: vec![
            AoeShape::Sphere,
            AoeShape::Cube,
            AoeShape::Cone,
            AoeShape::Line,
            AoeShape::Cylinder,
        ],
        damage_types: vec![
            DamageType::Acid,
            DamageType::Bludgeoning,
            DamageType::Cold,
            DamageType::Fire,
            DamageType::Force,
            DamageType::Lightning,
            DamageType::Necrotic,
            DamageType::Piercing,
            DamageType::Poison,
            DamageType::Psychic,
            DamageType::Radiant,
            DamageType::Slashing,
            DamageType::Thunder,
        ],
        entity_sizes: vec![
            EntitySize::Tiny,
            EntitySize::Small,
            EntitySize::Medium,
            EntitySize::Large,
            EntitySize::Huge,
            EntitySize::Gargantuan,
        ],
        threat_levels: vec![
            ThreatLevel::Trivial,
            ThreatLevel::Easy,
            ThreatLevel::Medium,
            ThreatLevel::Hard,
            ThreatLevel::Deadly,
            ThreatLevel::Legendary,
        ],
        attributes: vec![
            Attribute::Strength,
            Attribute::Dexterity,
            Attribute::Constitution,
            Attribute::Intelligence,
            Attribute::Wisdom,
            Attribute::Charisma,
        ],
        resistance_levels: vec![
            ResistanceLevel::Vulnerable,
            ResistanceLevel::Resistant,
            ResistanceLevel::Immune,
        ],
    }
}
