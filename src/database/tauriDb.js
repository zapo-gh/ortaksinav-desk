/**
 * Tauri SQLite Database Adapter
 * Rust-Native SQLite commands wrapper (pansiyon-tauri mimarisi)
 */

import { invoke } from '@tauri-apps/api/core';
import logger from '../utils/logger';
import { TEST_PLAN_NAMES } from '../config/constants';
import { getCurrentSession } from '../services/localAuth';
import { getSharedDb, closeSharedDb, resetDbConnection as resetSharedDbConnection } from './dbConnection';
import { fixPlanRow } from '../utils/mojibakeFix';

function resetDbConnection() {
  resetSharedDbConnection();
  logger.info('✅ SQLite bağlantısı sıfırlandı');
}

async function closeDbConnection() {
  await closeSharedDb();
  logger.info('✅ SQLite bağlantısı kapatıldı');
}

async function getDb() {
  return getSharedDb();
}

async function select(sql, params = []) {
  const db = await getDb();
  return db.select(sql, params);
}

/**
 * execute with retry for "database is locked" (geriye dönük uyumluluk için)
 */
async function execute(sql, params = [], retries = 3) {
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

function isTestPlan(name) {
  const lower = String(name || '').toLowerCase().trim();
  return TEST_PLAN_NAMES.some(t => lower === t || lower.includes(t));
}

function requireUserId() {
  const session = getCurrentSession();
  if (!session?.id) throw new Error('Bu işlem için oturum açmanız gerekiyor.');
  return session.id;
}

// ─── ÖĞRENCİLER (Rust-Native SQLite) ────────────────────────────────

async function saveStudents(students) {
  const userId = requireUserId();
  const list = Array.isArray(students) ? students : [];
  await invoke('save_students', { userId, students: list });
  logger.info('✅ Öğrenciler kaydedildi (Rust-Native SQLite):', list.length);
}

async function getAllStudents() {
  const userId = requireUserId();
  const rows = await invoke('get_all_students', { userId });
  return Array.isArray(rows) ? rows : [];
}

async function batchSaveStudentsFast(students) {
  const userId = requireUserId();
  const list = Array.isArray(students) ? students : [];
  const count = await invoke('batch_save_students_fast', { userId, students: list });
  logger.info('⚡ Toplu hızlı öğrenci kaydı tamamlandı (Rust-Native):', count);
  return count;
}

async function exportStudentsCsv(filepath) {
  const userId = requireUserId();
  const count = await invoke('export_students_csv', { userId, filepath });
  logger.info('⚡ Öğrenciler CSV dosyasına aktarıldı (Rust-Native):', count);
  return count;
}

async function importStudentsCsv(filepath) {
  const userId = requireUserId();
  const count = await invoke('import_students_csv', { userId, filepath });
  logger.info('⚡ CSV dosyası aktarıldı (Rust-Native):', count);
  return count;
}

async function saveTemplateCsv(filepath, content) {
  const res = await invoke('save_template_csv', { filepath, content });
  return res;
}

// ─── SALONLAR (Rust-Native SQLite) ──────────────────────────────────

async function saveSalons(salons) {
  const userId = requireUserId();
  const list = Array.isArray(salons) ? salons : [];
  await invoke('save_salons', { userId, salons: list });
  logger.info('✅ Salonlar kaydedildi (Rust-Native SQLite):', list.length);
}

async function getAllSalons() {
  const userId = requireUserId();
  const rows = await invoke('get_all_salons', { userId });
  return Array.isArray(rows) ? rows : [];
}

// ─── PLANLAR (Rust-Native SQLite) ───────────────────────────────────

async function savePlan(planData) {
  if (isTestPlan(planData?.name)) {
    logger.warn('⚠️ Test planı kaydı engellendi:', planData?.name);
    return null;
  }
  const userId = requireUserId();
  const id = await invoke('save_plan', { userId, planData: planData || {} });
  if (id != null) {
    logger.info('✅ Plan kaydedildi (Rust-Native SQLite):', id);
  }
  return id;
}

async function updatePlan(planId, planData) {
  const userId = requireUserId();
  const id = parseInt(planId, 10);
  if (isNaN(id)) throw new Error('Geçersiz plan ID');
  await invoke('update_plan', { userId, planId: id, planData: planData || {} });
  logger.info('✅ Plan güncellendi (Rust-Native SQLite):', id);
  return id;
}

async function getPlan(planId) {
  const userId = requireUserId();
  const id = parseInt(planId, 10);
  if (isNaN(id)) return null;
  const row = await invoke('get_plan', { userId, planId: id });
  if (!row) return null;
  return fixPlanRow(row);
}

async function loadPlan(planId) {
  const plan = await getPlan(planId);
  if (!plan) throw new Error('Plan bulunamadı: ' + planId);
  return plan;
}

async function getAllPlans() {
  const userId = requireUserId();
  const rows = await invoke('get_all_plans', { userId });
  if (!Array.isArray(rows)) return [];
  return rows.map(r => fixPlanRow(r));
}

async function getLatestPlan() {
  const userId = requireUserId();
  const row = await invoke('get_latest_plan', { userId });
  if (!row) return null;
  return fixPlanRow(row);
}

async function deletePlan(planId) {
  const userId = requireUserId();
  const id = parseInt(planId, 10);
  if (isNaN(id)) throw new Error('Geçersiz plan ID');
  await invoke('delete_plan', { userId, planId: id });
  logger.info('✅ Plan silindi (Rust-Native SQLite):', id);
}

async function archivePlan(planId, archiveMetadata) {
  const userId = requireUserId();
  const id = parseInt(planId, 10);
  if (isNaN(id)) throw new Error('Geçersiz plan ID');
  await invoke('archive_plan', { userId, planId: id, archiveMetadata: archiveMetadata || {} });
  logger.info('✅ Plan arşivlendi (Rust-Native SQLite):', id);
}

async function restorePlan(planId) {
  const userId = requireUserId();
  const id = parseInt(planId, 10);
  if (isNaN(id)) throw new Error('Geçersiz plan ID');
  await invoke('restore_plan', { userId, planId: id });
  logger.info('✅ Plan arşivden çıkarıldı (Rust-Native SQLite):', id);
}

// ─── AYARLAR (Rust-Native SQLite) ───────────────────────────────────

async function saveSettings(settings) {
  if (!settings) return;
  const userId = requireUserId();
  await invoke('save_settings', { userId, settings });
  logger.info('✅ Ayarlar kaydedildi (Rust-Native SQLite)');
}

async function getSettings() {
  const userId = requireUserId();
  return (await invoke('get_settings', { userId })) || {};
}

async function saveSetting(key, value) {
  const userId = requireUserId();
  await invoke('save_setting', { userId, key, value: value ?? null });
}

async function getSetting(key) {
  const userId = requireUserId();
  return await invoke('get_setting', { userId, key });
}

// ─── GEÇİCİ VERİ (Rust-Native SQLite) ───────────────────────────────

async function saveTempData(key, value, _type = 'json', expiresInHours = 24) {
  await invoke('save_temp_data', { key, value: value ?? null, expiresInHours });
}

async function getTempData(key) {
  return await invoke('get_temp_data', { key });
}

// ─── İSTATİSTİK & TEMİZLEME (Rust-Native SQLite) ────────────────────

async function getDatabaseStats() {
  try {
    const userId = requireUserId();
    return await invoke('get_database_stats', { userId });
  } catch (error) {
    logger.error('❌ İstatistik hatası:', error);
    return null;
  }
}

async function clearDatabase() {
  const userId = requireUserId();
  await invoke('clear_database', { userId });
  logger.info('✅ Veritabanı temizlendi (Rust-Native SQLite)');
}

async function clearAutoPlans() {
  const userId = requireUserId();
  await invoke('clear_auto_plans', { userId });
  logger.info('✅ Otomatik kayıt planları temizlendi (Rust-Native SQLite)');
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

const tauriDb = {
  savePlan, updatePlan, archivePlan, restorePlan, loadPlan, getPlan, getAllPlans, getLatestPlan, deletePlan,
  saveStudents, getAllStudents, batchSaveStudentsFast, exportStudentsCsv, importStudentsCsv, saveTemplateCsv,
  saveSalons, getAllSalons,
  saveSettings, getSettings, saveSetting, getSetting,
  saveTempData, getTempData,
  getDatabaseStats, clearDatabase, clearAutoPlans,
  resetDbConnection, closeDbConnection,
  execute,
  setWriteAccess: () => {}, setDatabaseType: () => {}, getDatabaseType: () => 'SQLite',
};

export default tauriDb;
export {
  batchSaveStudentsFast, exportStudentsCsv, importStudentsCsv, saveTemplateCsv,
};