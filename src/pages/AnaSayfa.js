import React, { useCallback, useEffect, useRef, useState, Suspense, useMemo } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
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
  useTheme
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
  School as SchoolIcon
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'framer-motion';

import Sidebar from '../components/common/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
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

  // İlk açılışta direkt genel-ayarlar sekmesine geç - loading kaldırıldı
  useEffect(() => {
    try {
      if (aktifTab !== 'genel-ayarlar') {
        tabDegistir('genel-ayarlar');
      }
    } catch (error) {
      console.error('❌ Tab değiştirme hatası:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const { handleStudentMove, handleStudentTransfer } = useStudentPlacement(
    yerlestirmeSonucu,
    yerlestirmeGuncelle,
    ogrenciler,
    ogrencilerYukle,
    readOnly
  );

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
    yukleme
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



  // Veri yükleme - artık localStorage'dan otomatik yükleniyor
  // useEffect kaldırıldı çünkü ExamContext localStorage'dan veriyi otomatik yüklüyor

  const handleAyarlarDegistir = useCallback((yeniAyarlar) => {
    if (readOnly) {
      showError('Bu alanları düzenlemek için yönetici girişi gerekiyor.');
      return;
    }
    ayarlarGuncelle(yeniAyarlar);
  }, [ayarlarGuncelle, readOnly, showError]);

  const handleSalonlarDegistir = useCallback((yeniSalonlar) => {
    if (readOnly) {
      showError('Salon düzenleme yetkisi için yönetici girişi gerekli.');
      return;
    }
    salonlarGuncelle(yeniSalonlar);

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
  }, [salonlarGuncelle, yerlestirmeSonucu, yerlestirmeGuncelle, readOnly]);

  // Yerleştirme sonuçlarını temizle - useCallback ile optimize edildi
  const handleYerlestirmeTemizle = useCallback(() => {
    // Public modda da yerleşim planı temizlenebilir
    yerlestirmeTemizle(); // Yerleştirme sonucunu temizle
    tabDegistir('planlama'); // Planlama sekmesine geri dön
    planManager.clearCurrentPlan(); // Aktif planı temizle
    setActivePlanMeta(null); // activePlanMeta'yı da temizle
  }, [yerlestirmeTemizle, tabDegistir, setActivePlanMeta]);





  const genelAyarlarContent = useMemo(() => (
    <GenelAyarlarFormu
      ayarlar={ayarlar}
      onAyarlarDegistir={handleAyarlarDegistir}
      readOnly={readOnly}
    />
  ), [ayarlar, handleAyarlarDegistir, readOnly]);

  const ogrencilerContent = useMemo(() => (
    <OgrenciListesi
      ogrenciler={ogrenciler}
      yerlestirmeSonucu={yerlestirmeSonucu}
      ayarlar={ayarlar}
      onAyarlarDegistir={handleAyarlarDegistir}
    />
  ), [ogrenciler, yerlestirmeSonucu, ayarlar, handleAyarlarDegistir]);

  const salonlarContent = useMemo(() => (
    <SalonFormu
      salonlar={salonlar}
      onSalonlarDegistir={handleSalonlarDegistir}
      yerlestirmeSonucu={yerlestirmeSonucu}
      readOnly={readOnly}
    />
  ), [salonlar, handleSalonlarDegistir, yerlestirmeSonucu, readOnly]);

  const ayarlarTabContent = useMemo(() => (
    <AyarlarFormu
      ayarlar={ayarlar}
      onAyarlarDegistir={handleAyarlarDegistir}
      ogrenciler={ogrenciler}
      yerlestirmeSonucu={yerlestirmeSonucu}
      readOnly={readOnly}
    />
  ), [ayarlar, handleAyarlarDegistir, ogrenciler, yerlestirmeSonucu, readOnly]);

  const sabitAtamalarContent = useMemo(() => (
    <ErrorBoundary componentName="SabitAtamalar">
      <SabitAtamalarLazy />
    </ErrorBoundary>
  ), []);

  const planlamaContent = useMemo(() => (
    <ErrorBoundary componentName="PlanlamaYap">
      <PlanlamaYapLazy
        ogrenciler={ogrenciler}
        ayarlar={ayarlar}
        salonlar={salonlar}
        onYerlestirmeYap={handleYerlestirmeYap}
        yukleme={yukleme}
      />
    </ErrorBoundary>
  ), [ogrenciler, ayarlar, salonlar, handleYerlestirmeYap, yukleme]);

  // Aktif salonlar hesaplaması - performans için useMemo ile cache'lendi
  const aktifSalonlar = useMemo(() => {
    return salonlar?.filter(salon => salon.aktif !== false) || [];
  }, [salonlar]);

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

  // Tab içerik render fonksiyonu
  const renderTabIcerik = () => {
    switch (aktifTab) {
      case 'genel-ayarlar':
        return genelAyarlarContent;

      case 'ogrenciler':
        return ogrencilerContent;

      case 'salonlar':
        return salonlarContent;

      case 'ayarlar':
        return ayarlarTabContent;

      case 'sabit-atamalar':
        return sabitAtamalarContent;

      case 'planlama':
        return planlamaContent;

      case 'salon-plani':
        if (aktifSalonlar.length > 0 && !yerlestirmeSonucu) {

          const seciliSalon = aktifSalonlar.find(salon => salon.id === seciliSalonId) || aktifSalonlar[0];

          // Kapasite bilgisini doğru şekilde al - 0 ise varsayılan değer kullan
          const salonKapasite = seciliSalon.kapasite || 30;

          // Satır ve sütun sayılarını hesapla - eksikse kapasiteden hesapla
          const defaultSatir = seciliSalon.satir || (salonKapasite > 0 ? Math.ceil(Math.sqrt(salonKapasite)) : 6);
          const defaultSutun = seciliSalon.sutun || (salonKapasite > 0 ? Math.ceil(salonKapasite / defaultSatir) : 5);

          // Grup bazlı düzen için varsayılan gruplar
          const defaultGruplar = seciliSalon.gruplar || [
            { id: 1, siraSayisi: Math.ceil(defaultSatir / 2) },
            { id: 2, siraSayisi: Math.ceil(defaultSatir / 2) },
            { id: 3, siraSayisi: Math.ceil(defaultSatir / 2) },
            { id: 4, siraSayisi: Math.ceil(defaultSatir / 2) }
          ];

          return (
            <ErrorBoundary componentName="SalonPlani">
              <Box sx={{ position: 'relative' }}>
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

        return (
          <ErrorBoundary componentName="SalonPlani">
            <Box sx={{ position: 'relative' }}>
              {yerlestirmeSonucu && (
                <>
                  <SalonPlaniLazy
                    sinif={yerlestirmeSonucu?.salon || {
                      id: 'A-101',
                      kapasite: Math.max(ogrenciler.length, 30),
                      siraDizilimi: {
                        satir: Math.ceil(Math.sqrt(Math.max(ogrenciler.length, 30))),
                        sutun: Math.ceil(Math.max(ogrenciler.length, 30) / Math.ceil(Math.sqrt(Math.max(ogrenciler.length, 30))))
                      },
                      ad: 'Sınav Salonu'
                    }}
                    ogrenciler={yerlestirmeSonucu?.salon?.ogrenciler || []}
                    ayarlar={ayarlar}
                    onOgrenciSec={onOgrenciSecCallback}
                    tumSalonlar={yerlestirmeSonucu?.tumSalonlar?.filter(salon => salon.aktif !== false) || []}
                    onSalonDegistir={(salon) => {
                      const formatlanmisSalon = yerlestirmeSonucu.tumSalonlar.find(
                        fSalon => fSalon.salonId === salon.salonId
                      );

                      if (formatlanmisSalon) {
                        yerlestirmeGuncelle({ salon: formatlanmisSalon });
                      }
                    }}
                    salonlar={salonlar?.filter(salon => salon.aktif !== false) || []}
                    seciliSalonId={seciliSalonId}
                    onSeciliSalonDegistir={setSeciliSalonId}
                    onStudentTransfer={handleStudentTransfer}
                    yerlestirmeSonucu={yerlestirmeSonucu}
                    aktifPlanAdi={currentPlanDisplayName}
                    readOnly={readOnly}
                    dndJustEnded={dndJustEnded}
                  />
                </>
              )}

              {!yerlestirmeSonucu && (
                <ErrorBoundary componentName="SalonPlani">
                  <>
                    {(() => {
                      const seciliSalon = salonlar.find(salon => salon.id === (seciliSalonId || salonlar[0]?.id));
                      if (!seciliSalon) return null;

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
                        <SalonPlaniLazy
                          sinif={{
                            id: seciliSalon.id,
                            kapasite: salonKapasite,
                            ad: seciliSalon.salonAdi || seciliSalon.ad,
                            siraTipi: seciliSalon.siraTipi || 'ikili',
                            gruplar: defaultGruplar,
                            siraDizilimi: {
                              satir: defaultSatir,
                              sutun: defaultSutun
                            }
                          }}
                          ogrenciler={[]}
                          ayarlar={ayarlar}
                          salonlar={salonlar?.filter(salon => salon.aktif !== false) || []}
                          seciliSalonId={seciliSalonId}
                          onSeciliSalonDegistir={setSeciliSalonId}
                          onOgrenciSec={onOgrenciSecCallback}
                          readOnly={readOnly}
                          aktifPlanAdi={currentPlanDisplayName}
                        />
                      );
                    })()}
                  </>
                </ErrorBoundary>
              )}
            </Box>
          </ErrorBoundary>
        );

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


  // Handle drag end for @dnd-kit
  // (DnD activation/sensors were removed to restore previous drag/drop behavior)
  const handleDragEnd = useCallback((event) => {
    setDndJustEnded(true);
    setTimeout(() => setDndJustEnded(false), 250);

    const { active, over } = event;

    const activeId = active?.id;
    const overId = over?.id;

    const activeMasaIdParsed = typeof activeId === 'string'
      ? parseInt(activeId.replace('student-', ''), 10)
      : NaN;

    const overMasaIdParsed = typeof overId === 'string'
      ? parseInt(overId.replace('masa-', ''), 10)
      : NaN;

    if (!over) {
      return;
    }

    // Parse IDs to extract masaId and student info
    const activeMasaId = activeMasaIdParsed;
    const overMasaId = overMasaIdParsed;

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
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Box sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'transparent'
      }}>
        <Sidebar 
          isMobile={isMobile} 
          mobileOpen={mobileOpen} 
          setMobileOpen={setMobileOpen} 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
        />
        
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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

        {/* Hızlı İşlem Butonları */}
        <Fab
          color="error"
          sx={{
            position: 'fixed',
            bottom: { xs: 8, sm: 24 },
            right: { xs: 8, sm: 24 },
            zIndex: 1000,
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 }
          }}
          onClick={handleSaveClick}
          title="Kaydet"
        >
          <SaveIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
        </Fab>

        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: { xs: 8, sm: 24 },
            right: { xs: 64, sm: 88 },
            zIndex: 1000,
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 }
          }}
          onClick={handlePrintMenuOpen}
          title="Yazdırma Seçenekleri"
        >
          <PrintIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
        </Fab>

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
        >
          <MenuItem onClick={handleSalonPlaniPrintClick}>
            <ListItemIcon>
              <ChairIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Salon Planı" />
          </MenuItem>
          <MenuItem onClick={handleSinifListesiPrintClick}>
            <ListItemIcon>
              <PeopleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Sınıf Listesi" />
          </MenuItem>
          <MenuItem onClick={handleSalonImzaListesiPrintClick}>
            <ListItemIcon>
              <AssignmentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Salon İmza Listesi" />
          </MenuItem>
        </Menu>

        {/* PDF Export Bileşenleri - Görünür ama ekranda görünmez */}
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
      </Box>
    </DndContext>
  );
});

const AnaSayfa = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <NotificationProvider>
        <AnaSayfaContent />
      </NotificationProvider>
    </DndProvider>
  );
};

export default AnaSayfa;