use serde::{Deserialize, Serialize};
use ed25519_dalek::{VerifyingKey, Signature, Verifier};

#[derive(Serialize, Deserialize, Debug)]
struct LicensePayload {
    pub e: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub m: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub k: Option<String>,
}

#[derive(Serialize)]
pub struct VerifyResult {
    pub valid: bool,
    pub expired_info: Option<ExpiredInfo>,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct ExpiredInfo {
    pub expiryDate: String,
    pub schoolName: Option<String>,
    pub kurumKodu: Option<String>,
}

// RAW_PUB from our generator
const PUBLIC_KEY_HEX: &str = "fc1eeeb3068450d0c29e76d7cc3dc3cabdb03aecde387a292c8add54778c76cf";

fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, String> {
    hex::decode(hex).map_err(|_| "Invalid hex string".to_string())
}

#[tauri::command]
pub fn verify_license(key: String, currentMachineId: Option<String>) -> VerifyResult {
    // 1. Remove dashes
    let raw = key.replace("-", "").to_uppercase();
    
    // 2. Minimum length check: Signature is 128 hex chars (64 bytes). Payload must be at least some chars.
    if raw.len() <= 128 {
        return VerifyResult {
            valid: false,
            expired_info: None,
            error: Some("Lisans anahtarı çok kısa veya geçersiz format.".to_string()),
        };
    }

    // 3. Split payload and signature
    let payload_hex = &raw[..raw.len() - 128];
    let signature_hex = &raw[raw.len() - 128..];

    // 4. Decode hex
    let payload_bytes = match hex_to_bytes(payload_hex) {
        Ok(b) => b,
        Err(_) => return VerifyResult {
            valid: false,
            expired_info: None,
            error: Some("Lisans verisi hatalı.".to_string()),
        },
    };

    let signature_bytes = match hex_to_bytes(signature_hex) {
        Ok(b) => b,
        Err(_) => return VerifyResult {
            valid: false,
            expired_info: None,
            error: Some("Lisans imzası hatalı.".to_string()),
        },
    };
    
    if signature_bytes.len() != 64 {
        return VerifyResult {
            valid: false,
            expired_info: None,
            error: Some("Geçersiz imza uzunluğu.".to_string()),
        };
    }
    
    let mut sig_arr = [0u8; 64];
    sig_arr.copy_from_slice(&signature_bytes);

    // 5. Verify signature
    let pub_key_bytes = hex_to_bytes(PUBLIC_KEY_HEX).unwrap();
    let mut pub_arr = [0u8; 32];
    pub_arr.copy_from_slice(&pub_key_bytes);
    
    let public_key = match VerifyingKey::from_bytes(&pub_arr) {
        Ok(k) => k,
        Err(_) => return VerifyResult {
            valid: false,
            expired_info: None,
            error: Some("Sistem açık anahtar hatası.".to_string()),
        },
    };

    let signature = Signature::from_bytes(&sig_arr);

    let payload_hex_bytes = payload_hex.as_bytes(); // We sign the payload hex string bytes in JS generator

    if let Err(_) = public_key.verify(payload_hex_bytes, &signature) {
        return VerifyResult {
            valid: false,
            expired_info: None,
            error: Some("Lisans anahtarı geçersiz veya değiştirilmiş.".to_string()),
        };
    }

    // 6. Parse JSON payload
    let json_str = match String::from_utf8(payload_bytes) {
        Ok(s) => s,
        Err(_) => return VerifyResult {
            valid: false,
            expired_info: None,
            error: Some("Lisans verisi okunamadı.".to_string()),
        },
    };

    let payload: LicensePayload = match serde_json::from_str(&json_str) {
        Ok(p) => p,
        Err(_) => return VerifyResult {
            valid: false,
            expired_info: None,
            error: Some("Lisans verisi formatı hatalı.".to_string()),
        },
    };

    // 7. Check expiration
    if payload.e.len() != 8 {
        return VerifyResult {
            valid: false,
            expired_info: None,
            error: Some("Lisans tarihi formatı geçersiz.".to_string()),
        };
    }

    let year: i32 = payload.e[0..4].parse().unwrap_or(0);
    let month: u32 = payload.e[4..6].parse().unwrap_or(0);
    let day: u32 = payload.e[6..8].parse().unwrap_or(0);

    let expiry_date = chrono::NaiveDate::from_ymd_opt(year, month, day);
    if expiry_date.is_none() {
        return VerifyResult {
            valid: false,
            expired_info: None,
            error: Some("Lisans tarihi geçersiz.".to_string()),
        };
    }

    let expiry_date = expiry_date.unwrap();
    let today = chrono::Local::now().naive_local().date();

    if today > expiry_date {
        let expiry_formatted = format!("{}-{}-{}", payload.e[0..4].to_string(), payload.e[4..6].to_string(), payload.e[6..8].to_string());
        
        return VerifyResult {
            valid: false,
            expired_info: Some(ExpiredInfo {
                expiryDate: expiry_formatted,
                schoolName: payload.n.clone(),
                kurumKodu: payload.k.clone(),
            }),
            error: Some(format!("Lisans süresi dolmuştur.")),
        };
    }

    // 8. Check machine ID
    // If ANY of m, n, k are provided, they ALL must be verified (Non-universal license)
    // Universal license means m, n, k are ALL None.
    let is_universal = payload.m.is_none() && payload.n.is_none() && payload.k.is_none();
    
    if !is_universal {
        if payload.m.is_none() || payload.n.is_none() || payload.k.is_none() {
            return VerifyResult {
                valid: false,
                expired_info: None,
                error: Some("Lisans anahtarı eksik bilgi içeriyor. Makine ID, Okul İsmi ve Kurum Kodu zorunludur.".to_string()),
            };
        }
        
        let m = payload.m.unwrap();
        if let Some(ref current) = currentMachineId {
            if m.to_uppercase() != current.to_uppercase() {
                return VerifyResult {
                    valid: false,
                    expired_info: None,
                    error: Some("Bu lisans başka bir cihaz için üretilmiştir. Lütfen sistem yöneticinizle iletişime geçin.".to_string()),
                };
            }
        } else {
            return VerifyResult {
                valid: false,
                expired_info: None,
                error: Some("Makine ID doğrulanamadı.".to_string()),
            };
        }
    }

    VerifyResult {
        valid: true,
        expired_info: None,
        error: None,
    }
}
