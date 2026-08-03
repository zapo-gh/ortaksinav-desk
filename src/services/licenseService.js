/**
 * Lisans Doğrulama Servisi
 *
 * Lisans anahtarı formatı (v2 - hex encoding):
 *   payload_hex = HEX( JSON({e:"YYYYMMDD", n:"OkulNotu", m:"MachineIdHex"}) )  → sadece 0-9 A-F
 *   imza        = HMAC-SHA256(payload_hex, GİZLİ_ANAHTAR).slice(0,16)
 *   key_raw     = payload_hex + imza  (tümü büyük harf)
 *   gösterim    = 4'lü gruplar — XXXX-XXXX-XXXX-...
 *
 * "m" alanı opsiyoneldir. Yoksa makine kontrolü yapılmaz (geriye dönük uyumluluk).
 * Geliştirici, tools/key-generator.html aracını kullanarak anahtar üretir.
 */

const LICENSE_USER_ID = '_system_';
const LICENSE_DB_KEY = 'license';

import { getSharedDb } from '../database/dbConnection';

async function getDb() {
  return getSharedDb();
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

/** 'YYYY-MM-DD' → yerel gece yarısı (UTC kayması olmadan) */
export function parseExpiryDateLocal(expiryStr) {
  const [y, mo, d] = expiryStr.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

/** Son kullanma tarihine kalan gün (0 = bugün son gün, negatif = dolmuş) */
export function getLicenseDaysLeft(expiryStr) {
  const expiry = parseExpiryDateLocal(expiryStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
}

// ─── Makine Kimliği ────────────────────────────────────────────────────────────

/**
 * Tauri arka ucundan makine parmak izini alır.
 * @returns {Promise<string>} Makine GUID'inin hex karşılığı (ilk 32 karakter)
 */
export async function getMachineId() {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke('get_machine_id');
  } catch {
    return '';
  }
}

// ─── Lisans Doğrulama ────────────────────────────────────────────────────────

/**
 * Girilen lisans anahtarını Rust (Backend) tarafında doğrular.
 * @param {string} rawKey  Kullanıcının girdiği anahtar (tireler/boşluklar dahil)
 * @returns {Promise<{valid, expired?, expiryDate?, schoolName?, kurumKodu?, machineId?, daysLeft?, error?}>}
 */
export async function validateLicenseKey(rawKey) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    
    // Rust tarafına göndermeden önce mevcut makine ID'sini alıyoruz (opsiyonel)
    const current_machine_id = await getMachineId();

    const result = await invoke('verify_license', { 
      key: rawKey,
      currentMachineId: current_machine_id ? current_machine_id.toUpperCase() : null
    });

    if (result.valid) {
      // Geçerli ise gün hesaplaması yapabiliriz. Rust bize tarihi dönmüyor, 
      // bu yüzden JS'de tireleri kaldırıp ortadaki tarihi tekrar çıkarabiliriz
      // ya da sadece daysLeft = 999 diyelim.
      // Ama uyumluluk için formatı çözelim:
      const clean = rawKey.replace(/[-\s]/g, '').toUpperCase();
      const payloadHex = clean.slice(0, -128); // son 128 karakter imza
      
      let expiryStr = '';
      let schoolName = '';
      let kurumKodu = '';
      let machineId = null;
      let daysLeft = 999;

      try {
        const bytes = new Uint8Array(payloadHex.length / 2);
        for (let i = 0; i < payloadHex.length / 2; i++) {
          bytes[i] = parseInt(payloadHex.substr(i * 2, 2), 16);
        }
        const jsonStr = new TextDecoder().decode(bytes);
        const data = JSON.parse(jsonStr);
        
        if (data.e && data.e.length === 8) {
          expiryStr = `${data.e.slice(0, 4)}-${data.e.slice(4, 6)}-${data.e.slice(6, 8)}`;
          daysLeft = getLicenseDaysLeft(expiryStr);
        }
        schoolName = data.n || '';
        kurumKodu = data.k || '';
        machineId = data.m || null;
      } catch (e) {
        // Rust doğruladıysa veriler mutlaka doğrudur, ignore error
      }

      return {
        valid: true,
        expiryDate: expiryStr,
        schoolName,
        kurumKodu,
        machineId,
        daysLeft,
      };
    } else {
      // Geçersiz ise (error mesajı Rust'tan gelir)
      if (result.expired_info) {
        return {
          valid: false,
          expired: true,
          expiryDate: result.expired_info.expiryDate,
          schoolName: result.expired_info.schoolName || '',
          kurumKodu: result.expired_info.kurumKodu || '',
          error: result.error || 'Lisans süresi dolmuştur.',
        };
      }

      return { 
        valid: false, 
        error: result.error || 'Lisans anahtarı geçersiz.' 
      };
    }
  } catch (error) {
    console.error("Lisans doğrulama hatası:", error);
    return { valid: false, error: 'Lisans doğrulanırken sistem hatası oluştu.' };
  }
}

// ─── Depolama (SQLite) ────────────────────────────────────────────────────────

export async function getStoredLicense() {
  try {
    const db = await getDb();
    const rows = await db.select(
      'SELECT value FROM settings WHERE userId = ? AND key = ?',
      [LICENSE_USER_ID, LICENSE_DB_KEY]
    );
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].value);
  } catch { return null; }
}

export async function storeLicense(licenseKey, info) {
  const db = await getDb();
  await db.execute(
    'INSERT OR REPLACE INTO settings (userId, key, value, type, updatedAt) VALUES (?, ?, ?, ?, ?)',
    [LICENSE_USER_ID, LICENSE_DB_KEY,
     JSON.stringify({ key: licenseKey, ...info, activatedAt: new Date().toISOString() }),
     'json', new Date().toISOString()]
  );
}

export async function clearLicense() {
  const db = await getDb();
  await db.execute(
    'DELETE FROM settings WHERE userId = ? AND key = ?',
    [LICENSE_USER_ID, LICENSE_DB_KEY]
  );
}

/**
 * Mevcut kaydedilmiş lisansı kontrol eder.
 */
export async function checkStoredLicense() {
  const stored = await getStoredLicense();
  if (!stored?.key) return { valid: false, notActivated: true };
  return validateLicenseKey(stored.key);
}
