import React, { useCallback, useEffect, useRef, useState, Suspense, useMemo } from 'react';
import { DndContext, pointerWithin, rectIntersection, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import {
  Box,
  Container,
  Typography,
  Alert,
  Button,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Fab,
  Chip,
  Card,
  CardContent,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  People as PeopleIcon,
  Settings as SettingsIcon,
  Book as BookIcon,
  MeetingRoom as MeetingRoomIcon,
  Chair as ChairIcon,
  PlayArrow as PlayIcon,
  Print as PrintIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
  BugReport as BugReportIcon,
  Assignment as AssignmentIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Lock as LockIcon,
  School as SchoolIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';

import { motion, AnimatePresence } from 'framer-motion';

import Sidebar from '../components/common/Sidebar';
import EmptyState from '../components/common/EmptyState';
import ErrorBoundary from '../components/ErrorBoundary';
import GenelAyarlarFormu from '../components/GenelAyarlarFormu';
import OgrenciListesi from '../components/OgrenciListesi';
import AyarlarFormu from '../components/AyarlarFormu';
import SalonFormu from '../components/SalonFormu';
import { useExamStore } from '../store/useExamStore';
import { useNotifications, NotificationProvider } from '../components/NotificationSystem';
import PlacementSuccessModal from '../components/PlacementSuccessModal';
import { gelismisYerlestirme } from '../algorithms/gelismisYerlestirmeAlgoritmasi';
import { calculateDeskNumbersForMasalar } from '../algorithms/gelismisYerlestirmeAlgoritmasi';
import planManager from '../utils/planManager';
import {
  DatabaseTestLazy,
  TestDashboardLazy,
  SalonPlaniLazy,
  PlanlamaYapLazy,
  SabitAtamalarLazy,
  KayitliPlanlarLazy
} from '../components/LazyComponents';
import { SalonPlaniPrintable } from '../components/SalonPlaniPrintable';
import { SalonOgrenciListesiPrintable } from '../components/SalonOgrenciListesiPrintable';
import { SalonImzaListesiPrintable } from '../components/SalonImzaListesiPrintable';
import { StudentCardPreview } from '../components/SalonPlani/SeatItem';
import logger from '../utils/logger';
import transferManager from '../utils/transferManager';
import PlanKaydetmeDialog from '../components/AnaSayfa/PlanKaydetmeDialog';
import { UnplacedStudentsDropZone, DraggableUnplacedStudent, ITEM_TYPES } from '../components/AnaSayfa/UnplacedStudentsDnd';
import { usePlanPersistence } from '../hooks/usePlanPersistence';
import { useStudentPlacement } from '../hooks/useStudentPlacement';
import { usePlacementAlgorithm } from '../hooks/usePlacementAlgorithm';
import { usePlanExport } from '../hooks/usePlanExport';

const AnaSayfaContent = React.memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [seciliSalonId, setSeciliSalonId] = useState(null);
  const { showSuccess, showError, showInfo } = useNotifications();
  const [dndJustEnded, setDndJustEnded] = useState(false);

  // Sidebar States
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // 1. State Selectors
  const ogrenciler = useExamStore(s => s.ogrenciler);
  const ayarlar = useExamStore(s => s.ayarlar);
  const salonlar = useExamStore(s => s.salonlar);
  const yerlestirmeSonucu = useExamStore(s => s.yerlestirmeSonucu);
  const aktifTab = useExamStore(s => s.aktifTab);
  const yukleme = useExamStore(s => s.yukleme);
  const hata = useExamStore(s => s.hata);
  const role = useExamStore(s => s.role);
  const authUser = useExamStore(s => s.authUser);

  // 2. Action Selectors
  const setOgrenciler = useExamStore(s => s.setOgrenciler);
  const addOgrenciler = useExamStore(s => s.addOgrenciler);
  const updateAyarlar = useExamStore(s => s.updateAyarlar);
  const setSalonlar = useExamStore(s => s.setSalonlar);
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

  // Derivations
  const isWriteAllowed = role === 'admin';

  // Legacy mappings for internal functions
  const ogrencilerYukle = setOgrenciler;
  const ayarlarGuncelle = updateAyarlar;
  const salonlarGuncelle = setSalonlar;
  const yerlestirmeYap = setYerlestirmeSonucu;
  const yerlestirmeGuncelle = updateYerlestirmeSonucu;
  const yerlestirmeTemizle = clearYerlestirme;
  const tabDegistir = setAktifTab;
  const yuklemeBaslat = startLoading;
  const hataAyarla = setHata;
  const hataTemizle = clearHata;
  const ogrenciPin = pinOgrenci;
  const ogrenciUnpin = unpinOgrenci;

  const readOnly = !isWriteAllowed;

  // Aktif sekme kontrolü - tanımsız ise genel-ayarlar sekmesine geç
  useEffect(() => {
    try {
      if (!aktifTab) {
        tabDegistir('genel-ayarlar');
      }
    } catch (error) {
      console.error('❌ Tab kontrol hatası:', error);
    }
  }, [aktifTab, tabDegistir]);

  // Plan varsa ilk salonu otomatik seç - sadece bir kez çalışsın (useRef ile kontrol)
  const ilkSalonSecildiRef = useRef(false);
  useEffect(() => {
    if (yerlestirmeSonucu && yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) {
      if (ilkSalonSecildiRef.current) return; // Zaten seçilmişse tekrar seçme

      // Eğer seciliSalonId null ise veya seçili salon tumSalonlar içinde yoksa, ilk salonu seç
      const aktifTumSalonlar = yerlestirmeSonucu.tumSalonlar.filter(salon => salon.aktif !== false);
      if (aktifTumSalonlar.length > 0) {
        const seciliSalonMevcutMu = seciliSalonId && aktifTumSalonlar.some(salon =>
          salon.salonId === seciliSalonId || salon.id === seciliSalonId
        );

        if (!seciliSalonMevcutMu) {
          const ilkSalon = aktifTumSalonlar[0];
          const ilkSalonId = ilkSalon.salonId || ilkSalon.id;
          if (ilkSalonId) {
            ilkSalonSecildiRef.current = true;
            setSeciliSalonId(ilkSalonId);
            // Ana salonu da güncelle - sadece ilk seferinde
            if (yerlestirmeGuncelle && !yerlestirmeSonucu.salon) {
              yerlestirmeGuncelle({ salon: ilkSalon });
            }
          }
        } else {
          ilkSalonSecildiRef.current = true;
        }
      }
    } else {
      // Plan yoksa ref'i sıfırla
      ilkSalonSecildiRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yerlestirmeSonucu?.tumSalonlar?.length]);



  // Gizli kısayol: Ctrl+Alt+D ile veritabanı test panelini aç/kapat
  useEffect(() => {
    const handler = (e) => {
      try {
        const isToggle = (e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'd' || e.key === 'D');
        if (isToggle) {
          const enabled = localStorage.getItem('enable_db_test') === '1';
          const next = enabled ? '0' : '1';
          localStorage.setItem('enable_db_test', next);
          // panel görünürse hemen geç
          if (next === '1') {
            tabDegistir('database-test');
            showSuccess('Veritabanı Test paneli etkinleştirildi (Ctrl+Alt+D)');
          } else {
            showSuccess('Veritabanı Test paneli devre dışı bırakıldı');
            if (aktifTab === 'database-test') tabDegistir('genel-ayarlar');
          }
        }
      } catch (err) {
        logger.debug('Kısayol işleyicisinde hata yakalandı:', err);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tabDegistir, showSuccess, aktifTab]);

  // PDF Export için ref'ler
  const salonPlaniPrintRef = useRef();
  const sinifListesiPrintRef = useRef();
  const salonImzaListesiPrintRef = useRef();

  // Kaydetme için state'ler
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activePlanMeta, setActivePlanMeta] = useState(null);
  const currentPlanDisplayName = activePlanMeta?.name || planManager.getCurrentPlanName() || '';

  // Placement Success Modal State
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successStats, setSuccessStats] = useState(null);
  const [successModalTitle, setSuccessModalTitle] = useState(null);
  const [successModalMessage, setSuccessModalMessage] = useState(null);

  // Yerleştirme Başarılı Handler
  const handlePlacementSuccess = useCallback((stats) => {
    setSuccessStats(stats);
    setSuccessModalTitle('Yerleştirme Tamamlandı!');
    setSuccessModalMessage('Öğrenciler başarıyla salonlara yerleştirildi.');
    setSuccessModalOpen(true);
  }, []);

  // Plan Yükleme Başarılı Handler
  const handleLoadSuccess = useCallback((stats) => {
    setSuccessStats(stats);
    setSuccessModalTitle('Plan Başarıyla Yüklendi!');
    setSuccessModalMessage('Kayıtlı plan ve yerleşim verileri başarıyla yüklendi.');
    setSuccessModalOpen(true);
  }, []);

  // Modal Kapanınca
  const handleSuccessModalClose = useCallback(() => {
    setSuccessModalOpen(false);
    tabDegistir('salon-plani');
  }, [tabDegistir]);

  const {
    printMenuAnchor,
    handlePrintMenuOpen,
    handlePrintMenuClose,
    handleSalonPlaniPrintClick,
    handleSinifListesiPrintClick,
    handleSalonImzaListesiPrintClick
  } = usePlanExport(
    salonPlaniPrintRef,
    sinifListesiPrintRef,
    salonImzaListesiPrintRef,
    ayarlar
  );

  const { handleSavePlan, handlePlanYukle } = usePlanPersistence(activePlanMeta, setActivePlanMeta, handleLoadSuccess);
  const {
    handleStudentMove,
    handleStudentTransfer,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo
  } = useStudentPlacement(
    yerlestirmeSonucu,
    yerlestirmeGuncelle,
    ogrenciler,
    ogrencilerYukle,
    readOnly
  );

  const handleYuklemeDurumu = useCallback((durum) => {
    if (durum) startLoading();
    else stopLoading();
  }, [startLoading, stopLoading]);

  const { handleYerlestirmeYap } = usePlacementAlgorithm(
    ogrenciler,
    salonlar,
    ayarlar,
    readOnly,
    yerlestirmeYap,
    handlePlacementSuccess,
    hataAyarla,
    setActivePlanMeta,
    showError,
    handleYuklemeDurumu
  );

  // Kaydetme fonksiyonları - useCallback ile optimize edildi
  const handleSaveClick = useCallback(() => {
    if (readOnly) {
      showError('Bu işlem için yönetici girişi gereklidir.');
      return;
    }
    if (activePlanMeta?.id && activePlanMeta?.name) {
      handleSavePlan(activePlanMeta.name, { planId: activePlanMeta.id });
      return;
    }

    if (planManager.isCurrentPlanActive()) {
      const currentPlanName = planManager.getCurrentPlanName();
      if (currentPlanName) {
        handleSavePlan(currentPlanName, { planId: planManager.getCurrentPlanId() });
        return;
      }
    }
    setSaveDialogOpen(true);
  }, [handleSavePlan, activePlanMeta, readOnly, showError]);

  const handleSaveDialogClose = useCallback(() => {
    setSaveDialogOpen(false);
  }, []);

  // Global kısayollar: Ctrl+S (Planı Kaydet) & Ctrl+P (Yazdır)
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (yerlestirmeSonucu || aktifTab === 'salon-plani') {
          handleSaveClick();
        } else {
          showInfo('Kaydedilecek aktif bir sınav yerleşim planı bulunmuyor.');
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (yerlestirmeSonucu) {
          handleSalonPlaniPrintClick();
        } else {
          showInfo('Yazdırmak için önce bir yerleşim planı oluşturun.');
        }
        return;
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [handleSaveClick, yerlestirmeSonucu, aktifTab, handleSalonPlaniPrintClick, showInfo]);



  // Veri yükleme - artık localStorage'dan otomatik yükleniyor
  // useEffect kaldırıldı çünkü ExamContext localStorage'dan veriyi otomatik yüklüyor

  const handleAyarlarDegistir = useCallback((yeniAyarlar) => {
    if (readOnly) {
      showError('Bu alanları düzenlemek için yönetici girişi gerekiyor.');
      return;
    }
    ayarlarGuncelle(yeniAyarlar);
  }, [ayarlarGuncelle, readOnly, showError]);

  const salonlarSaveTimerRef = useRef(null);

  const handleSalonlarDegistir = useCallback((yeniSalonlar) => {
    if (readOnly) {
      showError('Salon düzenleme yetkisi için yönetici girişi gerekli.');
      return;
    }
    salonlarGuncelle(yeniSalonlar);

    // Arka planda SQLite'a otomatik kaydet (Sekme değişse bile veri kaybını önler)
    if (salonlarSaveTimerRef.current) {
      clearTimeout(salonlarSaveTimerRef.current);
    }
    salonlarSaveTimerRef.current = setTimeout(async () => {
      try {
        const db = (await import('../database')).default;
        await db.saveSalons(yeniSalonlar);
      } catch (err) {
        logger.warn('Otomatik salon kaydetme hatası:', err);
      }
    }, 600);

    // Eğer yerleştirme sonucu varsa, salon sıralamasını güncelle
    if (yerlestirmeSonucu && yerlestirmeSonucu.tumSalonlar) {
      // Yeni salon sıralamasına göre tumSalonlar'ı güncelle
      const guncellenmisTumSalonlar = yeniSalonlar.map(yeniSalon => {
        // Mevcut tumSalonlar'da bu salon var mı kontrol et
        const mevcutSalon = yerlestirmeSonucu.tumSalonlar.find(salon =>
          salon.salonId === yeniSalon.id || salon.salonAdi === yeniSalon.salonAdi
        );

        if (mevcutSalon) {
          // Mevcut salon verilerini koru, sadece sıralamayı güncelle
          return {
            ...mevcutSalon,
            salonAdi: yeniSalon.salonAdi,
            salonId: yeniSalon.id
          };
        } else {
          // Yeni salon eklenmişse, boş salon oluştur
          return {
            salonId: yeniSalon.id,
            salonAdi: yeniSalon.salonAdi,
            masalar: [],
            gruplar: {},
            ogrenciler: []
          };
        }
      });

      // Yerleştirme sonucunu güncelle
      yerlestirmeGuncelle({
        ...yerlestirmeSonucu,
        tumSalonlar: guncellenmisTumSalonlar
      });
    }
  }, [salonlarGuncelle, yerlestirmeSonucu, yerlestirmeGuncelle, readOnly, showError]);

  const handleSalonlarDBKaydet = useCallback(async (guncelSalonlar) => {
    if (readOnly) return;
    try {
      const db = (await import('../database')).default;
      await db.saveSalons(guncelSalonlar);
      showSuccess('Sınav salonları veritabanına kaydedildi.');
    } catch (e) {
      console.error('Veritabanına kaydetme hatası:', e);
      showError('Değişiklikler kaydedilemedi.');
    }
  }, [readOnly, showSuccess, showError]);

  // Yerleştirme sonuçlarını temizle - useCallback ile optimize edildi
  const handleYerlestirmeTemizle = useCallback(() => {
    // Public modda da yerleşim planı temizlenebilir
    yerlestirmeTemizle(); // Yerleştirme sonucunu temizle
    tabDegistir('planlama'); // Planlama sekmesine geri dön
    planManager.clearCurrentPlan(); // Aktif planı temizle
    setActivePlanMeta(null); // activePlanMeta'yı da temizle
  }, [yerlestirmeTemizle, tabDegistir, setActivePlanMeta]);





  // Aktif salonlar hesaplaması - performans için useMemo ile cache'lendi
  const aktifSalonlar = useMemo(() => {
    return salonlar?.filter(salon => salon.aktif !== false) || [];
  }, [salonlar]);

  const aktifTumSalonlar = useMemo(() => {
    return yerlestirmeSonucu?.tumSalonlar?.filter(salon => salon.aktif !== false) || [];
  }, [yerlestirmeSonucu?.tumSalonlar]);

  const currentSalonSinif = useMemo(() => {
    if (yerlestirmeSonucu?.salon) return yerlestirmeSonucu.salon;
    const kapasite = Math.max(ogrenciler.length, 30);
    const satir = Math.ceil(Math.sqrt(kapasite));
    const sutun = Math.ceil(kapasite / satir);
    return {
      id: 'A-101',
      kapasite,
      siraDizilimi: { satir, sutun },
      ad: 'Sınav Salonu'
    };
  }, [yerlestirmeSonucu?.salon, ogrenciler.length]);

  const currentSalonOgrenciler = useMemo(() => {
    return yerlestirmeSonucu?.salon?.ogrenciler || [];
  }, [yerlestirmeSonucu?.salon?.ogrenciler]);

  const handleSalonDegistirCallback = useCallback((salon) => {
    if (!yerlestirmeSonucu?.tumSalonlar) return;
    const formatlanmisSalon = yerlestirmeSonucu.tumSalonlar.find(
      fSalon => fSalon.salonId === salon.salonId
    );

    if (formatlanmisSalon) {
      yerlestirmeGuncelle({ salon: formatlanmisSalon });
    }
  }, [yerlestirmeSonucu?.tumSalonlar, yerlestirmeGuncelle]);

  // Ortak onOgrenciSec callback (DnD için)
  const onOgrenciSecCallback = useCallback((action, data) => {
    if (action === 'clear') {
      handleYerlestirmeTemizle();
    } else if (action === 'move') {
      // SalonPlani.js'den gelen data: { from: fromMasaId, to: toMasaId, draggedStudent }
      // useStudentPlacement.js beklenen format: { from, to, draggedStudent }
      handleStudentMove(data);
    }
  }, [handleYerlestirmeTemizle, handleStudentMove]);

  // Tab içerik render fonksiyonu - sadece aktif sekme bileşeni oluşturulur (performans optimizasyonu)
  const renderTabIcerik = () => {
    switch (aktifTab) {
      case 'genel-ayarlar':
        return (
          <GenelAyarlarFormu
            ayarlar={ayarlar}
            onAyarlarDegistir={handleAyarlarDegistir}
            readOnly={readOnly}
          />
        );

      case 'ogrenciler':
        return (
          <OgrenciListesi
            ogrenciler={ogrenciler}
            yerlestirmeSonucu={yerlestirmeSonucu}
            ayarlar={ayarlar}
            onAyarlarDegistir={handleAyarlarDegistir}
          />
        );

      case 'salonlar':
        return (
          <SalonFormu
            salonlar={salonlar}
            onSalonlarDegistir={handleSalonlarDegistir}
            onKaydet={handleSalonlarDBKaydet}
            yerlestirmeSonucu={yerlestirmeSonucu}
            readOnly={readOnly}
          />
        );

      case 'ayarlar':
        return (
          <AyarlarFormu
            ayarlar={ayarlar}
            onAyarlarDegistir={handleAyarlarDegistir}
            ogrenciler={ogrenciler}
            yerlestirmeSonucu={yerlestirmeSonucu}
            readOnly={readOnly}
          />
        );

      case 'sabit-atamalar':
        return (
          <ErrorBoundary componentName="SabitAtamalar">
            <SabitAtamalarLazy />
          </ErrorBoundary>
        );

      case 'planlama':
        return (
          <ErrorBoundary componentName="PlanlamaYap">
            <PlanlamaYapLazy
              ogrenciler={ogrenciler}
              ayarlar={ayarlar}
              salonlar={salonlar}
              onYerlestirmeYap={handleYerlestirmeYap}
              yukleme={yukleme}
            />
          </ErrorBoundary>
        );

      case 'salon-plani':
        if (yerlestirmeSonucu) {
          return (
            <ErrorBoundary componentName="SalonPlani">
              <Box sx={{ position: 'relative' }}>
                <SalonPlaniLazy
                  sinif={currentSalonSinif}
                  ogrenciler={currentSalonOgrenciler}
                  ayarlar={ayarlar}
                  onOgrenciSec={onOgrenciSecCallback}
                  tumSalonlar={aktifTumSalonlar}
                  onSalonDegistir={handleSalonDegistirCallback}
                  salonlar={aktifSalonlar}
                  seciliSalonId={seciliSalonId}
                  onSeciliSalonDegistir={setSeciliSalonId}
                  onStudentTransfer={handleStudentTransfer}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  yerlestirmeSonucu={yerlestirmeSonucu}
                  aktifPlanAdi={currentPlanDisplayName}
                  readOnly={readOnly}
                  dndJustEnded={dndJustEnded}
                />
              </Box>
            </ErrorBoundary>
          );
        }

        // Yerleştirme henüz yapılmamışsa: Salonların boş önizlemesi
        {
          const seciliSalon = aktifSalonlar.find(salon => salon.id === seciliSalonId) || aktifSalonlar[0];
          if (!seciliSalon) {
            return (
              <Box sx={{ width: '100%', py: 6, display: 'flex', justifyContent: 'center' }}>
                <EmptyState
                  icon={MeetingRoomIcon}
                  title="Tanımlı Sınav Salonu Bulunamadı"
                  description="Görüntülenecek sınav salonu bulunamadı. Lütfen önce 'Sınav Salonları' sekmesinden salon ekleyin."
                  actionLabel="Sınav Salonu Ekle ➔"
                  onAction={() => tabDegistir('salonlar')}
                />
              </Box>
            );
          }

          const salonKapasite = seciliSalon.kapasite || 30;
          const defaultSatir = seciliSalon.satir || (salonKapasite > 0 ? Math.ceil(Math.sqrt(salonKapasite)) : 6);
          const defaultSutun = seciliSalon.sutun || (salonKapasite > 0 ? Math.ceil(salonKapasite / defaultSatir) : 5);
          const defaultGruplar = seciliSalon.gruplar || [
            { id: 1, siraSayisi: Math.ceil(defaultSatir / 2) },
            { id: 2, siraSayisi: Math.ceil(defaultSatir / 2) },
            { id: 3, siraSayisi: Math.ceil(defaultSatir / 2) },
            { id: 4, siraSayisi: Math.ceil(defaultSatir / 2) }
          ];

          return (
            <ErrorBoundary componentName="SalonPlani">
              <Box sx={{ position: 'relative' }}>
                <Alert
                  severity="info"
                  sx={{ mb: 2.5, borderRadius: '12px' }}
                  action={
                    <Button
                      color="primary"
                      variant="contained"
                      size="small"
                      onClick={() => tabDegistir('planlama')}
                      sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
                    >
                      Planlama Yap Ekranına Git ➜
                    </Button>
                  }
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Henüz otomatik yerleştirme yapılmadı.
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Aşağıdaki görünüm boş salon oturma düzeni önizlemesidir. Öğrencileri salonlara yerleştirmek için "Planlama Yap" sekmesine geçebilirsiniz.
                  </Typography>
                </Alert>
                <SalonPlaniLazy
                  sinif={{
                    id: seciliSalon.id,
                    salonAdi: seciliSalon.salonAdi || seciliSalon.ad,
                    kapasite: salonKapasite,
                    siraTipi: seciliSalon.siraTipi || 'ikili',
                    grupSayisi: seciliSalon.grupSayisi,
                    gruplar: defaultGruplar,
                    masalar: [],
                    ogrenciler: [],
                    siraDizilimi: {
                      satir: defaultSatir,
                      sutun: defaultSutun
                    }
                  }}
                  ogrenciler={[]}
                  ayarlar={ayarlar}
                  salonlar={aktifSalonlar}
                  seciliSalonId={seciliSalonId}
                  onSeciliSalonDegistir={setSeciliSalonId}
                  aktifPlanAdi={currentPlanDisplayName}
                  onOgrenciSec={onOgrenciSecCallback}
                  readOnly={readOnly}
                  dndJustEnded={dndJustEnded}
                />
              </Box>
            </ErrorBoundary>
          );
        }

      case 'database-test':
        return (
          <ErrorBoundary componentName="DatabaseTest">
            <DatabaseTestLazy />
          </ErrorBoundary>
        );

      case 'test-dashboard':
        return (
          <ErrorBoundary componentName="TestDashboard">
            <TestDashboardLazy />
          </ErrorBoundary>
        );

      case 'kayitli-planlar':
        return (
          <ErrorBoundary componentName="KayitliPlanlar">
            <KayitliPlanlarLazy onPlanYukle={handlePlanYukle} />
          </ErrorBoundary>
        );

      default:
        return genelAyarlarContent;
    }
  };


  // Drag & drop state and sensors for @dnd-kit
  const [activeDragItem, setActiveDragItem] = useState(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  const customCollisionDetection = useCallback((args) => {
    // 1. Doğrudan imlecin altındaki masayı anında yakala (en hızlı O(1) yöntem)
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    // 2. Kutu kesişimini kontrol et (fallback)
    return rectIntersection(args);
  }, []);

  const handleDragStart = useCallback((event) => {
    setActiveDragItem(event.active?.data?.current || null);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragItem(null);
  }, []);

  const handleDragEnd = useCallback((event) => {
    setActiveDragItem(null);
    setDndJustEnded(true);
    setTimeout(() => setDndJustEnded(false), 250);

    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeId = active?.id;
    const overId = over?.id;

    const activeMasaIdParsed = typeof activeId === 'string'
      ? parseInt(activeId.replace('student-', ''), 10)
      : NaN;

    const overMasaIdParsed = typeof overId === 'string'
      ? parseInt(overId.replace('masa-', ''), 10)
      : NaN;

    // Parse IDs to extract masaId and student info
    const activeMasaId = isNaN(activeMasaIdParsed) ? null : activeMasaIdParsed;
    const overMasaId = isNaN(overMasaIdParsed) ? null : overMasaIdParsed;

    const draggedStudent = active?.data?.current?.ogrenci;

    if (activeMasaId !== overMasaId) {
      if (draggedStudent && onOgrenciSecCallback) {
        onOgrenciSecCallback('move', {
          from: activeMasaId,
          to: overMasaId,
          draggedStudent,
        });
      }
    }
  }, [onOgrenciSecCallback]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      autoScroll={{ layoutShiftCompensation: false }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Box sx={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        bgcolor: 'background.default',
        color: 'text.primary',
        flex: 1
      }}>
        <Sidebar 
          isMobile={isMobile} 
          mobileOpen={mobileOpen} 
          setMobileOpen={setMobileOpen} 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
        />
        
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {isMobile && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={() => setMobileOpen(true)} size="small" color="primary">
                  <MenuIcon />
                </IconButton>
                <Typography variant="subtitle1" fontWeight={700}>
                  Ortak Sınav
                </Typography>
              </Box>
            </Box>
          )}

          <Container maxWidth={false} sx={{ py: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 4, md: 5 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Hata Gösterme */}
            {hata && (
              <Alert severity="error" onClose={hataTemizle} sx={{ mb: 3 }}>
                {hata}
              </Alert>
            )}

            {/* Planda yerleşmeyen öğrenciler için drop zone */}
            {yerlestirmeSonucu && yerlestirmeSonucu.yerlesilemeyenOgrenciler && yerlestirmeSonucu.yerlesilemeyenOgrenciler.length > 0 && (
              <UnplacedStudentsDropZone onStudentMove={(fromMasaId, toMasaId, ogrenci) => {
                if (fromMasaId !== null) {
                  handleStudentMove('move', { from: fromMasaId, to: null, draggedStudent: ogrenci });
                }
              }}>
                {yerlestirmeSonucu.yerlesilemeyenOgrenciler.map((ogrenci) => (
                  <DraggableUnplacedStudent key={ogrenci.id} ogrenci={ogrenci} />
                ))}
              </UnplacedStudentsDropZone>
            )}

            {renderTabIcerik()}
          </Container>
        </Box>

        {/* Modern Hızlı İşlem Çubuğu (Quick Action Bar / Dock) */}
        {(Boolean(yerlestirmeSonucu) || aktifTab === 'salon-plani') && (
          <Box
            sx={{
              position: 'fixed',
              bottom: { xs: 16, sm: 24 },
              right: { xs: 16, sm: 28 },
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 0.75,
              borderRadius: '16px',
              backdropFilter: 'blur(16px)',
              bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
              border: '1px solid',
              borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(226, 232, 240, 0.95)' : 'rgba(51, 65, 85, 0.85)',
              boxShadow: (theme) => theme.palette.mode === 'light'
                ? '0 12px 32px -4px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(15, 23, 42, 0.08)'
                : '0 16px 36px -4px rgba(0, 0, 0, 0.6), 0 4px 12px -2px rgba(0, 0, 0, 0.4)',
              transition: 'opacity 0.15s ease, transform 0.15s ease',
            }}
          >
            {Boolean(yerlestirmeSonucu) && (
              <Tooltip title="Yazdırma Seçenekleri (Ctrl+P)" arrow placement="top">
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handlePrintMenuOpen}
                  aria-label="Yazdırma Seçenekleri"
                  sx={{
                    minWidth: 42,
                    width: 42,
                    height: 42,
                    p: 0,
                    borderRadius: '12px',
                  }}
                >
                  <PrintIcon sx={{ fontSize: '1.25rem' }} />
                </Button>
              </Tooltip>
            )}

            <Tooltip title="Planı Veritabanına Kaydet (Ctrl+S)" arrow placement="top">
              <Button
                variant="contained"
                color="success"
                onClick={handleSaveClick}
                aria-label="Planı Kaydet"
                sx={{
                  minWidth: 42,
                  width: 42,
                  height: 42,
                  p: 0,
                  borderRadius: '12px',
                }}
              >
                <SaveIcon sx={{ fontSize: '1.25rem' }} />
              </Button>
            </Tooltip>
          </Box>
        )}

        {/* Yazdırma Menüsü */}
        <Menu
          anchorEl={printMenuAnchor}
          open={Boolean(printMenuAnchor)}
          onClose={handlePrintMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '16px',
                minWidth: 320,
                p: 0.75,
                mb: 1.5,
                border: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(226, 232, 240, 0.9)' : 'rgba(51, 65, 85, 0.8)',
                boxShadow: (theme) => theme.palette.mode === 'light'
                  ? '0 16px 36px -4px rgba(15, 23, 42, 0.16)'
                  : '0 20px 40px -4px rgba(0, 0, 0, 0.65)',
                bgcolor: 'background.paper',
                '& .MuiMenuItem-root': {
                  borderRadius: '10px',
                  py: 1,
                  px: 1.5,
                  my: 0.25,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(79, 70, 229, 0.08)' : 'rgba(99, 102, 241, 0.12)',
                  }
                }
              }
            }
          }}
        >
          <MenuItem onClick={handleSalonPlaniPrintClick} sx={{ py: 1.25 }}>
            <ListItemIcon>
              <ChairIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Salon Oturma Planı (Tüm Salonlar)"
              secondary="Görsel sıra/koltuk şeması ve yerleşim düzeni"
            />
          </MenuItem>
          <MenuItem onClick={handleSinifListesiPrintClick} sx={{ py: 1.25 }}>
            <ListItemIcon>
              <PeopleIcon fontSize="small" color="secondary" />
            </ListItemIcon>
            <ListItemText
              primary="Öğrenci Listesi (Tüm Salonlar)"
              secondary="Sınav salonu ve sıra numaralı öğrenci listesi"
            />
          </MenuItem>
          <MenuItem onClick={handleSalonImzaListesiPrintClick} sx={{ py: 1.25 }}>
            <ListItemIcon>
              <AssignmentIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Sınav Yoklama / İmza Listesi"
              secondary="Gözetmen öğretmen imza ve tutanak çizelgesi"
            />
          </MenuItem>
        </Menu>

        {/* PDF Export Bileşenleri - Sadece yerleştirme planı varsa oluşturulur */}
        {Boolean(yerlestirmeSonucu) && (
          <Box sx={{
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            visibility: 'hidden'
          }}>
            <SalonPlaniPrintable
              ref={salonPlaniPrintRef}
              yerlestirmeSonucu={yerlestirmeSonucu}
              ayarlar={ayarlar}
            />

            <SalonOgrenciListesiPrintable
              ref={sinifListesiPrintRef}
              ogrenciler={ogrenciler}
              yerlestirmeSonucu={yerlestirmeSonucu}
              ayarlar={ayarlar}
            />

            <SalonImzaListesiPrintable
              ref={salonImzaListesiPrintRef}
              yerlestirmeSonucu={yerlestirmeSonucu}
              ayarlar={ayarlar}
              tumOgrenciler={ogrenciler}
            />
          </Box>
        )}

        <PlanKaydetmeDialog
          open={saveDialogOpen}
          onClose={handleSaveDialogClose}
          onSave={(planAdi) => handleSavePlan(planAdi, { onCloseCallback: handleSaveDialogClose })}
        />

        <PlacementSuccessModal
          open={successModalOpen}
          onClose={handleSuccessModalClose}
          statistics={successStats}
          title={successModalTitle}
          message={successModalMessage}
        />

        <DragOverlay dropAnimation={null} zIndex={9999}>
          {activeDragItem?.ogrenci ? (
            <StudentCardPreview ogrenci={activeDragItem.ogrenci} />
          ) : null}
        </DragOverlay>
      </Box>
    </DndContext>
  );
});

const AnaSayfa = () => {
  return (
    <NotificationProvider>
      <AnaSayfaContent />
    </NotificationProvider>
  );
};

export default AnaSayfa;