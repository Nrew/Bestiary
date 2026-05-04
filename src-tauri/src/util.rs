use crate::error::AppError;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub const IMPORT_STAGING_PREFIX: &str = ".import_staging_";

pub fn get_app_data_dir(app_handle: &AppHandle) -> Result<PathBuf, AppError> {
    if let Some(path) = native_e2e_app_data_dir() {
        return Ok(path);
    }

    app_handle.path().app_data_dir().map_err(|e| e.into())
}

fn native_e2e_app_data_dir() -> Option<PathBuf> {
    native_e2e_app_data_dir_from(std::env::var_os("E2E_NATIVE_APP_DATA_DIR"))
}

fn native_e2e_app_data_dir_from(root: Option<impl AsRef<std::ffi::OsStr>>) -> Option<PathBuf> {
    root.map(|root| PathBuf::from(root.as_ref()))
        .map(|root| root.join("bestiary"))
}

pub fn initialize_app_directories(app_handle: &AppHandle) -> Result<(), AppError> {
    let app_data_dir = get_app_data_dir(app_handle)?;
    log::info!(
        "Ensuring application directories exist at: {}",
        redact_path(&app_data_dir)
    );

    let dirs_to_create = ["images", "backups"];
    for dir in dirs_to_create {
        let path = app_data_dir.join(dir);
        if !path.exists() {
            fs::create_dir_all(&path).map_err(|e| AppError::Io {
                message: format!("Failed to create directory '{}': {}", redact_path(&path), e),
            })?;
            log::info!("Created directory: {}", redact_path(&path));
        }
    }

    let images_dir = app_data_dir.join("images");
    cleanup_orphaned_import_staging_dirs(&images_dir);

    Ok(())
}

/// Removes leftover import staging directories from previous crashed imports.
///
/// Best-effort: failures are logged but do not block app launch. Only direct
/// children of `images_dir` whose names start with `IMPORT_STAGING_PREFIX`
/// and whose metadata identifies them as real directories are removed.
pub fn cleanup_orphaned_import_staging_dirs(images_dir: &Path) {
    let entries = match fs::read_dir(images_dir) {
        Ok(entries) => entries,
        Err(e) => {
            log::warn!(
                "Could not inspect image directory for orphaned import staging cleanup: {}",
                e
            );
            return;
        }
    };

    for entry in entries.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if !name_str.starts_with(IMPORT_STAGING_PREFIX) {
            continue;
        }

        let path = entry.path();
        let meta = match fs::symlink_metadata(&path) {
            Ok(meta) => meta,
            Err(e) => {
                log::warn!(
                    "Could not inspect orphaned import staging path {}: {}",
                    redact_path(&path),
                    e
                );
                continue;
            }
        };

        if meta.file_type().is_symlink() || !meta.is_dir() {
            log::warn!(
                "Skipping suspicious import staging cleanup candidate: {}",
                redact_path(&path)
            );
            continue;
        }

        match fs::remove_dir_all(&path) {
            Ok(()) => log::info!("Removed orphaned import staging directory: {}", name_str),
            Err(e) => log::warn!(
                "Failed to remove orphaned import staging directory {}: {}",
                redact_path(&path),
                e
            ),
        }
    }
}

/// Redact a filesystem path for logging and user-facing error messages.
///
/// Replaces the user's home directory prefix with `~`. Returns `path.display()`
/// unchanged when the home directory cannot be determined or the path does not
/// start with the home prefix.
///
/// Use on every log/error site that would otherwise call `path.display()`.
pub fn redact_path(path: &Path) -> String {
    redact_path_with_home(path, home_dir().as_deref())
}

fn redact_path_with_home(path: &Path, home: Option<&Path>) -> String {
    let display = path.display().to_string();

    if let Some(home) = home {
        let home_str = home.display().to_string();
        if !home_str.is_empty() && display.starts_with(&home_str) {
            // util.rs avoids depending on AppHandle, so we only strip the home
            // prefix rather than matching the full bundle identifier path.
            let suffix = &display[home_str.len()..];
            return format!("~{}", suffix);
        }
    }

    display
}

/// Resolve the user's home directory from `HOME` (Unix) or `USERPROFILE`
/// (Windows). Returns `None` if neither environment variable is set, which is
/// uncommon on real systems but possible inside sandboxes / CI runners.
fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

#[cfg(test)]
mod tests {
    use super::{
        cleanup_orphaned_import_staging_dirs, native_e2e_app_data_dir_from, redact_path_with_home,
        IMPORT_STAGING_PREFIX,
    };
    use std::fs;
    use std::path::{Path, PathBuf};
    use uuid::Uuid;

    fn temp_test_dir(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!("bestiary-{}-{}", label, Uuid::new_v4()))
    }

    #[test]
    fn app_data_dir_uses_native_e2e_override() {
        let root = std::env::temp_dir().join("bestiary-native-e2e-override");

        assert_eq!(
            native_e2e_app_data_dir_from(Some(root.as_os_str())).unwrap(),
            root.join("bestiary")
        );
    }

    #[test]
    fn redacts_home_directory_prefix() {
        let home = Path::new("/home/alice");
        let p = PathBuf::from("/home/alice/data/file.db");
        assert_eq!(redact_path_with_home(&p, Some(home)), "~/data/file.db");
    }

    #[test]
    fn passes_through_unrelated_paths() {
        let home = Path::new("/home/alice");
        let p = PathBuf::from("/var/lib/app/data");
        assert_eq!(redact_path_with_home(&p, Some(home)), "/var/lib/app/data");
    }

    #[test]
    fn removes_only_orphaned_import_staging_directories() {
        let images_dir = temp_test_dir("staging-cleanup");
        let staging_dir = images_dir.join(format!("{}{}", IMPORT_STAGING_PREFIX, Uuid::new_v4()));
        let unrelated_dir = images_dir.join("portraits");
        let staging_named_file = images_dir.join(format!("{}file", IMPORT_STAGING_PREFIX));

        fs::create_dir_all(&staging_dir).unwrap();
        fs::create_dir_all(&unrelated_dir).unwrap();
        fs::write(&staging_named_file, b"not a directory").unwrap();

        cleanup_orphaned_import_staging_dirs(&images_dir);

        assert!(!staging_dir.exists());
        assert!(unrelated_dir.exists());
        assert!(staging_named_file.exists());

        fs::remove_dir_all(&images_dir).unwrap();
    }
}
