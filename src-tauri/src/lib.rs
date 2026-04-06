mod commands;

use tauri::{menu::{Menu, MenuItem, PredefinedMenuItem, Submenu}, Emitter};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // ── macOS-style application menu (About + Quit) ───────────────────
            let app_menu = Submenu::with_items(
                app,
                "VectorTol",
                true,
                &[
                    &PredefinedMenuItem::about(app, Some("About VectorTol"), None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, Some("Quit VectorTol"))?,
                ],
            )?;

            // ── File menu ─────────────────────────────────────────────────────
            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &MenuItem::with_id(app, "new", "New", true, Some("CmdOrCtrl+N"))?,
                    &MenuItem::with_id(app, "open", "Open...", true, Some("CmdOrCtrl+O"))?,
                    &MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "export-pdf", "Export PDF...", true, None::<&str>)?,
                    &MenuItem::with_id(app, "export-xlsx", "Export XLSX...", true, None::<&str>)?,
                    &MenuItem::with_id(app, "export-csv", "Export CSV...", true, None::<&str>)?,
                ],
            )?;

            // ── Edit menu ─────────────────────────────────────────────────────
            // No accelerators for Undo/Redo — the web keydown handler owns those.
            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &MenuItem::with_id(app, "undo", "Undo", true, None::<&str>)?,
                    &MenuItem::with_id(app, "redo", "Redo", true, None::<&str>)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "add-row", "Add Row", true, None::<&str>)?,
                    &MenuItem::with_id(app, "delete-row", "Delete Selected Row", true, None::<&str>)?,
                ],
            )?;

            // ── View menu ─────────────────────────────────────────────────────
            let view_menu = Submenu::with_items(
                app,
                "View",
                true,
                &[
                    &MenuItem::with_id(app, "toggle-theme", "Toggle Theme", true, None::<&str>)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "tutorial", "Tutorial", true, None::<&str>)?,
                    &MenuItem::with_id(app, "shortcuts", "Keyboard Shortcuts", true, None::<&str>)?,
                ],
            )?;

            let menu = Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu, &view_menu])?;
            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            // Relay every menu item click to the frontend as a "menu-action" event.
            let _ = app.emit("menu-action", &event.id().0);
        })
        .invoke_handler(tauri::generate_handler![
            commands::file_io::read_file,
            commands::file_io::write_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
