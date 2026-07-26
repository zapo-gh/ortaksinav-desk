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

// ⚠️  Bu değeri asla paylaşmayın / kaynak kodunuzu herkese açık yapmayın.
const SECRET = 'KelBK-2024-xLic-9fTq-mNpR';

// SQLite bağlantısı (localStorage yerine)
const DB_URL = 'sqlite:kelebek.db';
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

async function hmacSign(data, secret) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function strToHex(str) {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToStr(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length / 2; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return new TextDecoder().decode(bytes);
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

// ─── Lisans Anahtarı Üretimi ─────────────────────────────────────────────────

/**
 * @param {string} expiryDate  'YYYY-MM-DD'
 * @param {string} schoolNote  Okul adı (opsiyonel)
 * @param {string} machineId   Makine ID hex'i (opsiyonel — boşsa evrensel lisans)
 * @param {string} [secret]    Varsayılan: yerleşik SECRET
 */
export async function generateLicenseKey(expiryDate, schoolNote = '', machineId = '', secret = SECRET) {
  // Tarihi kompakt sakla: "2027-07-12" → "20270712"
  const dateCompact = expiryDate.replace(/-/g, '');
  const payload = {
    e: dateCompact,
    ...(schoolNote.trim() ? { n: schoolNote.trim() } : {}),
    ...(machineId.trim() ? { m: machineId.trim().toUpperCase() } : {}),
  };
  const json = JSON.stringify(payload);
  const payloadHex = strToHex(json).toUpperCase();
  const sig = (await hmacSign(payloadHex, secret)).slice(0, 16).toUpperCase();
  const raw = payloadHex + sig;
  return raw.match(/.{1,4}/g).join('-');
}

// ─── Lisans Doğrulama ────────────────────────────────────────────────────────

/**
 * Girilen lisans anahtarını doğrular.
 * @param {string} rawKey  Kullanıcının girdiği anahtar (tireler/boşluklar dahil)
 * @returns {Promise<{valid, expired?, expiryDate?, schoolNote?, machineId?, daysLeft?, error?}>}
 */
export async function validateLicenseKey(rawKey) {
  try {
    // Sadece tire ve boşlukları temizle, BÜYÜK HARFE çevir (hex büyük harf)
    const clean = rawKey.replace(/[-\s]/g, '').toUpperCase();

    if (clean.length < 20) {
      return { valid: false, error: 'Lisans anahtarı çok kısa.' };
    }

    // Son 16 karakter imza, geri kalanı payload (hex)
    const sig = clean.slice(-16).toLowerCase();
    const payload = clean.slice(0, -16); // büyük harf hex

    // İmzayı doğrula (payload büyük harf hex üzerinden)
    const expectedSig = (await hmacSign(payload, SECRET)).slice(0, 16);
    if (sig !== expectedSig) {
      return { valid: false, error: 'Lisans anahtarı geçersiz veya değiştirilmiş.' };
    }

    // Hex payload'ı JSON'a çevir
    let data;
    try {
      data = JSON.parse(hexToStr(payload));
    } catch {
      return { valid: false, error: 'Lisans anahtarı okunamadı.' };
    }

    if (!data.e || data.e.length !== 8) {
      return { valid: false, error: 'Lisans tarihi bulunamadı.' };
    }

    // Kompakt tarih: "20270712" → "2027-07-12"
    const expiryStr = `${data.e.slice(0, 4)}-${data.e.slice(4, 6)}-${data.e.slice(6, 8)}`;
    const expiryDate = parseExpiryDateLocal(expiryStr);
    if (isNaN(expiryDate.getTime())) {
      return { valid: false, error: 'Lisans tarihi geçersiz.' };
    }

    const daysLeft = getLicenseDaysLeft(expiryStr);
    if (daysLeft < 0) {
      return {
        valid: false,
        expired: true,
        expiryDate: expiryStr,
        schoolNote: data.n || '',
        error: `Lisans süresi ${expiryDate.toLocaleDateString('tr-TR')} tarihinde dolmuştur.`,
      };
    }

    // ─── Makine ID Kontrolü ──────────────────────────────────────────────────
    // "m" alanı varsa bu cihaz için üretilmiş; makine ID'sini karşılaştır
    if (data.m) {
      const currentMachineId = await getMachineId();
      if (!currentMachineId) {
        // Makine ID alınamadıysa uyarı ver ama engelleme
        console.warn('Makine ID alınamadı, kontrol atlanıyor.');
      } else if (data.m.toUpperCase() !== currentMachineId.toUpperCase()) {
        return {
          valid: false,
          error: 'Bu lisans başka bir cihaz için üretilmiştir. Lütfen yazılım sağlayıcınızla iletişime geçin.',
        };
      }
    }
    // "m" alanı yoksa → evrensel lisans, makine kontrolü yapılmaz

    return {
      valid: true,
      expiryDate: expiryStr,
      schoolNote: data.n || '',
      machineId: data.m || null,
      daysLeft,
    };
  } catch {
    return { valid: false, error: 'Lisans doğrulanırken bir hata oluştu.' };
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
