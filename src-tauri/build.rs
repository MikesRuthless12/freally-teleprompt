fn main() {
    // Dictation (FT-33) links the native `libvosk`. Neither the library nor the
    // model is in the repository — `scripts/fetch-vosk.mjs` puts them under
    // `vendor/vosk/` — so none of this runs unless the `vosk` feature is on,
    // and the default build stays dependency-free.
    if std::env::var_os("CARGO_FEATURE_VOSK").is_some() {
        link_vosk();
    }
    tauri_build::build()
}

/// Tell the linker where `libvosk` is, and tell the runtime loader where it will
/// have been bundled.
fn link_vosk() {
    let manifest = std::env::var("CARGO_MANIFEST_DIR").expect("cargo always sets this");
    let link_dir = std::path::Path::new(&manifest)
        .join("vendor")
        .join("vosk")
        .join("link");

    // Fail HERE with something actionable. Without this the build dies much
    // later in the linker, on a missing symbol, with nothing pointing at the
    // fetch step that was skipped.
    if !link_dir.is_dir() {
        panic!(
            "--features vosk needs {} — run `node scripts/fetch-vosk.mjs` first",
            link_dir.display()
        );
    }
    println!("cargo:rustc-link-search=native={}", link_dir.display());
    println!("cargo:rerun-if-changed={}", link_dir.display());

    // Where the loader must search at RUNTIME. The shared libraries are bundled
    // into the app's resource directory, which sits somewhere different relative
    // to the executable on each platform:
    //
    //   macOS   <App>.app/Contents/MacOS/<bin>  ->  ../Resources
    //   Linux   /usr/bin/<bin>                  ->  ../lib/<bin>
    //
    // Windows needs no rpath at all: its loader already searches the directory
    // the executable lives in, which is exactly where Tauri puts resources.
    //
    // `-bins` rather than the blanket form, so this lands on the app binary and
    // not on every build script and proc-macro in the graph.
    match std::env::var("CARGO_CFG_TARGET_OS")
        .unwrap_or_default()
        .as_str()
    {
        "macos" => {
            println!("cargo:rustc-link-arg-bins=-Wl,-rpath,@executable_path/../Resources");
        }
        "linux" => {
            // The .deb and the AppImage lay the tree out the same way, keyed on
            // the binary name — read from cargo rather than written out, so a
            // rename cannot leave a path that builds and installs cleanly and
            // then fails to load the library on the user's machine, where
            // nothing in CI would catch it.
            //
            // `$ORIGIN` is a literal the linker records; it is not expanded
            // here, and no shell is involved.
            let bin = std::env::var("CARGO_PKG_NAME").expect("cargo always sets this");
            println!("cargo:rustc-link-arg-bins=-Wl,-rpath,$ORIGIN/../lib/{bin}");
            println!("cargo:rustc-link-arg-bins=-Wl,-rpath,$ORIGIN");
        }
        _ => {}
    }
}
