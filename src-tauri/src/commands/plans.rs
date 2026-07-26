// src-tauri/src/commands/plans.rs
// Sınav planları için Native SQLite komutları

use crate::db::DbState;
use rusqlite::{params, Row};
use serde_json::{json, Value};
use tauri::State;

fn is_test_plan(name: &str) -> bool {
    let lower = name.trim().to_lowercase();
    let test_names = [
        "test plan",
        "valid plan",
        "minimal plan",
        "plan 1",
        "plan 2",
        "plan 3",
        "plan 4",
        "plan 5",
        "test",
        "geçici plan",
        "temp plan",
        "sample plan",
        "demo plan",
    ];
    test_names.iter().any(|t| lower == *t || lower.contains(t))
}

fn now_iso() -> String {
    // Basit UTC timestamp ISO formata yakın
    // SQLite datetime('now') yerine uygulama içi zaman damgası
    let now = std::time::SystemTime::now();
    let dt: chrono::DateTime<chrono::Utc> = now.into();
    dt.to_rfc3339()
}

fn row_to_plan_json(row: &Row<'_>) -> rusqlite::Result<Value> {
    let id: i64 = row.get("id")?;
    let user_id: String = row.get("userId").unwrap_or_default();
    let name: String = row.get("name")?;
    let date: Option<String> = row.get("date").ok();
    let total_students: i64 = row.get("totalStudents").unwrap_or(0);
    let salon_count: i64 = row.get("salonCount").unwrap_or(0);
    let sinav_tarihi: Option<String> = row.get("sinavTarihi").ok();
    let sinav_saati: Option<String> = row.get("sinavSaati").ok();
    let sinav_donemi: Option<String> = row.get("sinavDonemi").ok();
    let donem: Option<String> = row.get("donem").ok();
    let data_str: Option<String> = row.get("data").ok();
    let is_archived_int: i64 = row.get("isArchived").unwrap_or(0);
    let archive_metadata_str: Option<String> = row.get("archiveMetadata").ok();
    let created_at: Option<String> = row.get("createdAt").ok();
    let updated_at: Option<String> = row.get("updatedAt").ok();

    let data_val = match data_str {
        Some(s) => serde_json::from_str(&s).unwrap_or(Value::String(s)),
        None => Value::Null,
    };

    let archive_metadata_val = match archive_metadata_str {
        Some(s) => serde_json::from_str(&s).unwrap_or(Value::String(s)),
        None => Value::Null,
    };

    Ok(json!({
        "id": id,
        "userId": user_id,
        "name": name,
        "date": date,
        "totalStudents": total_students,
        "salonCount": salon_count,
        "sinavTarihi": sinav_tarihi,
        "sinavSaati": sinav_saati,
        "sinavDonemi": sinav_donemi,
        "donem": donem,
        "data": data_val,
        "isArchived": is_archived_int != 0,
        "archiveMetadata": archive_metadata_val,
        "createdAt": created_at,
        "updatedAt": updated_at
    }))
}

#[tauri::command]
pub async fn save_plan(
    state: State<'_, DbState>,
    user_id: String,
    plan_data: Value,
) -> Result<Option<i64>, String> {
    let name = plan_data
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("İsimsiz Plan")
        .to_string();

    if is_test_plan(&name) {
        log::warn!("⚠️ Test planı kaydı engellendi: {}", name);
        return Ok(None);
    }

    let date = plan_data
        .get("date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(now_iso);
    let total_students = plan_data
        .get("totalStudents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let salon_count = plan_data
        .get("salonCount")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let sinav_tarihi = plan_data
        .get("sinavTarihi")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let sinav_saati = plan_data
        .get("sinavSaati")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let sinav_donemi = plan_data
        .get("sinavDonemi")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let donem = plan_data
        .get("donem")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let data_val = plan_data.get("data").cloned().unwrap_or(Value::Null);
    let data_str = serde_json::to_string(&data_val).unwrap_or_else(|_| "null".to_string());

    let is_archived = plan_data
        .get("isArchived")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let archive_metadata = plan_data.get("archiveMetadata");
    let archive_metadata_str = archive_metadata.map(|m| serde_json::to_string(m).unwrap_or_default());

    let now = now_iso();

    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    conn.execute(
        r#"INSERT INTO plans (
            userId, name, date, totalStudents, salonCount, sinavTarihi, sinavSaati,
            sinavDonemi, donem, data, isArchived, archiveMetadata, createdAt, updatedAt
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)"#,
        params![
            user_id,
            name,
            date,
            total_students,
            salon_count,
            sinav_tarihi,
            sinav_saati,
            sinav_donemi,
            donem,
            data_str,
            if is_archived { 1 } else { 0 },
            archive_metadata_str,
            now,
            now
        ],
    )
    .map_err(|e| format!("Plan kaydedilemedi: {e}"))?;

    let last_id = conn.last_insert_rowid();
    log::info!("✅ Plan kaydedildi (Native Rust SQLite): {last_id}");
    Ok(Some(last_id))
}

#[tauri::command]
pub async fn update_plan(
    state: State<'_, DbState>,
    user_id: String,
    plan_id: i64,
    plan_data: Value,
) -> Result<i64, String> {
    let name = plan_data
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("İsimsiz Plan")
        .to_string();
    let date = plan_data
        .get("date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(now_iso);
    let total_students = plan_data
        .get("totalStudents")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let salon_count = plan_data
        .get("salonCount")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let sinav_tarihi = plan_data
        .get("sinavTarihi")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let sinav_saati = plan_data
        .get("sinavSaati")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let sinav_donemi = plan_data
        .get("sinavDonemi")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let donem = plan_data
        .get("donem")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let data_val = plan_data.get("data").cloned().unwrap_or(Value::Null);
    let data_str = serde_json::to_string(&data_val).unwrap_or_else(|_| "null".to_string());

    let is_archived = plan_data
        .get("isArchived")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let archive_metadata = plan_data.get("archiveMetadata");
    let archive_metadata_str = archive_metadata.map(|m| serde_json::to_string(m).unwrap_or_default());

    let now = now_iso();

    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    conn.execute(
        r#"UPDATE plans SET
            name=?1, date=?2, totalStudents=?3, salonCount=?4,
            sinavTarihi=?5, sinavSaati=?6, sinavDonemi=?7, donem=?8,
            data=?9, isArchived=?10, archiveMetadata=?11, updatedAt=?12
        WHERE id=?13 AND userId=?14"#,
        params![
            name,
            date,
            total_students,
            salon_count,
            sinav_tarihi,
            sinav_saati,
            sinav_donemi,
            donem,
            data_str,
            if is_archived { 1 } else { 0 },
            archive_metadata_str,
            now,
            plan_id,
            user_id
        ],
    )
    .map_err(|e| format!("Plan güncellenemedi: {e}"))?;

    log::info!("✅ Plan güncellendi (Native Rust SQLite): {plan_id}");
    Ok(plan_id)
}

#[tauri::command]
pub async fn get_plan(
    state: State<'_, DbState>,
    user_id: String,
    plan_id: i64,
) -> Result<Option<Value>, String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let mut stmt = conn
        .prepare("SELECT * FROM plans WHERE id = ?1 AND userId = ?2")
        .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

    let mut rows = stmt
        .query_map(params![plan_id, user_id], row_to_plan_json)
        .map_err(|e| format!("Sorgu çalıştırılamadı: {e}"))?;

    if let Some(r) = rows.next() {
        match r {
            Ok(val) => Ok(Some(val)),
            Err(e) => Err(format!("Satır okuma hatası: {e}")),
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn load_plan(
    state: State<'_, DbState>,
    user_id: String,
    plan_id: i64,
) -> Result<Value, String> {
    match get_plan(state, user_id, plan_id).await? {
        Some(p) => Ok(p),
        None => Err(format!("Plan bulunamadı: {plan_id}")),
    }
}

#[tauri::command]
pub async fn get_all_plans(
    state: State<'_, DbState>,
    user_id: String,
) -> Result<Vec<Value>, String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let mut stmt = conn
        .prepare("SELECT * FROM plans WHERE userId = ?1 ORDER BY updatedAt DESC")
        .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

    let rows = stmt
        .query_map(params![user_id], row_to_plan_json)
        .map_err(|e| format!("Sorgu çalıştırılamadı: {e}"))?;

    let mut result = Vec::new();
    for r in rows {
        if let Ok(val) = r {
            result.push(val);
        }
    }

    Ok(result)
}

#[tauri::command]
pub async fn get_latest_plan(
    state: State<'_, DbState>,
    user_id: String,
) -> Result<Option<Value>, String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let mut stmt = conn
        .prepare("SELECT * FROM plans WHERE userId = ?1 ORDER BY updatedAt DESC LIMIT 1")
        .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

    let mut rows = stmt
        .query_map(params![user_id], row_to_plan_json)
        .map_err(|e| format!("Sorgu çalıştırılamadı: {e}"))?;

    if let Some(r) = rows.next() {
        match r {
            Ok(val) => Ok(Some(val)),
            Err(e) => Err(format!("Satır okuma hatası: {e}")),
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn delete_plan(
    state: State<'_, DbState>,
    user_id: String,
    plan_id: i64,
) -> Result<(), String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    conn.execute(
        "DELETE FROM plans WHERE id = ?1 AND userId = ?2",
        params![plan_id, user_id],
    )
    .map_err(|e| format!("Plan silinemedi: {e}"))?;

    log::info!("✅ Plan silindi (Native Rust SQLite): {plan_id}");
    Ok(())
}

#[tauri::command]
pub async fn archive_plan(
    state: State<'_, DbState>,
    user_id: String,
    plan_id: i64,
    archive_metadata: Value,
) -> Result<(), String> {
    let metadata_str = serde_json::to_string(&archive_metadata).unwrap_or_default();
    let now = now_iso();

    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    conn.execute(
        "UPDATE plans SET isArchived = 1, archiveMetadata = ?1, updatedAt = ?2 WHERE id = ?3 AND userId = ?4",
        params![metadata_str, now, plan_id, user_id],
    )
    .map_err(|e| format!("Plan arşivlenemedi: {e}"))?;

    log::info!("✅ Plan arşivlendi (Native Rust SQLite): {plan_id}");
    Ok(())
}

#[tauri::command]
pub async fn restore_plan(
    state: State<'_, DbState>,
    user_id: String,
    plan_id: i64,
) -> Result<(), String> {
    let now = now_iso();

    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    conn.execute(
        "UPDATE plans SET isArchived = 0, archiveMetadata = NULL, updatedAt = ?1 WHERE id = ?2 AND userId = ?3",
        params![now, plan_id, user_id],
    )
    .map_err(|e| format!("Plan arşivden çıkarılamadı: {e}"))?;

    log::info!("✅ Plan arşivden çıkarıldı (Native Rust SQLite): {plan_id}");
    Ok(())
}

#[tauri::command]
pub async fn clear_auto_plans(
    state: State<'_, DbState>,
    user_id: String,
) -> Result<(), String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    conn.execute(
        "DELETE FROM plans WHERE name = 'Otomatik Kayıt' AND userId = ?1",
        params![user_id],
    )
    .map_err(|e| format!("Otomatik kayıtlar temizlenemedi: {e}"))?;

    log::info!("✅ Otomatik kayıt planları temizlendi");
    Ok(())
}
