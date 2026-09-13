/**
 * Tauri SQLite Database Adapter
 * Rust-Native SQLite commands wrapper (pansiyon-tauri mimarisi)
 * Refactored into modules for Phase 4.
 */

import logger from '../utils/logger';
import { getSharedDb, closeSharedDb, resetDbConnection as resetSharedDbConnection } from './dbConnection';

// Import all domain modules
import * as studentsDb from './modules/students.db';
import * as salonsDb from './modules/salons.db';
import * as plansDb from './modules/plans.db';
import * as settingsDb from './modules/settings.db';
import * as statsDb from './modules/stats.db';
import * as tempDb from './modules/temp.db';

export function resetDbConnection() {
  resetSharedDbConnection();
  logger.info('✅ SQLite bağlantısı sıfırlandı');
}

export async function closeDbConnection() {
  await closeSharedDb();
  logger.info('✅ SQLite bağlantısı kapatıldı');
}

async function getDb() {
  return getSharedDb();
}

export async function select(sql, params = []) {
  const db = await getDb();
  return db.select(sql, params);
}

/**
 * execute with retry for "database is locked" (geriye dönük uyumluluk için)
 */
export async function execute(sql, params = [], retries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const db = await getDb();
      return await db.execute(sql, params);
    } catch (error) {
      lastError = error;
      if (error?.message?.includes('database is locked') && attempt < retries) {
        await new Promise(r => setTimeout(r, 200 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

const tauriDb = {
  ...studentsDb,
  ...salonsDb,
  ...plansDb,
  ...settingsDb,
  ...statsDb,
  ...tempDb,
  resetDbConnection,
  closeDbConnection,
  execute,
  setWriteAccess: () => {},
  setDatabaseType: () => {},
  getDatabaseType: () => 'SQLite',
};

export default tauriDb;

// Export specifically named exports for backward compatibility if imported directly
export const {
  batchSaveStudentsFast,
  exportStudentsCsv,
  importStudentsCsv,
  saveTemplateCsv,
} = studentsDb;