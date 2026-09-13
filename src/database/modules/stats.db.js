import { invoke } from '@tauri-apps/api/core';
import logger from '../../utils/logger';
import { requireUserId } from '../utils/dbUtils';

export async function getDatabaseStats() {
  try {
    const userId = requireUserId();
    return await invoke('get_database_stats', { userId });
  } catch (error) {
    logger.error('❌ İstatistik hatası:', error);
    return null;
  }
}

export async function clearDatabase() {
  const userId = requireUserId();
  await invoke('clear_database', { userId });
  logger.info('✅ Veritabanı temizlendi (Rust-Native SQLite)');
}

export async function clearAutoPlans() {
  const userId = requireUserId();
  await invoke('clear_auto_plans', { userId });
  logger.info('✅ Otomatik kayıt planları temizlendi (Rust-Native SQLite)');
}
