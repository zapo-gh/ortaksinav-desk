pub mod commands;
pub mod db;

use db::{get_db_path, init_db, DbState};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_background_color(Some(tauri::window::Color(25, 118, 210, 255)));
            }
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            // Şema tek yerde (db.rs) yönetilir; ikinci bir bağlantı/migration kaynağı yoktur.
            let db_path = get_db_path(app.handle());
            log::info!("Veritabanı konumu: {:?}", db_path);
            let conn = init_db(&db_path).expect("Veritabanı başlatılamadı");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::machine::get_machine_id,
            commands::machine::get_legacy_machine_id,
            commands::backup::export_db_backup,
            commands::backup::import_db_backup,
            commands::sql::sql_select,
            commands::sql::sql_execute,
            commands::students::save_students,
            commands::students::get_all_students,
            commands::salons::save_salons,
            commands::salons::get_all_salons,
            commands::plans::save_plan,
            commands::plans::update_plan,
            commands::plans::get_plan,
            commands::plans::load_plan,
            commands::plans::get_all_plans,
            commands::plans::get_latest_plan,
            commands::plans::delete_plan,
            commands::plans::archive_plan,
            commands::plans::restore_plan,
            commands::plans::clear_auto_plans,
            commands::settings::save_settings,
            commands::settings::get_settings,
            commands::settings::save_setting,
            commands::settings::get_setting,
            commands::settings::save_temp_data,
            commands::settings::get_temp_data,
            commands::settings::get_database_stats,
            commands::settings::clear_database,
            commands::import_export::save_template_csv,
            commands::import_export::export_students_csv,
            commands::import_export::import_students_csv,
            commands::import_export::batch_save_students_fast,
            commands::license::verify_license
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
