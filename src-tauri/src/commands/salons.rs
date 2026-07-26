// src-tauri/src/commands/salons.rs
// Salonlar için Native SQLite komutları

use crate::db::DbState;
use rusqlite::params;
use serde_json::Value;
use tauri::State;

#[tauri::command]
pub async fn save_salons(
    state: State<'_, DbState>,
    user_id: String,
    salons: Vec<Value>,
) -> Result<(), String> {
    if salons.is_empty() {
        log::info!("⚠️ Salon verisi boş, kaydetme atlandı");
        return Ok(());
    }

    let mut conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction başlatılamadı: {e}"))?;

    tx.execute("DELETE FROM salons WHERE userId = ?1", params![user_id])
        .map_err(|e| format!("Salonlar silinemedi: {e}"))?;

    {
        let mut stmt = tx
            .prepare("INSERT OR REPLACE INTO salons (userId, salonId, data) VALUES (?1, ?2, ?3)")
            .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

        for (idx, salon) in salons.iter().enumerate() {
            let sid = salon
                .get("salonId")
                .or_else(|| salon.get("id"))
                .and_then(|v| {
                    if let Some(s) = v.as_str() {
                        Some(s.to_string())
                    } else if let Some(n) = v.as_i64() {
                        Some(n.to_string())
                    } else {
                        None
                    }
                })
                .unwrap_or_else(|| format!("salon-{idx}"));

            let data_str = serde_json::to_string(salon)
                .map_err(|e| format!("JSON dönüşüm hatası: {e}"))?;

            stmt.execute(params![user_id, sid, data_str])
                .map_err(|e| format!("Salon eklenemedi ({sid}): {e}"))?;
        }
    }

    tx.commit()
        .map_err(|e| format!("Transaction onaylanamadı: {e}"))?;

    log::info!(
        "✅ Salonlar kaydedildi (Native Rust SQLite): {}",
        salons.len()
    );
    Ok(())
}

#[tauri::command]
pub async fn get_all_salons(
    state: State<'_, DbState>,
    user_id: String,
) -> Result<Vec<Value>, String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Veritabanı kilitlenemedi".to_string())?;

    let mut stmt = conn
        .prepare("SELECT data FROM salons WHERE userId = ?1")
        .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

    let rows = stmt
        .query_map(params![user_id], |row| {
            let data_str: String = row.get(0)?;
            Ok(data_str)
        })
        .map_err(|e| format!("Sorgu çalıştırılamadı: {e}"))?;

    let mut result = Vec::new();
    for row in rows {
        if let Ok(data_str) = row {
            if let Ok(val) = serde_json::from_str::<Value>(&data_str) {
                result.push(val);
            } else {
                result.push(Value::String(data_str));
            }
        }
    }

    Ok(result)
}
