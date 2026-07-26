/**
 * Database Entry Point - Tauri SQLite Adapter
 * 
 * Eski Firestore + IndexedDB ikili yapısı tamamen kaldırıldı.
 * Tüm veriler %APPDATA%\com.kelebek.sinavsistemi\kelebek.db SQLite dosyasında saklanır.
 */
import tauriDb from './tauriDb';

export default tauriDb;
