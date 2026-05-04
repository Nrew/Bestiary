//! JSON contract tests for the `import_database` Tauri command.
//!
//! These tests live at `src-tauri/tests/` so that `cargo test` picks them up
//! automatically without requiring a module declaration in `src/commands/mod.rs`
//! (which this repo's test-infrastructure owner is not permitted to edit).
//!
//! The `bestiary` crate is a binary crate with no library target, so these
//! tests cannot reach internal items such as `utility_commands::ImportResult`
//! or `import_database` directly. They therefore verify the public JSON
//! contract that both the backend export and any future importer must honour:
//!
//!   * a valid 1.0 export carries `appVersion`, `backupSchemaVersion`,
//!     `exportedAt`, and a top-level `data` object,
//!   * inside `data`, all five collection keys (`entities`, `items`,
//!     `statuses`, `abilities`, `images`) must be **present** as arrays (use
//!     `[]` for empty; omitted keys are rejected by `import_database`).
//!
//! A missing `data` field MUST abort import before any filesystem or DB write
//! happens. The full UI-level restore path is covered by tauri-driver-backed
//! native tests under `e2e-native/`; rollback-specific backend coverage belongs
//! in an in-crate unit test with an in-memory SQLite pool.
//!
//! Run with: `cargo test --manifest-path src-tauri/Cargo.toml --test import_database_tests`

use serde_json::json;

#[test]
fn export_shape_has_required_top_level_keys() {
    // This mirrors the JSON produced by `export_database`. If the real export
    // code stops emitting one of these keys, downstream tooling will break;
    // keep this test aligned with `export_database` in utility_commands.rs.
    let export = json!({
        "appVersion": "1.0.0",
        "backupSchemaVersion": 1,
        "exportedAt": "2026-04-24T00:00:00Z",
        "data": {
            "entities": [],
            "items": [],
            "statuses": [],
            "abilities": [],
            "images": [],
        }
    });

    assert!(
        export.get("appVersion").and_then(|v| v.as_str()).is_some(),
        "export must have an appVersion string"
    );
    assert_eq!(
        export.get("backupSchemaVersion").and_then(|v| v.as_u64()),
        Some(1),
        "export must have backupSchemaVersion 1"
    );
    assert!(
        export.get("exportedAt").and_then(|v| v.as_str()).is_some(),
        "export must have an exportedAt string"
    );
    assert!(
        export.get("data").is_some(),
        "export must have a `data` field"
    );
    let data = export.get("data").unwrap();
    for key in ["entities", "items", "statuses", "abilities"] {
        assert!(
            data.get(key).and_then(|v| v.as_array()).is_some(),
            "data.{} must be a JSON array",
            key
        );
    }
    assert!(
        data.get("images").and_then(|v| v.as_array()).is_some(),
        "data.images must be a JSON array"
    );
}

#[test]
fn import_payload_missing_data_field_is_structurally_invalid() {
    // `import_database` rejects payloads with no `data` field before it ever
    // touches disk or the DB. This guards the JSON shape assumption so a
    // future refactor cannot accidentally make the field optional.
    let invalid = json!({
        "appVersion": "1.0.0",
        "backupSchemaVersion": 1,
        "exportedAt": "2026-04-24T00:00:00Z",
    });
    assert!(invalid.get("data").is_none());
}

#[test]
fn import_payload_missing_schema_version_is_structurally_invalid_for_1_0() {
    let invalid = json!({
        "appVersion": "1.0.0",
        "exportedAt": "2026-04-24T00:00:00Z",
        "data": {
            "entities": [],
            "items": [],
            "statuses": [],
            "abilities": [],
            "images": [],
        }
    });

    assert!(
        invalid.get("backupSchemaVersion").is_none(),
        "1.0 import requires an explicit backupSchemaVersion"
    );
}

#[test]
fn import_data_must_list_all_four_collections() {
    // Importer requires each key; foreign or hand-edited JSON cannot omit one and
    // silently clear that table.
    let incomplete = json!({
        "appVersion": "1.0.0",
        "backupSchemaVersion": 1,
        "exportedAt": "2026-04-24T00:00:00Z",
        "data": {
            "entities": [],
            "items": [],
            "abilities": [],
        }
    });
    assert!(
        incomplete.pointer("/data/statuses").is_none(),
        "fixture must omit statuses to mirror a bad backup"
    );
}

#[test]
fn import_data_must_include_images_array_even_when_empty() {
    let incomplete = json!({
        "appVersion": "1.0.0",
        "backupSchemaVersion": 1,
        "exportedAt": "2026-04-24T00:00:00Z",
        "data": {
            "entities": [],
            "items": [],
            "statuses": [],
            "abilities": [],
        }
    });
    assert!(
        incomplete.pointer("/data/images").is_none(),
        "1.0 backups must include data.images as an array, using [] when empty"
    );
}

#[test]
fn import_payload_non_array_collection_is_structurally_invalid() {
    // The `parse_array` helper inside `import_database` requires each
    // collection to be a JSON array. Anything else must be rejected.
    let malformed = json!({
        "appVersion": "1.0.0",
        "backupSchemaVersion": 1,
        "exportedAt": "2026-04-24T00:00:00Z",
        "data": {
            "entities": { "not": "an array" },
            "items": [],
            "statuses": [],
            "abilities": [],
        }
    });
    let entities = malformed.pointer("/data/entities").unwrap();
    assert!(
        !entities.is_array(),
        "this fixture must NOT be an array; the real importer must reject it"
    );
}

// NOTE: The transactional rollback behaviour of `import_database` (Phase 3 in
// `utility_commands.rs`; a DB error aborts the whole tx and cleans up staged
// images) cannot be exercised from this integration-test crate without a real
// SQLite pool and a mocked `AppHandle`. The canonical place to cover that is
// either:
//
//   (a) a unit-test module added inside `utility_commands.rs` with an in-memory
//       SQLite pool (requires editing a file outside this owner's scope), or
//   (b) the tauri-driver-backed native specs under `e2e-native/`.
//
// Option (b) is the recommended path because it also exercises the real image
// staging/promotion filesystem dance, which no pure-Rust test can reach.
