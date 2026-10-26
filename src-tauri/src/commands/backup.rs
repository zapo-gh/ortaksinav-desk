// src-tauri/src/commands/backup.rs
// Veritabanı yedekleme / geri yükleme. Tüm erişim DbState mutex'i üzerinden geçtiği için
// geri yüklemede bağlantı güvenle kapatılıp yeni dosyayla yeniden açılabilir.

use crate::db::{get_db_path, init_db, DbState};
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use tauri::State;

const SQLITE_HEADER: &[u8; 16] = b"SQLite format 3\0";

fn lock_error() -> String {
    "Veritabanı kilitlenemedi".to_string()
}

fn sidecar_path(db_path: &Path, suffix: &str) -> PathBuf {
    let mut name = db_path.as_os_str().to_owned();
    name.push(suffix);
    PathBuf::from(name)
}

#[tauri::command]
pub async fn export_db_backup(
    app: tauri::AppHandle,
    state: State<'_, DbState>,
) -> Result<Vec<u8>, String> {
    let db_path = get_db_path(&app);
    let conn = state.0.lock().map_err(|_| lock_error())?;

    // Bekleyen WAL yazmalarını ana dosyaya işle; mutex tutulduğu için araya yazma girmez.
    conn.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |_| Ok(()))
        .map_err(|e| format!("WAL checkpoint başarısız: {e}"))?;

    std::fs::read(&db_path).map_err(|e| format!("DB dosyası okunamadı: {e}"))
}

fn ensure_valid_backup(candidate_path: &Path) -> Result<(), String> {
    let probe = Connection::open(candidate_path).map_err(|e| e.to_string())?;
    let verdict: String = probe
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|e| format!("Yedek doğrulanamadı: {e}"))?;
    if verdict != "ok" {
        return Err(format!("Yedek dosyası bozuk: {verdict}"));
    }
    Ok(())
}

fn reopen_connection(db_path: &PathBuf, slot: &mut Connection) -> Result<(), String> {
    let reopened = init_db(db_path).map_err(|e| format!("Veritabanı yeniden açılamadı: {e}"))?;
    *slot = reopened;
    Ok(())
}

#[tauri::command]
pub async fn import_db_backup(
    app: tauri::AppHandle,
    state: State<'_, DbState>,
    bytes: Vec<u8>,
) -> Result<(), String> {
    if bytes.len() < SQLITE_HEADER.len() || bytes[..SQLITE_HEADER.len()] != SQLITE_HEADER[..] {
        return Err("Seçilen dosya geçerli bir SQLite veritabanı değil.".to_string());
    }

    let db_path = get_db_path(&app);
    let staged_path = sidecar_path(&db_path, ".import.tmp");
    let safety_copy_path = sidecar_path(&db_path, ".pre-import.bak");

    std::fs::write(&staged_path, &bytes).map_err(|e| format!("Geçici DB yazılamadı: {e}"))?;
    if let Err(reason) = ensure_valid_backup(&staged_path) {
        let _ = std::fs::remove_file(&staged_path);
        return Err(reason);
    }

    let mut guard = state.0.lock().map_err(|_| lock_error())?;
    let _ = guard.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |_| Ok(()));

    // Dosya tutamacını bırakmak için canlı bağlantıyı geçici bir bellek bağlantısıyla değiştir.
    let placeholder = Connection::open_in_memory().map_err(|e| e.to_string())?;
    let live_connection = std::mem::replace(&mut *guard, placeholder);
    if let Err((_, close_error)) = live_connection.close() {
        let _ = std::fs::remove_file(&staged_path);
        let _ = reopen_connection(&db_path, &mut guard);
        return Err(format!("Mevcut bağlantı kapatılamadı: {close_error}"));
    }

    let swap_result = swap_database_files(&db_path, &staged_path, &safety_copy_path);
    let reopen_result = reopen_connection(&db_path, &mut guard);

    swap_result?;
    reopen_result
}

fn swap_database_files(
    db_path: &Path,
    staged_path: &Path,
    safety_copy_path: &Path,
) -> Result<(), String> {
    if db_path.exists() {
        std::fs::copy(db_path, safety_copy_path)
            .map_err(|e| format!("Güvenlik kopyası alınamadı: {e}"))?;
    }
    let _ = std::fs::remove_file(sidecar_path(db_path, "-wal"));
    let _ = std::fs::remove_file(sidecar_path(db_path, "-shm"));

    std::fs::rename(staged_path, db_path).map_err(|e| {
        let _ = std::fs::remove_file(staged_path);
        format!("DB değiştirilemedi: {e}")
    })
}
