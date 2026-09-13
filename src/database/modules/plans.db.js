import { invoke } from '@tauri-apps/api/core';
import logger from '../../utils/logger';
import { requireUserId, isTestPlan } from '../utils/dbUtils';
import { fixPlanRow } from '../../utils/mojibakeFix';

export async function savePlan(planData) {
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

export async function updatePlan(planId, planData) {
  const userId = requireUserId();
  const id = parseInt(planId, 10);
  if (isNaN(id)) throw new Error('Geçersiz plan ID');
  await invoke('update_plan', { userId, planId: id, planData: planData || {} });
  logger.info('✅ Plan güncellendi (Rust-Native SQLite):', id);
  return id;
}

export async function getPlan(planId) {
  const userId = requireUserId();
  const id = parseInt(planId, 10);
  if (isNaN(id)) return null;
  const row = await invoke('get_plan', { userId, planId: id });
  if (!row) return null;
  return fixPlanRow(row);
}

export async function loadPlan(planId) {
  const plan = await getPlan(planId);
  if (!plan) throw new Error('Plan bulunamadı: ' + planId);
  return plan;
}

export async function getAllPlans() {
  const userId = requireUserId();
  const rows = await invoke('get_all_plans', { userId });
  if (!Array.isArray(rows)) return [];
  return rows.map(r => fixPlanRow(r));
}

export async function getLatestPlan() {
  const userId = requireUserId();
  const row = await invoke('get_latest_plan', { userId });
  if (!row) return null;
  return fixPlanRow(row);
}

export async function deletePlan(planId) {
  const userId = requireUserId();
  const id = parseInt(planId, 10);
  if (isNaN(id)) throw new Error('Geçersiz plan ID');
  await invoke('delete_plan', { userId, planId: id });
  logger.info('✅ Plan silindi (Rust-Native SQLite):', id);
}

export async function archivePlan(planId, archiveMetadata) {
  const userId = requireUserId();
  const id = parseInt(planId, 10);
  if (isNaN(id)) throw new Error('Geçersiz plan ID');
  await invoke('archive_plan', { userId, planId: id, archiveMetadata: archiveMetadata || {} });
  logger.info('✅ Plan arşivlendi (Rust-Native SQLite):', id);
}

export async function restorePlan(planId) {
  const userId = requireUserId();
  const id = parseInt(planId, 10);
  if (isNaN(id)) throw new Error('Geçersiz plan ID');
  await invoke('restore_plan', { userId, planId: id });
  logger.info('✅ Plan arşivden çıkarıldı (Rust-Native SQLite):', id);
}
