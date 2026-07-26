// src-tauri/src/commands/import_export.rs
// Öğrenci ve salon verileri için hızlı Native Rust İçe / Dışa Aktarma (Import/Export)

use crate::db::DbState;
use rusqlite::params;
use serde_json::{json, Value};
use tauri::State;

#[tauri::command]
pub async fn save_template_csv(filepath: String, content: String) -> Result<bool, String> {
    std::fs::write(filepath, content).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn export_students_csv(
    state: State<'_, DbState>,
    user_id: String,
    filepath: String,
) -> Result<i32, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT data FROM students WHERE userId = ?1")
        .map_err(|e| e.to_string())?;

    let mut wtr = csv::WriterBuilder::new()
        .delimiter(b';') // Excel uyumluluğu için noktalı virgül
        .from_writer(vec![]);

    wtr.write_record(&["numara", "ad", "soyad", "sinif", "cinsiyet"])
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![user_id], |row| {
            let data_str: String = row.get(0)?;
            Ok(data_str)
        })
        .map_err(|e| e.to_string())?;

    let mut count = 0;
    for row_res in rows {
        let data_str = row_res.map_err(|e| e.to_string())?;
        if let Ok(student) = serde_json::from_str::<Value>(&data_str) {
            let numara = student
                .get("numara")
                .or_else(|| student.get("ogrenciNo"))
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            let ad = student.get("ad").and_then(|v| v.as_str()).unwrap_or_default();
            let soyad = student
                .get("soyad")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            let sinif = student
                .get("sinif")
                .and_then(|v| v.as_str())
                .unwrap_or_default();
            let cinsiyet = student
                .get("cinsiyet")
                .and_then(|v| v.as_str())
                .unwrap_or_default();

            wtr.write_record(&[numara, ad, soyad, sinif, cinsiyet])
                .map_err(|e| e.to_string())?;
            count += 1;
        }
    }

    let data = wtr.into_inner().map_err(|e| e.to_string())?;
    // UTF-8 BOM ekle (Excel ve Türkçe karakter uyumluluğu için)
    let mut result = "\u{FEFF}".to_string();
    result.push_str(&String::from_utf8(data).map_err(|e| e.to_string())?);

    std::fs::write(filepath, result).map_err(|e| e.to_string())?;
    log::info!("✅ Öğrenciler CSV dosyasına aktarıldı: {count} kayıt");
    Ok(count)
}

#[tauri::command]
pub async fn import_students_csv(
    state: State<'_, DbState>,
    user_id: String,
    filepath: String,
) -> Result<usize, String> {
    let csv_content = std::fs::read_to_string(&filepath).map_err(|e| e.to_string())?;

    // UTF-8 BOM kaldır
    let content = csv_content.trim_start_matches('\u{FEFF}');

    // Otomatik ayırıcı algılama (; veya ,)
    let first_line = content.lines().next().unwrap_or("");
    let delimiter = if first_line.contains(';') { b';' } else { b',' };

    let mut rdr = csv::ReaderBuilder::new()
        .flexible(true)
        .delimiter(delimiter)
        .from_reader(content.as_bytes());

    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();
    let required_fields = ["numara", "ad", "soyad", "sinif"];
    for req in required_fields {
        if !headers.iter().any(|h| h.trim().eq_ignore_ascii_case(req)) {
            return Err(format!("CSV başlığında '{req}' sütunu eksik"));
        }
    }

    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction başlatılamadı: {e}"))?;

    let mut stmt = tx
        .prepare("INSERT OR REPLACE INTO students (userId, studentId, data) VALUES (?1, ?2, ?3)")
        .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

    let mut count = 0;
    for result in rdr.records() {
        let record = match result {
            Ok(r) => r,
            Err(_) => continue,
        };

        let get = |name: &str| -> String {
            headers
                .iter()
                .position(|h| h.trim().eq_ignore_ascii_case(name))
                .and_then(|idx| record.get(idx))
                .unwrap_or("")
                .trim()
                .to_string()
        };

        let numara = get("numara");
        let ad = get("ad");
        let soyad = get("soyad");
        let sinif = get("sinif");
        let cinsiyet = get("cinsiyet").to_uppercase();

        if numara.is_empty() || ad.is_empty() {
            continue;
        }

        let student_val = json!({
            "id": numara,
            "numara": numara,
            "ad": ad,
            "soyad": soyad,
            "sinif": sinif,
            "cinsiyet": if cinsiyet == "K" || cinsiyet == "KIZ" { "K" } else { "E" }
        });

        let data_str = student_val.to_string();
        stmt.execute(params![user_id, numara, data_str])
            .map_err(|e| format!("Öğrenci eklenemedi: {e}"))?;
        count += 1;
    }

    drop(stmt);
    tx.commit()
        .map_err(|e| format!("Transaction onaylanamadı: {e}"))?;

    log::info!("✅ CSV üzerinden toplu öğrenci aktarıldı: {count} kayıt");
    Ok(count)
}

#[tauri::command]
pub async fn batch_save_students_fast(
    state: State<'_, DbState>,
    user_id: String,
    students: Vec<Value>,
) -> Result<usize, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction başlatılamadı: {e}"))?;

    tx.execute("DELETE FROM students WHERE userId = ?1", params![user_id])
        .map_err(|e| format!("Öğrenciler silinemedi: {e}"))?;

    let mut stmt = tx
        .prepare("INSERT OR REPLACE INTO students (userId, studentId, data) VALUES (?1, ?2, ?3)")
        .map_err(|e| format!("Sorgu hazırlanamadı: {e}"))?;

    let count = students.len();
    for student in &students {
        let sid = student
            .get("id")
            .and_then(|v| {
                if let Some(s) = v.as_str() {
                    Some(s.to_string())
                } else if let Some(n) = v.as_i64() {
                    Some(n.to_string())
                } else {
                    None
                }
            })
            .unwrap_or_default();

        let data_str = serde_json::to_string(student)
            .map_err(|e| format!("JSON dönüşüm hatası: {e}"))?;

        stmt.execute(params![user_id, sid, data_str])
            .map_err(|e| format!("Öğrenci eklenemedi ({sid}): {e}"))?;
    }

    drop(stmt);
    tx.commit()
        .map_err(|e| format!("Transaction onaylanamadı: {e}"))?;

    log::info!("✅ Toplu hızlı öğrenci kaydı tamamlandı: {count} kayıt");
    Ok(count)
}
