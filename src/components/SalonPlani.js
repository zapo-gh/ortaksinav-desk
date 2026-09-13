import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getSinifSeviyesi, getOgrenciDersleri, isGenderValid, isClassLevelValid } from '../algorithms/gelismisYerlestirmeAlgoritmasi';
import { isBackToBackClassLevelValid } from '../algorithms/validation/constraints';
import { getNeighbors } from '../algorithms/utils/helpers';
import DialogHeader from './common/DialogHeader';
import dragDropLearning from '../utils/dragDropLearning';
import logger from '../utils/logger';
import { useNotifications } from './NotificationSystem';
import PageHeader from './common/PageHeader';
import EmptyState from './common/EmptyState';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  Avatar,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Zoom,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Chair as ChairIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  Book as BookIcon,
  Delete as DeleteIcon,
  MeetingRoom as MeetingRoomIcon,
  AutoStories as AutoStoriesIcon,
} from '@mui/icons-material';
import TransferButton from './TransferButton';
import InterSalonTransfer from './InterSalonTransfer';
import { useExam } from '../context/ExamContext';
import {
  ITEM_TYPES,
  getSalonYerlesenSayisi,
  getPozisyon,
  calculateGroupBasedDeskNumbers
} from './SalonPlani/utils';
import { getStudentGenderColor, isStudentGirl, DroppableSeat, DraggableStudent } from './SalonPlani/SeatItem';
import YerlesmeyenOgrenciSeciciDialog from './SalonPlani/YerlesmeyenOgrenciSeciciDialog';
import SalonStatsChips from './SalonPlani/SalonStatsChips';
import SeatGrid from './SalonPlani/SeatGrid';
import SalonTabs from './SalonPlani/SalonTabs';
import StudentDetailModal from './SalonPlani/StudentDetailModal';
import RemoveStudentDialog from './SalonPlani/RemoveStudentDialog';

const SalonPlani = memo(({ sinif, ogrenciler, seciliOgrenciId, kalanOgrenciler = [], onOgrenciSec, tumSalonlar, onSalonDegistir, ayarlar = {}, salonlar = [], seciliSalonId, onSeciliSalonDegistir, onStudentTransfer, yerlestirmeSonucu, tumOgrenciSayisi, aktifPlanAdi = '', readOnly = false, dndJustEnded = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showConfirm, showSuccess, showError } = useNotifications();

  const [modalAcik, setModalAcik] = useState(false);
  const [seciliOgrenci, setSeciliOgrenci] = useState(null);
  const [seciliMasa, setSeciliMasa] = useState(null);
  const [hoveredOgrenci, setHoveredOgrenci] = useState(null);
  const [transferModalAcik, setTransferModalAcik] = useState(false);
  const [transferOgrenci, setTransferOgrenci] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false); // Onay dialog state
  const [unplacedModalOpen, setUnplacedModalOpen] = useState(false);
  const { ogrenciler: globalOgrenciler, placementIndex } = useExam();

  // Yerleşmeyen öğrencileri hesapla
  const unplacedStudents = useMemo(() => {
    // Seçili sınıfları tespit et
    const seciliSiniflar = new Set();
    if (ayarlar?.dersler && Array.isArray(ayarlar.dersler)) {
      ayarlar.dersler.forEach(ders => {
        if (ders.siniflar && Array.isArray(ders.siniflar)) {
          ders.siniflar.forEach(sinif => seciliSiniflar.add(sinif));
        }
      });
    }

    // Tüm öğrencilerden yerleşmiş olanları VE seçili sınıfta olmayanları ayıkla
    // placementIndex içinde olanlar yerleşmiştir
    return globalOgrenciler.filter(s => {
      const yerlesmemis = !placementIndex[s.id];
      const sinifiSecili = seciliSiniflar.size === 0 || seciliSiniflar.has(s.sinif);
      return yerlesmemis && sinifiSecili;
    });
  }, [globalOgrenciler, placementIndex, ayarlar?.dersler]);


  // Öğrenciyi listeden çıkarma işlemi
  const handleRemoveStudentClick = useCallback(() => {
    setConfirmationOpen(true);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (seciliMasa && seciliMasa.id) {
      if (onOgrenciSec && typeof onOgrenciSec === 'function') {
        // 'move' action with to: null means remove from salon
        onOgrenciSec('move', { from: seciliMasa.id, to: null });
        showSuccess(`${seciliOgrenci?.ad} ${seciliOgrenci?.soyad} listeden çıkarıldı.`);
      }
    }
    setConfirmationOpen(false);
    setModalAcik(false);
    setSeciliOgrenci(null);
    setSeciliMasa(null);
  }, [seciliMasa, seciliOgrenci, onOgrenciSec, showConfirm]);

  const handleCancelRemove = useCallback(() => {
    setConfirmationOpen(false);
  }, []);

  // Cinsiyet bazlı renk fonksiyonu - useCallback ile optimize edildi
  const getGenderColor = useCallback((ogrenci) => {
    return getStudentGenderColor(ogrenci);
  }, []);

  // Sınıf düzenini oluştur - GRUP BAZLI SALON YAPISINI KULLANAN
  const sinifDuzeni = useMemo(() => {
    if (!sinif) {
      return null;
    }

    // KRITIK: siraDizilimi kontrolü - eksikse varsayılan değerler ekle
    if (!sinif.siraDizilimi || !sinif.siraDizilimi.satir || !sinif.siraDizilimi.sutun) {
      logger.warn('⚠️ SalonPlani: sinif.siraDizilimi eksik, varsayılan değerler kullanılıyor');
      const kapasite = sinif.kapasite || 30;
      sinif.siraDizilimi = sinif.siraDizilimi || {};
      sinif.siraDizilimi.satir = sinif.siraDizilimi.satir || Math.ceil(Math.sqrt(kapasite)) || 6;
      sinif.siraDizilimi.sutun = sinif.siraDizilimi.sutun || Math.ceil(kapasite / sinif.siraDizilimi.satir) || 5;
    }

    // Eğer sinif.masalar varsa, grup bazlı salon yapısını kullan
    if (sinif.masalar && sinif.masalar.length > 0) {
      // Masaları gruplara göre ayır
      const gruplar = {};
      sinif.masalar.forEach(masa => {
        if (!gruplar[masa.grup]) {
          gruplar[masa.grup] = [];
        }
        gruplar[masa.grup].push({
          ...masa,
          pozisyon: getPozisyon(masa.satir, masa.sutun, sinif.siraDizilimi.satir, sinif.siraDizilimi.sutun)
        });
      });

      return {
        satirSayisi: sinif.siraDizilimi.satir,
        sutunSayisi: sinif.siraDizilimi.sutun,
        masalar: sinif.masalar.map(masa => ({
          ...masa,
          pozisyon: getPozisyon(masa.satir, masa.sutun, sinif.siraDizilimi.satir, sinif.siraDizilimi.sutun)
        })),
        gruplar: gruplar
      };
    }

    // Eğer sinif.siraTipi ve sinif.gruplar varsa, grup bazlı düzen oluştur
    if (sinif.siraTipi && sinif.gruplar && Array.isArray(sinif.gruplar) && sinif.gruplar.length > 0) {
      const { siraTipi, gruplar } = sinif;
      const masalar = [];
      let masaIndex = 0;

      // En fazla sıra sayısını bul - gruplar boş veya geçersizse varsayılan değer kullan
      const siraSayilari = gruplar.map(g => g?.siraSayisi || 0).filter(s => s > 0);
      const maxSiraSayisi = siraSayilari.length > 0 ? Math.max(...siraSayilari) : 6;

      // Grup bazlı masa düzeni oluştur (yerleştirme algoritması ile aynı)
      for (let satir = 0; satir < maxSiraSayisi; satir++) {
        gruplar.forEach((grup, grupIndex) => {
          const grupSiraSayisi = grup?.siraSayisi || 0;
          if (grupSiraSayisi > 0 && satir < grupSiraSayisi) {
            if (siraTipi === 'tekli') {
              masalar.push({
                id: masaIndex++,
                satir: satir,
                sutun: grupIndex,
                grup: grup?.id || (grupIndex + 1),
                koltukTipi: 'tekli',
                grupSira: grupIndex,
                ogrenci: ogrenciler[masaIndex - 1] || null,
                pozisyon: getPozisyon(satir, grupIndex, maxSiraSayisi, gruplar.length)
              });
            } else { // ikili
              // Sol koltuk
              masalar.push({
                id: masaIndex++,
                satir: satir,
                sutun: grupIndex * 2,
                grup: grup?.id || (grupIndex + 1),
                koltukTipi: 'ikili-sol',
                grupSira: grupIndex,
                ogrenci: ogrenciler[masaIndex - 1] || null,
                pozisyon: getPozisyon(satir, grupIndex * 2, maxSiraSayisi, gruplar.length * 2)
              });

              // Sağ koltuk
              masalar.push({
                id: masaIndex++,
                satir: satir,
                sutun: grupIndex * 2 + 1,
                grup: grup?.id || (grupIndex + 1),
                koltukTipi: 'ikili-sag',
                grupSira: grupIndex,
                ogrenci: ogrenciler[masaIndex - 1] || null,
                pozisyon: getPozisyon(satir, grupIndex * 2 + 1, maxSiraSayisi, gruplar.length * 2)
              });
            }
          }
        });
      }

      // Grupları oluştur
      const grupMasalar = {};
      masalar.forEach(masa => {
        if (!grupMasalar[masa.grup]) {
          grupMasalar[masa.grup] = [];
        }
        grupMasalar[masa.grup].push(masa);
      });

      // Grup bazlı masa numaralarını hesapla
      const masalarWithGroupNumbers = calculateGroupBasedDeskNumbers(masalar);

      return {
        satirSayisi: maxSiraSayisi,
        sutunSayisi: siraTipi === 'tekli' ? gruplar.length : gruplar.length * 2,
        masalar: masalarWithGroupNumbers,
        gruplar: grupMasalar
      };
    }

    // Fallback: Basit matris (eski sistem)
    const satirSayisi = sinif.siraDizilimi?.satir || Math.ceil(Math.sqrt(sinif.kapasite));
    const sutunSayisi = sinif.siraDizilimi?.sutun || Math.ceil(sinif.kapasite / satirSayisi);

    const masalar = [];
    for (let i = 0; i < satirSayisi; i++) {
      for (let j = 0; j < sutunSayisi; j++) {
        const masaIndex = i * sutunSayisi + j;
        const ogrenci = ogrenciler[masaIndex];

        masalar.push({
          id: masaIndex,
          masaNumarasi: masaIndex + 1,
          satir: i,
          sutun: j,
          grup: 1,
          koltukTipi: 'normal',
          ogrenci: ogrenci || null,
          pozisyon: getPozisyon(i, j, satirSayisi, sutunSayisi)
        });
      }
    }

    // Grup bazlı masa numaralarını hesapla
    const masalarWithGroupNumbers = calculateGroupBasedDeskNumbers(masalar);

    return { satirSayisi, sutunSayisi, masalar: masalarWithGroupNumbers };
  }, [sinif, ogrenciler]);


  // Tek masa için masa numarası hesaplama fonksiyonu
  const calculateDeskNumberForMasa = useCallback((masa) => {
    if (!masa || !sinifDuzeni?.masalar) return masa?.id + 1 || 1;

    // Tüm masaları al ve grup bazlı sıralama yap
    const allMasalar = sinifDuzeni.masalar;
    const gruplar = {};

    allMasalar.forEach(m => {
      const grup = m.grup || 1;
      if (!gruplar[grup]) gruplar[grup] = [];
      gruplar[grup].push(m);
    });

    let masaNumarasi = 1;
    const sortedGruplar = Object.keys(gruplar).sort((a, b) => parseInt(a) - parseInt(b));

    for (const grupId of sortedGruplar) {
      const grupMasalar = gruplar[grupId];

      const sortedGrupMasalar = grupMasalar.sort((a, b) => {
        if (a.satir !== b.satir) return a.satir - b.satir;
        return a.sutun - b.sutun;
      });

      for (const m of sortedGrupMasalar) {
        if (m.id === masa.id) {
          return masaNumarasi;
        }
        masaNumarasi++;
      }
    }

    return masa.id + 1; // Fallback
  }, [sinifDuzeni]);

  // Drag & Drop handlers - Optimized for performance
  const handleStudentMove = useCallback((data) => {
    const { from, to, draggedStudent } = data || {};
    const fromMasaId = from;
    const toMasaId = to;

    // AI öğrenme sistemi - Drag & Drop hareketini kaydet
    if (draggedStudent && fromMasaId !== toMasaId) {
      const learningContext = {
        salonId: sinif?.id || 'unknown',
        salonAdi: sinif?.salonAdi || 'Unknown Salon',
        totalStudents: ogrenciler?.length || 0,
        currentPlan: sinif?.masalar || []
      };

      dragDropLearning.recordMove(fromMasaId, toMasaId, draggedStudent, learningContext);
    }

    if (onOgrenciSec && typeof onOgrenciSec === 'function') {
      onOgrenciSec('move', { from: fromMasaId, to: toMasaId, draggedStudent });
    }
  }, [onOgrenciSec, sinif, ogrenciler]);

  const handleMasaClick = useCallback((masa, ogrenci) => {
    logger.debug('[SalonPlani] handleMasaClick', {
      readOnly,
      masaId: masa?.id,
      masaNumarasi: masa?.masaNumarasi,
      hasOgrenci: Boolean(ogrenci),
      ogrenciId: ogrenci?.id
    });
    if (readOnly) return;

    // Boş masa: unplaced modalı
    if (!ogrenci && masa) {
      setSeciliMasa(masa);
      setSeciliOgrenci(null);
      setUnplacedModalOpen(true);
      return;
    }

    // Dolu masa: öğrenci detay modalı
    if (ogrenci && masa) {
      setSeciliMasa(masa);
      setSeciliOgrenci(ogrenci);
      setModalAcik(true);
      setUnplacedModalOpen(false);
      return;
    }
  }, [readOnly]);

  const handleUnplacedStudentSelect = useCallback((ogrenci) => {
    if (seciliMasa && ogrenci) {
      handleStudentMove({ from: null, to: seciliMasa.id, draggedStudent: ogrenci });
      setUnplacedModalOpen(false);
      setSeciliMasa(null);
    }
  }, [seciliMasa, handleStudentMove]);

  const handleUnplacedModalClose = useCallback(() => {
    setUnplacedModalOpen(false);
    setSeciliMasa(null);
  }, []);




  const handleModalKapat = useCallback(() => {
    setModalAcik(false);
    setSeciliOgrenci(null);
    setSeciliMasa(null);
  }, []);

  // Transfer işlemleri
  const handleTransferClick = useCallback((student, currentSalon, targetSalon) => {
    // Public modda yerleşim planları değiştirilemez
    if (readOnly) {
      return;
    }
    setTransferOgrenci(student);
    setTransferModalAcik(true);
  }, [readOnly]);

  const handleTransferClose = useCallback(() => {
    setTransferModalAcik(false);
    setTransferOgrenci(null);

    // Transfer akışından sonra geride kalan/yanlışlıkla açık kalan modal durumunu temizle
    setModalAcik(false);
    setSeciliOgrenci(null);
    setSeciliMasa(null);

    setUnplacedModalOpen(false);
  }, []);

  const handleTransferExecute = useCallback(async (transferData) => {
    try {
      if (onStudentTransfer) {
        await onStudentTransfer(transferData);
      }
      setTransferModalAcik(false);
      setTransferOgrenci(null);
    } catch (error) {
      logger.error('❌ Transfer hatası:', error);
      showError(`Transfer sırasında hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
    }
  }, [onStudentTransfer, showError]);

  const handleOgrenciHover = useCallback((ogrenci) => {
    setHoveredOgrenci(prev => {
      // Eğer aynı öğrenci ise state güncelleme (referans değişse bile id aynıysa)
      if (prev?.id === ogrenci?.id) return prev;
      return ogrenci;
    });
  }, []);

  const handleOgrenciLeave = useCallback(() => {
    setHoveredOgrenci(null);
  }, []);

  const getRiskColor = (kategori) => {
    switch (kategori) {
      case 'yuksek-risk':
        return 'error';
      case 'orta-risk':
        return 'warning';
      case 'dusuk-risk':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRiskIcon = (kategori) => {
    switch (kategori) {
      case 'yuksek-risk':
        return <WarningIcon />;
      case 'dusuk-risk':
        return <CheckCircleIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getPozisyonLocal = (satir, sutun, satirSayisi, sutunSayisi) => {
    return getPozisyon(satir, sutun, satirSayisi, sutunSayisi);
  };





  // KRİTİK: plan2D'yi bir kez oluştur ve hasConstraintConflict için kullan
  const plan2D = useMemo(() => {
    if (!sinifDuzeni || !sinifDuzeni.masalar || !Array.isArray(sinifDuzeni.masalar)) {
      return null;
    }

    const satirSayisi = sinifDuzeni.satirSayisi || 0;
    const sutunSayisi = sinifDuzeni.sutunSayisi || 0;
    const p2d = Array(satirSayisi).fill(null).map(() => Array(sutunSayisi).fill(null));

    sinifDuzeni.masalar.forEach(m => {
      if (m && m.ogrenci && typeof m.satir === 'number' && typeof m.sutun === 'number') {
        if (m.satir >= 0 && m.satir < satirSayisi && m.sutun >= 0 && m.sutun < sutunSayisi) {
          p2d[m.satir][m.sutun] = { ogrenci: m.ogrenci, grup: m.grup };
        }
      }
    });
    return p2d;
  }, [sinifDuzeni]);




  // Salon sıralamasını memoize et - sıralama her render'da değişmesin
  // KULLANICI DEĞİŞTİRMEDİĞİ SÜRECE SIRALAMA DEĞİŞMESİN
  const sortedTumSalonlar = useMemo(() => {
    if (!tumSalonlar || tumSalonlar.length === 0) return [];
    const unique = new Map();
    tumSalonlar.forEach((salon) => {
      const key = salon?.salonId ?? salon?.id ?? JSON.stringify(salon);
      if (!unique.has(key)) {
        unique.set(key, salon);
      }
    });
    return Array.from(unique.values());
  }, [tumSalonlar]);

  const sortedSalonlar = useMemo(() => {
    if (!salonlar || salonlar.length === 0) return [];
    const unique = new Map();
    salonlar.forEach((salon) => {
      const key = salon?.id ?? salon?.salonId ?? JSON.stringify(salon);
      if (!unique.has(key)) {
        unique.set(key, salon);
      }
    });
    return Array.from(unique.values());
  }, [salonlar]);



  // Yardımcı: Komşu kısıt ihlali kontrolü (sinifDuzeni oluşturulduktan sonra tanımlanır)
  const hasConstraintConflict = useCallback((masa, plan2D) => {
    if (!sinifDuzeni || !masa?.ogrenci || !plan2D) return { gender: false, classSideBySide: false, classBackToBack: false };
    const komsular = getNeighbors(
      masa.satir,
      masa.sutun,
      sinifDuzeni.satirSayisi,
      sinifDuzeni.sutunSayisi
    );
    const genderOK = isGenderValid(masa.ogrenci, komsular, plan2D, masa.grup);
    const classSideBySideOK = isClassLevelValid(masa.ogrenci, komsular, plan2D, masa.grup);
    const classBackToBackOK = isBackToBackClassLevelValid(masa.ogrenci, masa, plan2D, masa.grup);
    return {
      gender: !genderOK,
      classSideBySide: !classSideBySideOK,
      classBackToBack: !classBackToBackOK
    };
  }, [sinifDuzeni]);

  // Yardımcı: İhlal açıklamasını detaylı üret
  const getConstraintConflictInfo = useCallback((masa, plan2D) => {
    if (!sinifDuzeni || !masa?.ogrenci || !plan2D) return { hasConflict: false, message: '' };
    const komsular = getNeighbors(
      masa.satir,
      masa.sutun,
      sinifDuzeni.satirSayisi,
      sinifDuzeni.sutunSayisi
    );
    const reasons = [];

    // Cinsiyet ihlali: farklı cinsiyet yan yana yasak
    const genderValid = isGenderValid(masa.ogrenci, komsular, plan2D, masa.grup);
    if (!genderValid) {
      const offenders = [];
      komsular.forEach(([s, su]) => {
        const nb = plan2D[s]?.[su]?.ogrenci;
        if (nb?.cinsiyet && masa.ogrenci?.cinsiyet) {
          const a = masa.ogrenci.cinsiyet.toString().trim();
          const b = nb.cinsiyet.toString().trim();
          if (a && b && a.charAt(0).toUpperCase() !== b.charAt(0).toUpperCase()) {
            offenders.push(`${nb.ad} ${nb.soyad || ''}`.trim());
          }
        }
      });
      reasons.push(`Cinsiyet kısıtı: farklı cinsiyet yan yana (${offenders.slice(0, 3).join(', ')})`);
    }

    // Yan yana sınıf seviyesi ihlali: aynı seviye yan yana yasak
    const classSideBySideValid = isClassLevelValid(masa.ogrenci, komsular, plan2D, masa.grup);
    if (!classSideBySideValid) {
      const offenders = [];
      const ogrSeviye = getSinifSeviyesi(masa.ogrenci.sinif);
      komsular.forEach(([s, su]) => {
        const nb = plan2D[s]?.[su]?.ogrenci;
        if (nb?.sinif) {
          const nbSeviye = getSinifSeviyesi(nb.sinif);
          if (ogrSeviye && nbSeviye && ogrSeviye === nbSeviye) {
            offenders.push(`${nb.ad} ${nb.soyad || ''}`.trim());
          }
        }
      });
      reasons.push(`Yan yana sınıf kısıtı: aynı seviye yan yana (${ogrSeviye}. sınıf) (${offenders.slice(0, 3).join(', ')})`);
    }

    // Arka arkaya sınıf seviyesi ihlali: aynı seviye arka arkaya yasak
    const classBackToBackValid = isBackToBackClassLevelValid(masa.ogrenci, masa, plan2D, masa.grup);
    if (!classBackToBackValid) {
      const offenders = [];
      const ogrSeviye = getSinifSeviyesi(masa.ogrenci.sinif);
      const satir = masa.satir;
      const sutun = masa.sutun;

      // Üst komşu kontrolü
      if (satir > 0) {
        const ustCell = plan2D[satir - 1] && plan2D[satir - 1][sutun];
        const ustOgrenci = ustCell?.ogrenci;
        if (ustOgrenci && ustCell?.grup === masa.grup) {
          const ustSeviye = getSinifSeviyesi(ustOgrenci.sinif);
          if (ogrSeviye && ustSeviye && ogrSeviye === ustSeviye) {
            offenders.push(`üstte ${ustOgrenci.ad} ${ustOgrenci.soyad || ''}`.trim());
          }
        }
      }

      // Alt komşu kontrolü
      if (satir < plan2D.length - 1) {
        const altCell = plan2D[satir + 1] && plan2D[satir + 1][sutun];
        const altOgrenci = altCell?.ogrenci;
        if (altOgrenci && altCell?.grup === masa.grup) {
          const altSeviye = getSinifSeviyesi(altOgrenci.sinif);
          if (ogrSeviye && altSeviye && ogrSeviye === altSeviye) {
            offenders.push(`altta ${altOgrenci.ad} ${altOgrenci.soyad || ''}`.trim());
          }
        }
      }

      if (offenders.length > 0) {
        reasons.push(`Arka arkaya sınıf kısıtı: aynı seviye arka arkaya (${ogrSeviye}. sınıf) (${offenders.slice(0, 2).join(', ')})`);
      }
    }

    return { hasConflict: reasons.length > 0, message: reasons.join(' • ') };
  }, [sinifDuzeni]);
  if (!sinifDuzeni) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <EmptyState 
          icon={MeetingRoomIcon} 
          title="Salon bilgisi bulunamadı" 
          description={sinif ? 'Salon yükleniyor...' : 'Salon bilgilerini görüntüleyebilmek için lütfen önce salon ekleyin.'} 
        />
      </Box>
    );
  }


  // Bu kısım kaldırıldı - ana salon planı render edilecek

  return (
    <Box sx={{ width: '100%', mt: 0, mb: 4 }}>
      <PageHeader
        icon={<ChairIcon sx={{ color: '#4F46E5', fontSize: 24 }} />}
        title={(sinif?.ad || sinif?.salonAdi) ? `${sinif.ad || sinif.salonAdi} Salon Planı` : 'Salon Planları'}
          titleExtra={
            <SalonStatsChips {...useMemo(() => {
              if (yerlestirmeSonucu && Array.isArray(yerlestirmeSonucu.tumSalonlar)) {
                const countFilled = (salonKaydi) => {
                  if (!salonKaydi) return 0;
                  const uniqueStudentIds = new Set();

                  const normalizeId = (value) => {
                    if (value === null || value === undefined) return null;
                    const str = String(value).trim();
                    return str.length > 0 ? str : null;
                  };

                  const addStudent = (ogrenci) => {
                    if (!ogrenci) return;
                    const normalizedId = normalizeId(ogrenci.id);
                    if (normalizedId) {
                      uniqueStudentIds.add(normalizedId);
                    }
                  };

                  const addFromSeatArray = (seatArray) => {
                    if (!Array.isArray(seatArray)) return;
                    seatArray.forEach(seat => {
                      if (!seat) return;
                      if (seat.ogrenci) {
                        addStudent(seat.ogrenci);
                      }
                    });
                  };

                  // KRİTİK DÜZELTME: Sadece masalar array'inden say
                  // masalar array'i zaten gerçek yerleşimi gösteriyor
                  // ogrenciler array'i duplicate saymaya neden olabilir
                  addFromSeatArray(salonKaydi.masalar);

                  // Fallback: Eğer masalar yoksa diğer kaynaklardan say
                  if (!salonKaydi.masalar || salonKaydi.masalar.length === 0) {
                    // gruplar hem obje hem dizi olabiliyor
                    if (salonKaydi.gruplar) {
                      const grupValues = Array.isArray(salonKaydi.gruplar)
                        ? salonKaydi.gruplar
                        : Object.values(salonKaydi.gruplar);
                      grupValues.forEach(grup => addFromSeatArray(grup));
                    }
                    addFromSeatArray(salonKaydi.plan);
                    addFromSeatArray(salonKaydi?.koltukMatrisi?.masalar);
                    addFromSeatArray(salonKaydi?.salon?.masalar);

                    // Son çare: ogrenciler array'inden say (ama sadece masalar yoksa)
                    if (Array.isArray(salonKaydi.ogrenciler)) {
                      salonKaydi.ogrenciler.forEach(addStudent);
                    }
                  }

                  return uniqueStudentIds.size;
                };
                const toplamYerlesen = yerlestirmeSonucu.tumSalonlar.reduce((toplam, s) => toplam + countFilled(s), 0);
                const filteredYerlesilemeyen = (yerlestirmeSonucu.yerlesilemeyenOgrenciler || [])
                  .filter(uOgr => globalOgrenciler.some(gOgr => gOgr.id === uOgr.id));

                const toplamYerlesilemeyen = filteredYerlesilemeyen.length;

                // KRİTİK DÜZELTME: Toplam öğrenci sayısını istatistiklerden al
                // Transfer işlemi sonrasında toplam öğrenci sayısı değişmemeli
                const toplamOgrenci = yerlestirmeSonucu.istatistikler?.toplamOgrenci || (toplamYerlesen + toplamYerlesilemeyen);

                return {
                  mode: 'plan',
                  toplam: toplamOgrenci, // İstatistiklerden al
                  yerlesen: toplamYerlesen,
                  yerlesmeyen: toplamYerlesilemeyen
                };
              }

              if (Array.isArray(ogrenciler) && ogrenciler.length > 0) {
                const seenIds = new Set();
                let yerlesenSayisi = 0;
                let yerlesmeyenSayisi = 0;
                ogrenciler.forEach(o => {
                  if (o && o.id && !seenIds.has(o.id)) {
                    seenIds.add(o.id);
                    if (o.salonId) {
                      yerlesenSayisi += 1;
                    } else {
                      yerlesmeyenSayisi += 1;
                    }
                  }
                });
                return {
                  mode: 'list',
                  toplam: seenIds.size,
                  yerlesen: yerlesenSayisi,
                  yerlesmeyen: yerlesmeyenSayisi
                };
              }
              return { mode: null };
            }, [yerlestirmeSonucu, ogrenciler])} />
          }
          actions={
            <Box sx={{
              display: 'flex',
              gap: { xs: 0.5, sm: 1 },
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'center', sm: 'flex-start' }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' }, maxWidth: '100%' }}>
                {aktifPlanAdi ? (
                  <Chip
                    label={`Plan: ${aktifPlanAdi}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{
                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                      fontWeight: 500,
                      maxWidth: { xs: '200px', sm: 'none' }, minWidth: 0,
                      textTransform: 'none',
                      '& .MuiChip-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block'
                      }
                    }}
                    title={`Plan: ${aktifPlanAdi}`}
                  />
                ) : null}
                <Tooltip title="Yerleşimi Temizle">
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />}
                    onClick={async () => {
                      const confirmed = await showConfirm('Tüm yerleştirme sonuçlarını temizlemek istediğinizden emin misiniz?');
                      if (confirmed) {
                        if (typeof onOgrenciSec === 'function') {
                          onOgrenciSec('clear');
                        }
                      }
                    }}
                    sx={{
                      flexShrink: 0,

                      bgcolor: 'error.50',
                      borderColor: 'error.200',
                      color: 'error.main',
                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                      px: { xs: 1, sm: 1.5 },
                      py: { xs: 0, sm: 0.75 },
                      height: { xs: 24, sm: 'auto' },
                      minWidth: { xs: 'auto', sm: 'auto' },
                      '& .MuiButton-startIcon': {
                        mr: { xs: 0.5, sm: 1 }
                      },
                      '&:hover': {
                        bgcolor: 'error.100',
                        borderColor: 'error.300'
                      }
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Yerleşimi </Box>Temizle
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          }
        />
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', mb: 2 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>

        {/* Salon sekmeleri - Hem yerleştirme planı varken hem de yokken göster */}
        <SalonTabs
          tumSalonlar={tumSalonlar}
          salonlar={salonlar}
          sortedTumSalonlar={sortedTumSalonlar}
          sortedSalonlar={sortedSalonlar}
          sinif={sinif}
          onSalonDegistir={onSalonDegistir}
          seciliSalonId={seciliSalonId}
          onSeciliSalonDegistir={onSeciliSalonDegistir}
        />



        <SeatGrid
          sinifDuzeni={sinifDuzeni}
          seciliOgrenciId={seciliOgrenciId}
          hoveredOgrenci={hoveredOgrenci}
          getGenderColor={getGenderColor}
          handleMasaClick={handleMasaClick}
          handleOgrenciHover={handleOgrenciHover}
          handleOgrenciLeave={handleOgrenciLeave}
          handleStudentMove={handleStudentMove}
          handleTransferClick={handleTransferClick}
          currentSalon={sinif}
          tumSalonlar={tumSalonlar}
          readOnly={readOnly}
          getConstraintConflictInfo={getConstraintConflictInfo}
          calculateDeskNumberForMasa={calculateDeskNumberForMasa}
          plan2D={plan2D}
          hasConstraintConflict={hasConstraintConflict}
          dndJustEnded={dndJustEnded}
        />


        {/* İstatistikler */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip
            label={`Toplam Kapasite: ${(() => {
              // Önce kapasite property'sini kontrol et (en güvenilir)
              if (sinif?.kapasite && typeof sinif.kapasite === 'number' && sinif.kapasite > 0) {
                return sinif.kapasite;
              }
              // Sonra masalar array'inin uzunluğunu kontrol et
              if (sinif?.masalar && Array.isArray(sinif.masalar) && sinif.masalar.length > 0) {
                return sinif.masalar.length;
              }
              // Sonra koltukMatrisi.masalar array'inin uzunluğunu kontrol et
              if (sinif?.koltukMatrisi?.masalar && Array.isArray(sinif.koltukMatrisi.masalar) && sinif.koltukMatrisi.masalar.length > 0) {
                return sinif.koltukMatrisi.masalar.length;
              }
              // Son olarak siraDizilimi'nden hesapla
              if (sinif?.siraDizilimi) {
                return (sinif.siraDizilimi.satir || 0) * (sinif.siraDizilimi.sutun || 0);
              }
              return 0;
            })()} koltuk`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Yerleşen: ${(() => {
              if (!Array.isArray(ogrenciler)) return 0;
              const uniqueIds = new Set(ogrenciler.map(o => o.id));
              return uniqueIds.size;
            })()} öğrenci`}
            color="success"
            variant="outlined"
          />
          {(() => {
            // Tüm öğrencilerden sınıf seviyelerini hesapla (yerleşen + yerleşmeyen)
            const sinifSeviyeleri = {};

            // GÜVENLİK: Önce duplicate öğrencileri temizle
            const uniqueOgrenciler = [];
            const seenIds = new Set();

            if (Array.isArray(ogrenciler)) {
              ogrenciler.forEach(ogrenci => {
                if (!seenIds.has(ogrenci.id)) {
                  uniqueOgrenciler.push(ogrenci);
                  seenIds.add(ogrenci.id);
                }
              });

              // Benzersiz öğrencilerden sınıf seviyelerini hesapla
              uniqueOgrenciler.forEach(ogrenci => {
                // Sınıf bilgisini sinif veya sube'den al
                const sinifBilgisi = ogrenci.sinif || ogrenci.sube;
                if (sinifBilgisi) {
                  const seviye = getSinifSeviyesi(sinifBilgisi); // 9, 10, 11, 12
                  if (seviye) {
                    sinifSeviyeleri[seviye] = (sinifSeviyeleri[seviye] || 0) + 1;
                  }
                }
              });
            }



            // Sadece 9, 10, 11, 12. sınıfları göster (1. sınıf gibi hatalı değerleri filtrele)
            const gecerliSeviyeler = ['9', '10', '11', '12'];

            return Object.entries(sinifSeviyeleri)
              .filter(([seviye]) => gecerliSeviyeler.includes(seviye))
              .sort(([a], [b]) => parseInt(a) - parseInt(b)) // Sırala: 9, 10, 11, 12
              .map(([seviye, sayi]) => (
                <Chip
                  key={seviye}
                  label={`${seviye}. Sınıf: ${sayi} öğrenci`}
                  color={seviye === '9' ? 'primary' : seviye === '10' ? 'secondary' : seviye === '11' ? 'success' : 'warning'}
                  variant="outlined"
                />
              ));
          })()}
        </Box>



        {/* Öğrenci Detay Modal */}
        <StudentDetailModal
          open={modalAcik}
          onClose={handleModalKapat}
          seciliOgrenci={seciliOgrenci}
          seciliMasa={seciliMasa}
          getGenderColor={getGenderColor}
          calculateDeskNumberForMasa={calculateDeskNumberForMasa}
          readOnly={readOnly}
          handleRemoveStudentClick={handleRemoveStudentClick}
          ayarlar={ayarlar}
        />

        {/* Onay Diyaloğu */}
        <RemoveStudentDialog
          open={confirmationOpen}
          onClose={handleCancelRemove}
          onConfirm={handleConfirmRemove}
          student={seciliOgrenci}
        />

        {/* Transfer Modal */}
        <InterSalonTransfer
          open={transferModalAcik}
          onClose={handleTransferClose}
          student={transferOgrenci}
          currentSalon={sinif}
          allSalons={tumSalonlar || []}
          onTransfer={handleTransferExecute}
        />

        {/* Yerleşmeyen Öğrenci Seçici Modal */}
        <YerlesmeyenOgrenciSeciciDialog
          open={unplacedModalOpen}
          onClose={handleUnplacedModalClose}
          unplacedStudents={unplacedStudents}
          onSelect={handleUnplacedStudentSelect}
          masaNo={seciliMasa?.masaNumarasi || (seciliMasa && calculateDeskNumberForMasa(seciliMasa))}
        />
        </CardContent>
      </Card>
    </Box>

  );
});

SalonPlani.displayName = 'SalonPlani';

export default SalonPlani;


