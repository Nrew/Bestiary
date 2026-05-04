fn main() {
    println!("cargo:rerun-if-changed=src/models.rs");
    println!("cargo:rerun-if-changed=src/error.rs");

    tauri_build::build()
}
