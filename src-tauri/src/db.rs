// src-tauri/src/db.rs
// SQLite veritabanı bağlantısı ve şema başlatma

use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct DbState(pub Mutex<Connection>);

pub fn get_db_path(app: &tauri::AppHandle) -> PathBuf {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("Uygulama veri dizini bulunamadı");
    std::fs::create_dir_all(&data_dir).expect("Veri dizini oluşturulamadı");
    data_dir.join("kelebek.db")
}

pub fn init_db(path: &PathBuf) -> Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    create_schema(&conn)?;

    // Güvenli migration kontrolleri (var olan tablolara eksik kolon eklemesi)
    let _ = conn.execute(
        "ALTER TABLE plans ADD COLUMN isArchived INTEGER DEFAULT 0",
        [],
    );
    let _ = conn.execute("ALTER TABLE plans ADD COLUMN archiveMetadata TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE plans ADD COLUMN userId TEXT NOT NULL DEFAULT ''",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE students ADD COLUMN userId TEXT NOT NULL DEFAULT ''",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE salons ADD COLUMN userId TEXT NOT NULL DEFAULT ''",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE settings ADD COLUMN userId TEXT NOT NULL DEFAULT ''",
        [],
    );

    Ok(conn)
}

pub fn create_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(SCHEMA_SQL)?;
    Ok(())
}

const SCHEMA_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS plans (
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
    isArchived INTEGER DEFAULT 0,
    archiveMetadata TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL DEFAULT '',
    studentId TEXT NOT NULL,
    data TEXT NOT NULL,
    UNIQUE(userId, studentId)
);

CREATE TABLE IF NOT EXISTS salons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL DEFAULT '',
    salonId TEXT NOT NULL,
    data TEXT NOT NULL,
    UNIQUE(userId, salonId)
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL DEFAULT '',
    key TEXT NOT NULL,
    value TEXT,
    type TEXT DEFAULT 'string',
    updatedAt TEXT DEFAULT (datetime('now')),
    UNIQUE(userId, key)
);

CREATE TABLE IF NOT EXISTS temp_data (
    key TEXT PRIMARY KEY,
    value TEXT,
    type TEXT DEFAULT 'json',
    expiresAt TEXT
);

CREATE INDEX IF NOT EXISTS idx_students_userId ON students(userId);
CREATE INDEX IF NOT EXISTS idx_salons_userId ON salons(userId);
CREATE INDEX IF NOT EXISTS idx_plans_userId ON plans(userId);
CREATE INDEX IF NOT EXISTS idx_settings_userId ON settings(userId);
"#;
