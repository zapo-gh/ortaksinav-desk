/**
 * Yerel Kimlik Doğrulama Servisi
 * - Kullanıcılar SQLite'ta saklanır (users tablosu)
 * - Şifreler PBKDF2/SHA-256 ile hashlenir (Web Crypto API)
 * - Oturum SQLite sessions tablosunda saklanır (localStorage/sessionStorage kullanılmaz)
 */

import logger from '../utils/logger';

const DB_URL = 'sqlite:kelebek.db';

// ─── Super Admin sabitleri ────────────────────────────────────────────────────

export const SUPER_ADMIN_EMAIL = 'zaferkulte@gmail.com';

export function isSuperAdmin(session) {
  return (session?.username || '').toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

// ─── Şifre Hashleme (Web Crypto API) ─────────────────────────────────────────

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const saltBuffer = saltHex ? hexToBuffer(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const hashBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return {
    hash: bufferToHex(hashBits),
    salt: bufferToHex(saltBuffer),
  };
}

// ─── SQLite Yardımcıları ───────────────────────────────────────────────────────

import { getSharedDb } from '../database/dbConnection';

async function getDb() {
  return getSharedDb();
}

async function dbSelect(sql, params = []) {
  const db = await getDb();
  return db.select(sql, params);
}

async function dbExecute(sql, params = []) {
  const db = await getDb();
  return db.execute(sql, params);
}

// ─── Oturum (Session) ────────────────────────────────────────────────────────

let _currentSession = null;

async function saveSession(user, rememberMe = false) {
  _currentSession = user;
  try {
    logger.debug('[localAuth.saveSession] rememberMe=', rememberMe, 'user=', user?.username);

    await dbExecute('DELETE FROM sessions', []);
    if (user) {
      const permanentVal = rememberMe ? 1 : 0;

      await dbExecute(
        'INSERT INTO sessions (user_id, username, display_name, permanent) VALUES (?, ?, ?, ?)',
        [user.id, user.username, user.displayName || '', permanentVal]
      );

      // Debug: insert sonrası permanent değerini doğrula
      const rows = await dbSelect('SELECT permanent FROM sessions ORDER BY id DESC LIMIT 1', []);
      logger.debug('[localAuth.saveSession] inserted permanent=',
        rows[0]?.permanent,
        '(expected=', permanentVal, ')'
      );
    }
  } catch (e) {
    logger.error('[saveSession]', e);
  }
}

/**
 * Uygulama açılışında oturumu SQLite'tan yükler.
 * Kalıcı olmayan oturumlar temizlenir (beni hatırla işaretli değilse).
 */
export async function initAuth() {
  try {
    // Debug: açılışta mevcut session'ı gör
    const before = await dbSelect('SELECT * FROM sessions ORDER BY id DESC LIMIT 1', []);
    logger.debug('[localAuth.initAuth] before cleanup rows=', before.length ? before[0] : null);

    // Kalıcı olmayan oturumları temizle (uygulama yeniden açıldı)
    await dbExecute('DELETE FROM sessions WHERE permanent = 0', []);
    const rows = await dbSelect('SELECT * FROM sessions ORDER BY id DESC LIMIT 1', []);
    logger.debug('[localAuth.initAuth] after cleanup rows=', rows.length ? rows[0] : null);

    if (rows.length > 0) {
      const row = rows[0];
      _currentSession = { id: String(row.user_id), username: row.username, displayName: row.display_name || '' };
    }
  } catch (e) {
    logger.error('[initAuth]', e);
  }
  return _currentSession;
}

export function getCurrentSession() {
  return _currentSession;
}

// ─── Auth Operasyonları ───────────────────────────────────────────────────────

/**
 * Yeni kullanıcı kaydı
 */
export async function register(username, password, displayName = '') {
  const trimmedUsername = (username || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedUsername || !emailRegex.test(trimmedUsername)) {
    throw new Error('Geçerli bir e-posta adresi giriniz.');
  }
  if (trimmedUsername === SUPER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Bu e-posta adresi kullanılamaz.');
  }
  if (!password || password.length < 6) {
    throw new Error('Şifre en az 6 karakter olmalıdır.');
  }

  // E-posta mevcut mu?
  const existing = await dbSelect(
    'SELECT id FROM users WHERE username = ?',
    [trimmedUsername]
  );
  if (existing.length > 0) {
    throw new Error('Bu e-posta adresi zaten kayıtlı.');
  }

  const { hash, salt } = await hashPassword(password);
  await dbExecute(
    'INSERT INTO users (username, display_name, password_hash, salt) VALUES (?, ?, ?, ?)',
    [trimmedUsername, displayName || trimmedUsername, hash, salt]
  );

  const rows = await dbSelect('SELECT * FROM users WHERE username = ?', [trimmedUsername]);
  const user = rows[0];
  const session = { id: String(user.id), username: user.username, displayName: user.display_name };
  await saveSession(session);
  return session;
}

/**
 * Giriş yap
 */
export async function login(username, password, rememberMe = false) {
  const trimmedUsername = (username || '').trim().toLowerCase();
  if (!trimmedUsername || !password) {
    throw new Error('Kullanıcı adı ve şifre zorunludur.');
  }

  // Super admin girişinde hesabı garantile (DB ilk açılışta hazır olmayabilir)
  if (trimmedUsername === SUPER_ADMIN_EMAIL.toLowerCase()) {
    await ensureSuperAdmin();
  }

  const rows = await dbSelect(
    'SELECT * FROM users WHERE username = ?',
    [trimmedUsername]
  );
  if (rows.length === 0) {
    throw new Error('Kullanıcı adı veya şifre hatalı.');
  }

  const user = rows[0];
  const { hash } = await hashPassword(password, user.salt);

  if (hash !== user.password_hash) {
    throw new Error('Kullanıcı adı veya şifre hatalı.');
  }

  const session = { id: String(user.id), username: user.username, displayName: user.display_name };
  await saveSession(session, rememberMe);
  return session;
}
export async function logout() {
  await saveSession(null);
}

/**
 * Kullanıcı sayısını getir (ilk kurulumda 0 ise kayıt zorunlu)
 */
export async function getUserCount() {
  try {
    const rows = await dbSelect('SELECT COUNT(*) as cnt FROM users');
    return rows[0]?.cnt ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Uygulama başlarken super admin hesabı yoksa oluşturur.
 * PERFORMANS: PBKDF2 sadece hesap yoksa çalıştırılır.
 */
export async function ensureSuperAdmin() {
  const SUPER_ADMIN_PASS = '130691ydz';
  try {
    // Önce mevcut mu kontrol et
    const existing = await dbSelect('SELECT id, display_name FROM users WHERE username = ?', [SUPER_ADMIN_EMAIL]);

    if (existing.length === 0) {
      logger.info('👷 Super Admin hesabı oluşturuluyor...');
      const { hash, salt } = await hashPassword(SUPER_ADMIN_PASS);
      await dbExecute(
        'INSERT INTO users (username, display_name, password_hash, salt) VALUES (?, ?, ?, ?)',
        [SUPER_ADMIN_EMAIL, 'Sistem Yöneticisi', hash, salt]
      );
      return;
    }

    // Hesap varsa ve adı farklıysa güncelle (CPU yoğunluklu hashlemeye girme)
    if (existing[0].display_name !== 'Sistem Yöneticisi') {
      await dbExecute(
        'UPDATE users SET display_name = ? WHERE username = ?',
        ['Sistem Yöneticisi', SUPER_ADMIN_EMAIL]
      );
    }
  } catch (e) {
    logger.error('[ensureSuperAdmin]', e);
  }
}
