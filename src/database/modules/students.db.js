import { invoke } from '@tauri-apps/api/core';
import logger from '../../utils/logger';
import { requireUserId } from '../utils/dbUtils';

export async function saveStudents(students) {
  const userId = requireUserId();
  const list = Array.isArray(students) ? students : [];
  await invoke('save_students', { userId, students: list });
  logger.info('✅ Öğrenciler kaydedildi (Rust-Native SQLite):', list.length);
}

export async function getAllStudents() {
  const userId = requireUserId();
  const rows = await invoke('get_all_students', { userId });
  return Array.isArray(rows) ? rows : [];
}

export async function batchSaveStudentsFast(students) {
  const userId = requireUserId();
  const list = Array.isArray(students) ? students : [];
  const count = await invoke('batch_save_students_fast', { userId, students: list });
  logger.info('⚡ Toplu hızlı öğrenci kaydı tamamlandı (Rust-Native):', count);
  return count;
}

export async function exportStudentsCsv(filepath) {
  const userId = requireUserId();
  const count = await invoke('export_students_csv', { userId, filepath });
  logger.info('⚡ Öğrenciler CSV dosyasına aktarıldı (Rust-Native):', count);
  return count;
}

export async function importStudentsCsv(filepath) {
  const userId = requireUserId();
  const count = await invoke('import_students_csv', { userId, filepath });
  logger.info('⚡ CSV dosyası aktarıldı (Rust-Native):', count);
  return count;
}

export async function saveTemplateCsv(filepath, content) {
  const res = await invoke('save_template_csv', { filepath, content });
  return res;
}
