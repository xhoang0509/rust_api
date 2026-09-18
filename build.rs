use std::fs;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=frontend/dist");
    let dist_dir = Path::new("frontend/dist");
    if !dist_dir.exists() {
        let _ = fs::create_dir_all(dist_dir);
        let index_file = dist_dir.join("index.html");
        if !index_file.exists() {
            let _ = fs::write(
                index_file,
                "<!DOCTYPE html><html><head><title>Rust API</title></head><body><div id=\"root\"></div></body></html>",
            );
        }
    }
}
