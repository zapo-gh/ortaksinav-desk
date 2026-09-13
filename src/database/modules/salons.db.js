import { invoke } from '@tauri-apps/api/core';
import logger from '../../utils/logger';
import { requireUserId } from '../utils/dbUtils';

export async function saveSalons(salons) {
  const userId = requireUserId();
  const list = Array.isArray(salons) ? salons : [];
  await invoke('save_salons', { userId, salons: list });
  logger.info('✅ Salonlar kaydedildi (Rust-Native SQLite):', list.length);
}

export async function getAllSalons() {
  const userId = requireUserId();
  const rows = await invoke('get_all_salons', { userId });
  return Array.isArray(rows) ? rows : [];
}
