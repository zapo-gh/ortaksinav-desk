import Database from '@tauri-apps/plugin-sql';

const DB_URL = 'sqlite:kelebek.db';
let _dbInstance = null;
let _connectionPromise = null;

/**
 * Singleton Database Manager
 * Uygulama genelinde tek bir SQLite bağlantısı sağlar.
 */
export async function getSharedDb() {
  if (_dbInstance) return _dbInstance;
  
  if (_connectionPromise) return _connectionPromise;

  _connectionPromise = (async () => {
    try {
      console.time('⏱ Database.load');
      _dbInstance = await Database.load(DB_URL);
      console.timeEnd('⏱ Database.load');
      console.log('✅ Merkezi SQLite bağlantısı kuruldu');
      return _dbInstance;
    } catch (error) {
      _connectionPromise = null;
      console.error('❌ SQLite bağlantı hatası:', error);
      throw error;
    }
  })();

  return _connectionPromise;
}

export async function closeSharedDb() {
  if (_dbInstance) {
    await _dbInstance.close();
    _dbInstance = null;
    _connectionPromise = null;
  }
}

/**
 * SQLite bağlantısını (cache) resetler.
 * DB dosyası değiştiğinde çağrılmalıdır.
 */
export function resetDbConnection() {
  // Singleton instance'ı sıfırla
  _dbInstance = null;
  _connectionPromise = null;
  console.log('🔄 Database bağlantısı sıfırlandı');
}
