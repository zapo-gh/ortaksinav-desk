import { invoke } from '@tauri-apps/api/core';

export async function saveTempData(key, value, _type = 'json', expiresInHours = 24) {
  await invoke('save_temp_data', { key, value: value ?? null, expiresInHours });
}

export async function getTempData(key) {
  return await invoke('get_temp_data', { key });
}
