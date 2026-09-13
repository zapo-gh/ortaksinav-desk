// src-tauri/src/commands/settings.rs
// Ayarlar, geçici veriler ve veritabanı istatistikleri için Native SQLite komutları

use crate::db::DbState;
use rusqlite::params;
use serde_json::{json, Value};
use tauri::State;

fn now_iso() -> String {
    let now = std::time::SystemTime::now();
    let dt: chrono::DateTime<chrono::Utc> = now.into();
    dt.to_rfc3339()
}

#[tauri::command]
pub async fn save_settings(
    state: State<'_, DbState>,
    user_id: String,
    settings: Value,
) -> Result<(), String> {
    let obj = match settings.as_object() {
        Some(o) => o,
        None => return Ok(()),
    };

    let mut conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction başlatılamadı: {e}"))?;

    tx.execute("DELETE FROM settings WHERE userId = ?1", params![user_id])
        .map_err(|e| format!("Eski ayarlar silinemedi: {e}"))?;

    {
        let mut stmt = tx
            .prepare(
                "INSERT OR REPLACE INTO settings (userId, key, value, type, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5)",
            )
            .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

        let now = now_iso();
        for (key, val) in obj {
            let (val_str, val_type) = if let Some(s) = val.as_str() {
                (s.to_string(), "string")
            } else if val.is_number() || val.is_boolean() {
                (val.to_string(), "primitive")
            } else {
                (serde_json::to_string(val).unwrap_or_default(), "json")
            };

            stmt.execute(params![user_id, key, val_str, val_type, now])
                .map_err(|e| format!("Ayar kaydedilemedi ({key}): {e}"))?;
        }
    }

    tx.commit()
        .map_err(|e| format!("Transaction onaylanamadı: {e}"))?;

    log::info!("✅ Ayarlar kaydedildi (Native Rust SQLite): {}", obj.len());
    Ok(())
}

#[tauri::command]
pub async fn get_settings(state: State<'_, DbState>, user_id: String) -> Result<Value, String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let mut stmt = conn
        .prepare("SELECT key, value, type FROM settings WHERE userId = ?1")
        .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

    let rows = stmt
        .query_map(params![user_id], |row| {
            let key: String = row.get(0)?;
            let value_str: String = row.get(1).unwrap_or_default();
            let _val_type: String = row.get(2).unwrap_or_else(|_| "string".to_string());
            Ok((key, value_str))
        })
        .map_err(|e| format!("Sorgu çalıştırılamadı: {e}"))?;

    let mut map = serde_json::Map::new();
    for row in rows {
        if let Ok((key, val_str)) = row {
            if let Ok(json_val) = serde_json::from_str::<Value>(&val_str) {
                map.insert(key, json_val);
            } else {
                map.insert(key, Value::String(val_str));
            }
        }
    }

    Ok(Value::Object(map))
}

#[tauri::command]
pub async fn save_setting(
    state: State<'_, DbState>,
    user_id: String,
    key: String,
    value: Value,
) -> Result<(), String> {
    let (val_str, val_type) = if let Some(s) = value.as_str() {
        (s.to_string(), "string")
    } else if value.is_number() || value.is_boolean() {
        (value.to_string(), "primitive")
    } else {
        (serde_json::to_string(&value).unwrap_or_default(), "json")
    };
    let now = now_iso();

    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (userId, key, value, type, updatedAt) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![user_id, key, val_str, val_type, now],
    )
    .map_err(|e| format!("Ayar kaydedilemedi: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn get_setting(
    state: State<'_, DbState>,
    user_id: String,
    key: String,
) -> Result<Option<Value>, String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE userId = ?1 AND key = ?2")
        .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

    let mut rows = stmt
        .query_map(params![user_id, key], |row| {
            let val_str: String = row.get(0)?;
            Ok(val_str)
        })
        .map_err(|e| format!("Sorgu çalıştırılamadı: {e}"))?;

    if let Some(Ok(val_str)) = rows.next() {
        if let Ok(json_val) = serde_json::from_str::<Value>(&val_str) {
            return Ok(Some(json_val));
        } else {
            return Ok(Some(Value::String(val_str)));
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn save_temp_data(
    state: State<'_, DbState>,
    key: String,
    value: Value,
    expires_in_hours: Option<i64>,
) -> Result<(), String> {
    let hours = expires_in_hours.unwrap_or(24);
    let now = std::time::SystemTime::now();
    let expires = now + std::time::Duration::from_secs((hours * 3600) as u64);
    let dt: chrono::DateTime<chrono::Utc> = expires.into();
    let expires_str = dt.to_rfc3339();

    let val_str = serde_json::to_string(&value).unwrap_or_default();

    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO temp_data (key, value, type, expiresAt) VALUES (?1, ?2, 'json', ?3)",
        params![key, val_str, expires_str],
    )
    .map_err(|e| format!("Geçici veri kaydedilemedi: {e}"))?;

    let now_str = now_iso();
    let _ = conn.execute(
        "DELETE FROM temp_data WHERE expiresAt < ?1",
        params![now_str],
    );

    Ok(())
}

#[tauri::command]
pub async fn get_temp_data(
    state: State<'_, DbState>,
    key: String,
) -> Result<Option<Value>, String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let now_str = now_iso();

    let mut stmt = conn
        .prepare("SELECT value, expiresAt FROM temp_data WHERE key = ?1")
        .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

    let mut rows = stmt
        .query_map(params![key], |row| {
            let val_str: String = row.get(0)?;
            let exp_str: String = row.get(1).unwrap_or_default();
            Ok((val_str, exp_str))
        })
        .map_err(|e| format!("Sorgu çalıştırılamadı: {e}"))?;

    if let Some(Ok((val_str, exp_str))) = rows.next() {
        if exp_str < now_str {
            let _ = conn.execute("DELETE FROM temp_data WHERE key = ?1", params![key]);
            return Ok(None);
        }
        if let Ok(json_val) = serde_json::from_str::<Value>(&val_str) {
            return Ok(Some(json_val));
        } else {
            return Ok(Some(Value::String(val_str)));
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn get_database_stats(
    state: State<'_, DbState>,
    user_id: String,
) -> Result<Value, String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let plans_cnt: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM plans WHERE userId = ?1",
            params![user_id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let students_cnt: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM students WHERE userId = ?1",
            params![user_id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let salons_cnt: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM salons WHERE userId = ?1",
            params![user_id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let settings_cnt: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM settings WHERE userId = ?1",
            params![user_id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let temp_cnt: i64 = conn
        .query_row("SELECT COUNT(*) FROM temp_data", [], |r| r.get(0))
        .unwrap_or(0);

    Ok(json!({
        "plans": plans_cnt,
        "students": students_cnt,
        "salons": salons_cnt,
        "settings": settings_cnt,
        "tempData": temp_cnt
    }))
}

#[tauri::command]
pub async fn clear_database(state: State<'_, DbState>, user_id: String) -> Result<(), String> {
    let mut conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction başlatılamadı: {e}"))?;

    tx.execute("DELETE FROM plans WHERE userId = ?1", params![user_id])
        .map_err(|e| format!("Planlar silinemedi: {e}"))?;
    tx.execute("DELETE FROM students WHERE userId = ?1", params![user_id])
        .map_err(|e| format!("Öğrenciler silinemedi: {e}"))?;
    tx.execute("DELETE FROM salons WHERE userId = ?1", params![user_id])
        .map_err(|e| format!("Salonlar silinemedi: {e}"))?;
    tx.execute("DELETE FROM settings WHERE userId = ?1", params![user_id])
        .map_err(|e| format!("Ayarlar silinemedi: {e}"))?;
    tx.execute("DELETE FROM temp_data", [])
        .map_err(|e| format!("Geçici veriler silinemedi: {e}"))?;

    tx.commit()
        .map_err(|e| format!("Transaction onaylanamadı: {e}"))?;

    log::info!("✅ Veritabanı temizlendi (Native Rust SQLite)");
    Ok(())
}
