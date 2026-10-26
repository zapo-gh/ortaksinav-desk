import { invoke } from '@tauri-apps/api/core';

/**
 * SQLite erişim katmanı.
 * Tüm sorgular Rust tarafındaki TEK bağlantı üzerinden (sql_select / sql_execute) çalışır;
 * böylece plan/öğrenci komutlarıyla aynı dosyaya ikinci bir bağlantı açılmaz.
 * Dönen nesne eski plugin API'siyle (select/execute/close) uyumludur.
 */
const sharedDb = {
  select: (sql, params = []) => invoke('sql_select', { sql, params }),
  execute: (sql, params = []) => invoke('sql_execute', { sql, params }),
  // Bağlantı Rust tarafında yönetilir; JS'den kapatılacak bir şey yok.
  close: async () => true,
};

export async function getSharedDb() {
  return sharedDb;
}

export async function closeSharedDb() {
  return true;
}

/**
 * Geri yüklemeden sonra çağrılır. Bağlantıyı Rust (import_db_backup) yeniden açtığı için
 * JS tarafında sıfırlanacak önbellek yoktur; eski çağrılarla uyumluluk için korunur.
 */
export function resetDbConnection() {}
