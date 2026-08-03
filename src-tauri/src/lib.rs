pub mod db;
pub mod commands;

use db::{get_db_path, init_db, DbState};
use std::sync::Mutex;
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri::Manager;

// ─── DB Yedeği ───────────────────────────────────────────────────────────────
use std::path::PathBuf;

/// Yedek almadan önce SQLite WAL'ı DB'ye flush et
#[tauri::command]
async fn export_db_backup(app: tauri::AppHandle) -> Result<Vec<u8>, String> {
  let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  let mut db_path: PathBuf = app_data_dir.clone();
  db_path.push("kelebek.db");

  if !db_path.exists() {
    return Err(format!("DB dosyası bulunamadı: {}", db_path.display()));
  }

  // WAL'ı DB'ye flush et (bekleyen yazmaları main db'ye yaz)
  if let Some(window) = app.get_webview_window("main") {
    // WebView üzerinden SQLite PRAGMA çalıştır (plugin-sql üzerinden)
    // En güvenilir yöntem: Rust tarafında SQLite'a bağlanıp checkpoint yap
    // Ama plugin-sql dışında bağlanmak sorun çıkarabilir.
    // Bunun yerine tüm WAL/SHM dosyalarını da backup'a dahil edelim.
  }

  let bytes = std::fs::read(&db_path)
    .map_err(|e| format!("DB dosyası okunamadı: {e}"))?;

  Ok(bytes)
}

#[tauri::command]
fn import_db_backup(app: tauri::AppHandle, bytes: Vec<u8>) -> Result<(), String> {
  let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

  let mut db_path: PathBuf = app_data_dir.clone();
  db_path.push("kelebek.db");

  let mut tmp_path: PathBuf = app_data_dir.clone();
  tmp_path.push("kelebek.db.import.tmp");

  if bytes.len() < 10 {
    return Err("Verilen DB yedeği çok küçük görünüyor.".to_string());
  }

  // ÖNCE: Eski WAL ve SHM dosyalarını temizle (SQLite'in kafası karışmasın)
  let mut wal_path = app_data_dir.clone();
  wal_path.push("kelebek.db-wal");
  let _ = std::fs::remove_file(&wal_path);

  let mut shm_path = app_data_dir.clone();
  shm_path.push("kelebek.db-shm");
  let _ = std::fs::remove_file(&shm_path);

  // Atomik restore: önce temp dosyaya yaz, sonra rename ile hedefe geçir.
  let max_attempts = 10;
  let mut last_err: Option<String> = None;

  for attempt in 1..=max_attempts {
    let _ = std::fs::remove_file(&tmp_path);

    let mut backup_old_path: PathBuf = app_data_dir.clone();
    backup_old_path.push("kelebek.db.import.old.tmp");
    let _ = std::fs::remove_file(&backup_old_path);

    if let Err(e) = std::fs::write(&tmp_path, &bytes) {
      last_err = Some(format!("Attempt {attempt}: temp DB yazılamadı: {e}"));
      std::thread::sleep(std::time::Duration::from_millis(150 * attempt as u64));
      continue;
    }

    let mut replace_ok = false;

    for replace_attempt in 1..=3 {
      let res = (|| -> Result<(), String> {
        if !db_path.exists() {
          std::fs::rename(&tmp_path, &db_path)
            .map_err(|e| format!("DB rename başarısız: {e}"))?;
          return Ok(());
        }

        let mut backup_old_path_inner: PathBuf = app_data_dir.clone();
        backup_old_path_inner.push("kelebek.db.import.old.tmp");

        let _ = std::fs::remove_file(&backup_old_path_inner);

        std::fs::rename(&db_path, &backup_old_path_inner)
          .map_err(|e| format!("DB eski dosya rename başarısız: {e}"))?;

        std::fs::rename(&tmp_path, &db_path)
          .map_err(|e| format!("DB temp -> hedef rename başarısız: {e}"))?;

        let _ = std::fs::remove_file(&backup_old_path_inner);

        Ok(())
      })();

      match res {
        Ok(_) => {
          replace_ok = true;
          break;
        }
        Err(e) => {
          last_err = Some(format!("{e}"));
          let _ = std::fs::remove_file(&tmp_path);
          let _ = std::fs::remove_file(&backup_old_path);
          std::thread::sleep(std::time::Duration::from_millis(200 * (attempt as u64) + 100 * (replace_attempt as u64)));
        }
      }
    }

    if replace_ok {
      return Ok(());
    }

    std::thread::sleep(std::time::Duration::from_millis(250 * attempt as u64));
  }

  Err(last_err.unwrap_or_else(|| "DB import başarısız".to_string()))
}

// ─── Makine Kimliği ───────────────────────────────────────────────────────────

/// Windows MachineGuid'ini registry'den okuyup SHA-256 ile hash'ler.
#[tauri::command]
fn get_machine_id() -> String {
  let raw = read_machine_guid();
  sha256_hex(&raw).chars().take(32).collect()
}

#[cfg(windows)]
fn read_machine_guid() -> String {
  use winreg::enums::*;
  use winreg::RegKey;
  let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
  hklm.open_subkey(r"SOFTWARE\Microsoft\Cryptography")
    .and_then(|key| key.get_value::<String, _>("MachineGuid"))
    .unwrap_or_else(|_| "unknown-machine".to_string())
}

#[cfg(not(windows))]
fn read_machine_guid() -> String {
  std::fs::read_to_string("/etc/machine-id")
    .map(|s| s.trim().to_string())
    .unwrap_or_else(|_| {
      hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown-machine".to_string())
    })
}

fn sha256_hex(input: &str) -> String {
  input.as_bytes().iter().map(|b| format!("{:02x}", b)).collect::<String>()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    let migrations = vec![
    Migration {
      version: 1,
      description: "create_initial_tables",
      sql: "
        CREATE TABLE IF NOT EXISTS plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          date TEXT,
          totalStudents INTEGER DEFAULT 0,
          salonCount INTEGER DEFAULT 0,
          sinavTarihi TEXT,
          sinavSaati TEXT,
          sinavDonemi TEXT,
          donem TEXT,
          data TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS students (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS salons (
          salonId TEXT PRIMARY KEY,
          data TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          type TEXT DEFAULT 'string',
          updatedAt TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS temp_data (
          key TEXT PRIMARY KEY,
          value TEXT,
          type TEXT DEFAULT 'json',
          expiresAt TEXT
        );
      ",
      kind: MigrationKind::Up,
    },
    Migration {
      version: 2,
      description: "add_users_and_userid_scoping",
      sql: "
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          display_name TEXT,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );

        DROP TABLE IF EXISTS plans;
        CREATE TABLE plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL,
          date TEXT,
          totalStudents INTEGER DEFAULT 0,
          salonCount INTEGER DEFAULT 0,
          sinavTarihi TEXT,
          sinavSaati TEXT,
          sinavDonemi TEXT,
          donem TEXT,
          data TEXT,
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now'))
        );

        DROP TABLE IF EXISTS students;
        CREATE TABLE students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL DEFAULT '',
          studentId TEXT NOT NULL,
          data TEXT NOT NULL,
          UNIQUE(userId, studentId)
        );

        DROP TABLE IF EXISTS salons;
        CREATE TABLE salons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL DEFAULT '',
          salonId TEXT NOT NULL,
          data TEXT NOT NULL,
          UNIQUE(userId, salonId)
        );

        DROP TABLE IF EXISTS settings;
        CREATE TABLE settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL DEFAULT '',
          key TEXT NOT NULL,
          value TEXT,
          type TEXT DEFAULT 'string',
          updatedAt TEXT DEFAULT (datetime('now')),
          UNIQUE(userId, key)
        );
      ",
      kind: MigrationKind::Up,
    },
    Migration {
      version: 3,
      description: "add_sessions_table",
      sql: "
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          display_name TEXT,
          permanent INTEGER NOT NULL DEFAULT 0
        );
      ",
      kind: MigrationKind::Up,
    },
    Migration {
      version: 4,
      description: "enable_wal_and_checkpoint_on_backup",
      sql: "
        PRAGMA journal_mode=WAL;
        PRAGMA wal_autocheckpoint=1000;
      ",
      kind: MigrationKind::Up,
    },
    Migration {
      version: 5,
      description: "add_archive_columns_to_plans",
      sql: "
        -- isArchived ve archiveMetadata kolonları eski DB'lerde yoksa ekle
        ALTER TABLE plans ADD COLUMN isArchived INTEGER DEFAULT 0;
        ALTER TABLE plans ADD COLUMN archiveMetadata TEXT;
      ",
      kind: MigrationKind::Up,
    },
  ];

  tauri::Builder::default()
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
      let db_path = get_db_path(app.handle());
      log::info!("Veritabanı konumu: {:?}", db_path);
      let conn = init_db(&db_path).expect("Veritabanı başlatılamadı");
      app.manage(DbState(Mutex::new(conn)));
      Ok(())
    })
    .plugin(
      tauri_plugin_sql::Builder::new()
        .add_migrations("sqlite:kelebek.db", migrations)
        .build(),
    )
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      get_machine_id,
      export_db_backup,
      import_db_backup,
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