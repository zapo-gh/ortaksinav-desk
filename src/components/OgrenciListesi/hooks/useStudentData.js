import { useRef, useCallback, useEffect } from 'react';
import { useExamStore } from '../../../store/useExamStore';
import { useNotifications } from '../../NotificationSystem';

export const useStudentData = () => {
  const setOgrenciler = useExamStore(s => s.setOgrenciler);
  const clearOgrenciler = useExamStore(s => s.clearOgrenciler);
  const ogrenciler = useExamStore(s => s.ogrenciler);
  const { showError } = useNotifications();

  // Öğrenciler yükle
  const ogrencilerYukle = useCallback(async (yeniOgrenciler) => {
    try {
      const db = await import('../../../database/tauriDb');
      if (db.default.batchSaveStudentsFast) {
        await db.default.batchSaveStudentsFast(yeniOgrenciler);
      } else {
        await db.default.saveStudents(yeniOgrenciler);
      }
      setOgrenciler(yeniOgrenciler);
    } catch (error) {
      showError('Öğrenciler kaydedilemedi: ' + error.message);
      throw error;
    }
  }, [setOgrenciler, showError]);

  // Öğrencileri temizle
  const ogrencileriTemizle = useCallback(async () => {
    try {
      const db = await import('../../../database/tauriDb');
      if (db.default.batchSaveStudentsFast) {
        await db.default.batchSaveStudentsFast([]);
      } else {
        await db.default.saveStudents([]);
      }
      clearOgrenciler();
    } catch (error) {
      showError('Öğrenciler temizlenemedi: ' + error.message);
      throw error;
    }
  }, [clearOgrenciler, showError]);

  // Debounced save
  const dbSaveTimerRef = useRef(null);
  const pendingDbStudentsRef = useRef(null);

  const saveStudentsToDb = useCallback(async (yeniOgrenciler) => {
    const db = await import('../../../database/tauriDb');
    if (db.default.batchSaveStudentsFast) {
      await db.default.batchSaveStudentsFast(yeniOgrenciler);
    } else {
      await db.default.saveStudents(yeniOgrenciler);
    }
  }, []);

  const scheduleDbSave = useCallback((yeniOgrenciler) => {
    pendingDbStudentsRef.current = yeniOgrenciler;

    if (dbSaveTimerRef.current) {
      clearTimeout(dbSaveTimerRef.current);
    }

    dbSaveTimerRef.current = setTimeout(() => {
      const toSave = pendingDbStudentsRef.current;
      pendingDbStudentsRef.current = null;
      dbSaveTimerRef.current = null;

      if (toSave) {
        saveStudentsToDb(toSave).catch(err => {
          showError('Öğrenci DB güncelleme hatası: ' + err.message);
        });
      }
    }, 500);
  }, [saveStudentsToDb, showError]);

  useEffect(() => {
    return () => {
      if (dbSaveTimerRef.current) clearTimeout(dbSaveTimerRef.current);
    };
  }, []);

  const handleOgrenciGuncelle = useCallback((id, field, value) => {
    const updated = ogrenciler.map(o => o.id === id ? { ...o, [field]: value } : o);

    // 1) UI hemen güncellenir
    setOgrenciler(updated);

    // 2) DB yazma debounce'lanır
    scheduleDbSave(updated);
  }, [ogrenciler, setOgrenciler, scheduleDbSave]);

  return {
    ogrencilerYukle,
    ogrencileriTemizle,
    handleOgrenciGuncelle
  };
};
