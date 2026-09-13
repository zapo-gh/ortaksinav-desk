import { invoke } from '@tauri-apps/api/core';
import logger from '../../utils/logger';
import { requireUserId } from '../utils/dbUtils';

export async function saveSettings(settings) {
  if (!settings) return;
  const userId = requireUserId();
  await invoke('save_settings', { userId, settings });
  logger.info('✅ Ayarlar kaydedildi (Rust-Native SQLite)');
}

export async function getSettings() {
  const userId = requireUserId();
  return (await invoke('get_settings', { userId })) || {};
}

export async function saveSetting(key, value) {
  const userId = requireUserId();
  await invoke('save_setting', { userId, key, value: value ?? null });
}

export async function getSetting(key) {
  const userId = requireUserId();
  return await invoke('get_setting', { userId, key });
}
