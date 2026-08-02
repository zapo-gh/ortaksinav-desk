import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import logger from '../utils/logger';
import {
  waitForAuth,
  getUserRole,
  clearCachedRole,
  subscribeToAuthChanges,
  signInWithEmail,
  signOutUser
} from '../auth/authState';
import { useStudentsQuery, useSalonsQuery, useSettingsQuery } from '../hooks/queries/useExamData';
import db from '../database';
import { useQueryClient } from '@tanstack/react-query';
import { useExamStore } from '../store/useExamStore';

const mapAuthUser = (user) => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    isAnonymous: !!user.isAnonymous
  };
};

// Context
const ExamContext = createContext();

// Provider Component
export const ExamProvider = ({ children }) => {
  // 1. State Selectors (Selective subscriptions)
  const ogrenciler = useExamStore(s => s.ogrenciler);
  const ayarlar = useExamStore(s => s.ayarlar);
  const salonlar = useExamStore(s => s.salonlar);
  const yerlestirmeSonucu = useExamStore(s => s.yerlestirmeSonucu);
  const placementIndex = useExamStore(s => s.placementIndex);
  const aktifTab = useExamStore(s => s.aktifTab);
  const yukleme = useExamStore(s => s.yukleme);
  const hata = useExamStore(s => s.hata);
  const role = useExamStore(s => s.role);
  const authUser = useExamStore(s => s.authUser);

  // 2. Action Selectors (STABLE REFERENCES)
  const setOgrenciler = useExamStore(s => s.setOgrenciler);
  const addOgrenciler = useExamStore(s => s.addOgrenciler);
  const toggleOgrenciSec = useExamStore(s => s.toggleOgrenciSec);
  const clearSeciliOgrenciler = useExamStore(s => s.clearSeciliOgrenciler);
  const deleteOgrenci = useExamStore(s => s.deleteOgrenci);
  const clearOgrenciler = useExamStore(s => s.clearOgrenciler);
  const setSiniflar = useExamStore(s => s.setSiniflar);
  const setSeciliSinif = useExamStore(s => s.setSeciliSinif);
  const setSalonlar = useExamStore(s => s.setSalonlar);
  const addSalon = useExamStore(s => s.addSalon);
  const deleteSalon = useExamStore(s => s.deleteSalon);
  const updateAyarlar = useExamStore(s => s.updateAyarlar);
  const setYerlestirmeSonucu = useExamStore(s => s.setYerlestirmeSonucu);
  const updateYerlestirmeSonucu = useExamStore(s => s.updateYerlestirmeSonucu);
  const clearYerlestirme = useExamStore(s => s.clearYerlestirme);
  const setAktifTab = useExamStore(s => s.setAktifTab);
  const startLoading = useExamStore(s => s.startLoading);
  const stopLoading = useExamStore(s => s.stopLoading);
  const setHata = useExamStore(s => s.setHata);
  const clearHata = useExamStore(s => s.clearHata);
  const pinOgrenci = useExamStore(s => s.pinOgrenci);
  const unpinOgrenci = useExamStore(s => s.unpinOgrenci);
  const setAuthUser = useExamStore(s => s.setAuthUser);
  const setRoleAction = useExamStore(s => s.setRole);

  const [isInitialized, setIsInitialized] = React.useState(false);
  const [localDataLoaded, setLocalDataLoaded] = React.useState(false);
  const prevAuthUserRef = React.useRef(null);
  const initialSyncRef = React.useRef({ students: false, salons: false, settings: false });

  // React Query Hooks
  const { data: studentsData, isLoading: studentsLoading } = useStudentsQuery();
  const { data: salonsData, isLoading: salonsLoading } = useSalonsQuery();
  const { data: settingsData, isLoading: settingsLoading } = useSettingsQuery();

  const isWriteAllowed = React.useMemo(() => {
    logger.debug('ğŸ” isWriteAllowed check:', { role, isWriteAllowed: role === 'admin' });
    return role === 'admin';
  }, [role]);

  // Uygulama açılışında SQLite'dan verileri yükle (useQuery enabled:false olduğu için manuel)
  useEffect(() => {
    let cancelled = false;
    async function loadLocalData() {
      try {
        const [students, salons, settings] = await Promise.all([
          db.getAllStudents(),
          db.getAllSalons(),
          db.getSettings()
        ]);
        if (cancelled) return;
        if (students && students.length > 0) {
          setOgrenciler(students);
        }
        if (salons && salons.length > 0) {
          setSalonlar(salons);
        }
        if (settings && Object.keys(settings).length > 0) {
          updateAyarlar(settings);
        }
        setLocalDataLoaded(true);
        logger.info('âœ… Yerel veriler SQLite\'tan yüklendi:', { students: students?.length, salons: salons?.length, settings: Object.keys(settings || {}).length });
      } catch (error) {
        logger.error('âŒ Yerel veri yükleme hatası:', error);
        setLocalDataLoaded(true);
      }
    }
    loadLocalData();
    return () => { cancelled = true; };
  }, [setOgrenciler, setSalonlar, updateAyarlar]);

  // Initial data loading from database - Server First Strategy

  // Öğrenciler: İlk yüklemede sunucu verisi varsa store'u güncelle (yerel veriyi ez)
  useEffect(() => {
    const shouldSync = !initialSyncRef.current.students && studentsData && studentsData.length > 0 && !studentsLoading;

    if (shouldSync) {
      logger.info('ğŸ“¥ ExamContext: İlk yükleme - Sunucudan öğrenciler senkronize ediliyor (Server First)...', studentsData.length);
      setOgrenciler(studentsData);
      initialSyncRef.current.students = true;
    }
    // shouldPopulateEmpty kaldırıldı - kullanıcı öğrencileri silerse geri yüklememesin
  }, [studentsData, studentsLoading, setOgrenciler]);

  // Salonlar: İlk yüklemede sunucu verisi varsa store'u güncelle
  useEffect(() => {
    const shouldSync = !initialSyncRef.current.salons && salonsData && salonsData.length > 0 && !salonsLoading;

    if (shouldSync) {
      logger.info('ğŸ“¥ ExamContext: İlk yükleme - Sunucudan salonlar senkronize ediliyor (Server First)...', salonsData.length);
      setSalonlar(salonsData);
      initialSyncRef.current.salons = true;
    }
    // shouldPopulateEmpty kaldırıldı - tutarlılık için öğrencilerle aynı mantık
  }, [salonsData, salonsLoading, setSalonlar]);

  // Salonlar değiştiğinde SQLite'a kaydet (debounce ile)
  useEffect(() => {
    if (!localDataLoaded || !isWriteAllowed) return;

    const timeoutId = setTimeout(async () => {
      try {
        if (salonlar && salonlar.length > 0) {
          await db.saveSalons(salonlar);
          logger.info('âœ… Salonlar SQLite\'a kaydedildi:', salonlar.length);
        }
      } catch (error) {
        logger.error('âŒ Salonlar SQLite\'a kaydedilemedi:', error);
      }
    }, 1000); // 1 saniye debounce

    return () => clearTimeout(timeoutId);
  }, [salonlar, localDataLoaded, isWriteAllowed]);

  // Ayarlar: İlk yüklemede sunucu verisi varsa store'u güncelle
  useEffect(() => {
    const hasData = settingsData && Object.keys(settingsData).length > 0;
    const shouldSync = !initialSyncRef.current.settings && hasData && !settingsLoading;

    if (shouldSync) {
      logger.info('ğŸ“¥ ExamContext: İlk yükleme - Sunucudan ayarlar senkronize ediliyor (Server First)...');
      updateAyarlar(settingsData);
      initialSyncRef.current.settings = true;
    }
    // shouldPopulateEmpty kaldırıldı - tutarlılık için öğrencilerle aynı mantık
  }, [settingsData, settingsLoading, updateAyarlar]);

  // Yükleme durumu - query'ler disabled olduğu için direkt durdur
  useEffect(() => {
    if (yukleme) {
      stopLoading();
    }
  }, [yukleme, stopLoading]);

  const queryClient = useQueryClient();

  const refreshFromFirestore = React.useCallback(
    async ({ showLoading = true } = {}) => {
      if (showLoading) {
        startLoading();
      }
      try {
        const [students, salons, settings, user, newRole] = await Promise.all([
          db.getAllStudents(),
          db.getAllSalons(),
          db.getSettings(),
          waitForAuth(),
          getUserRole()
        ]);

        setOgrenciler(Array.isArray(students) ? students : []);
        setSalonlar(Array.isArray(salons) ? salons : []);
        updateAyarlar(settings && typeof settings === 'object' ? settings : {});

        queryClient.setQueryData(['students'], Array.isArray(students) ? students : []);
        queryClient.setQueryData(['salons'], Array.isArray(salons) ? salons : []);
        queryClient.setQueryData(['settings'], settings && typeof settings === 'object' ? settings : {});

        setAuthUser(mapAuthUser(user));
        setRoleAction(newRole || 'public');

        return { success: true };
      } catch (error) {
        logger.error('âŒ refreshFromFirestore: Veri yenilenemedi:', error);
        return { success: false, error };
      } finally {
        if (showLoading) {
          stopLoading();
        }
      }
    },
    [
      startLoading,
      stopLoading,
      setAuthUser,
      setRoleAction,
      setOgrenciler,
      setSalonlar,
      updateAyarlar,
      queryClient
    ]
  );

  const login = React.useCallback(
    async (username, password, rememberMe = false) => {
      try {
        const trimmed = (username || '').trim();
        if (!trimmed || !password) {
          throw new Error('Kullanıcı adı ve şifre zorunludur.');
        }
        const session = await signInWithEmail(trimmed, password, rememberMe);
        clearCachedRole();
        prevAuthUserRef.current = null;
        initialSyncRef.current = { students: false, salons: false, settings: false }; // Sync ref'ini sıfırla
        setRoleAction('admin');
        setAuthUser({ uid: session.id, email: session.username, displayName: session.displayName });
        return { success: true };
      } catch (error) {
        logger.error('âŒ Giriş denemesi başarısız:', error);
        return { success: false, error };
      }
    },
    [setAuthUser, setRoleAction]
  );

  const logout = React.useCallback(async () => {
    try {
      await signOutUser();
      clearCachedRole();
      prevAuthUserRef.current = null;
      initialSyncRef.current = { students: false, salons: false, settings: false }; // Sync ref'ini sıfırla
      setAuthUser(null);
      setRoleAction('public');
      return { success: true };
    } catch (error) {
      logger.error('âŒ Çıkış işlemi başarısız:', error);
      return { success: false, error };
    }
  }, [setAuthUser, setRoleAction]);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      const userId = user?.uid || null;
      const prevUserId = prevAuthUserRef.current;
      prevAuthUserRef.current = userId;

      setAuthUser(mapAuthUser(user));

      if (!userId) {
        setRoleAction('public');
        return;
      }

      const currentRole = await getUserRole();
      setRoleAction(currentRole);

      // Başlangıçta refreshFromFirestore çağrma - sadece sonradan auth değişirse
      if (isInitialized && userId !== prevUserId && prevUserId !== null) {
        await refreshFromFirestore({ showLoading: false });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isInitialized, refreshFromFirestore, setAuthUser, setRoleAction]);

  // Legacy Action Bridge - Memoized for stability
  const actionsList = useMemo(() => ({
    ogrencilerYukle: async (yeniOgrenciler) => {
      try {
        await db.saveStudents(yeniOgrenciler);
        logger.info('âœ… Öğrenciler SQLite\'a kaydedildi');
        // Her durumda local state'i güncelle (offline çalışma desteği)
        setOgrenciler(yeniOgrenciler);
        return { success: true };
      } catch (error) {
        logger.error('âŒ Öğrenciler kaydedilemedi:', error);
        // Veritabanı hatası olsa bile local state'i güncelle (kullanıcı çalışmaya devam edebilsin)
        setOgrenciler(yeniOgrenciler);
        setHata(`Öğrenciler kaydedilirken hata oluştu: ${error.message}. Değişiklikler geçici olarak kaydedildi.`);
        throw error;
      }
    },
    ogrencilerEkle: addOgrenciler,
    ogrenciSec: toggleOgrenciSec,
    ogrenciSecimiTemizle: clearSeciliOgrenciler,
    ogrenciSil: deleteOgrenci,
    ogrencileriTemizle: async () => {
      try {
        await db.saveStudents([]);
        logger.info('âœ… Tüm öğrenciler veritabanından silindi');
        clearOgrenciler();
        await queryClient.invalidateQueries(['students']);
        return { success: true };
      } catch (error) {
        logger.error('âŒ Öğrenciler silinemedi:', error);
        throw error;
      }
    },
    siniflarYukle: setSiniflar,
    sinifSec: setSeciliSinif,
    salonlarGuncelle: async (yeniSalonlar) => {
      setSalonlar(yeniSalonlar);
      try {
        await db.saveSalons(yeniSalonlar);
        logger.info('âœ… Salonlar SQLite\'a kaydedildi:', yeniSalonlar.length);
      } catch (error) {
        logger.error('âŒ Salonlar SQLite\'a kaydedilemedi:', error);
      }
    },
    salonEkle: addSalon,
    salonSil: deleteSalon,
    ayarlarGuncelle: updateAyarlar,
    yerlestirmeYap: setYerlestirmeSonucu,
    yerlestirmeGuncelle: updateYerlestirmeSonucu,
    yerlestirmeTemizle: clearYerlestirme,
    tabDegistir: setAktifTab,
    yuklemeBaslat: startLoading,
    yuklemeBitir: stopLoading,
    hataAyarla: setHata,
    hataTemizle: clearHata,
    ogrenciPin: pinOgrenci,
    ogrenciUnpin: unpinOgrenci,
    refreshFromFirestore,
    login,
    logout
  }), [
    setOgrenciler, addOgrenciler, toggleOgrenciSec, clearSeciliOgrenciler,
    deleteOgrenci, clearOgrenciler, setSiniflar, setSeciliSinif,
    setSalonlar, addSalon, deleteSalon, updateAyarlar,
    setYerlestirmeSonucu, updateYerlestirmeSonucu, clearYerlestirme,
    setAktifTab, startLoading, stopLoading, setHata, clearHata,
    pinOgrenci, unpinOgrenci, refreshFromFirestore, login, logout
  ]);

  // Memoize value to stabilize context and prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    ogrenciler,
    ayarlar,
    salonlar,
    yerlestirmeSonucu,
    placementIndex,
    aktifTab,
    yukleme,
    hata,
    role,
    authUser,
    ...actionsList,
    isInitialized,
    isWriteAllowed
  }), [
    ogrenciler, ayarlar, salonlar, yerlestirmeSonucu, placementIndex,
    aktifTab, yukleme, hata, role, authUser, actionsList, isInitialized, isWriteAllowed
  ]);

  return (
    <ExamContext.Provider value={value}>
      {children}
    </ExamContext.Provider>
  );
};

// Custom Hook
export const useExam = () => {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam hook must be used within ExamProvider');
  }
  return context;
};

export const useExamSelector = (selector, equalityFn) => useExamStore(selector, equalityFn);

export default ExamContext;

