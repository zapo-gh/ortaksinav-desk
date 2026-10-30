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
  useTheme,
  ButtonGroup
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
  DeleteOutline as DeleteOutlineIcon,
  RestartAlt as RestartAltIcon,
  BookmarkBorder as BookmarkBorderIcon,
  MeetingRoom as MeetingRoomIcon,
  AutoStories as AutoStoriesIcon,
  Undo as UndoIcon,
  Redo as RedoIcon
} from '@mui/icons-material';
import TransferButton from './TransferButton';
import InterSalonTransfer from './InterSalonTransfer';
import { useExamStore } from '../store/useExamStore';
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

const trNumericCollator = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' });

const SalonPlani = memo(({
  sinif,
  ogrenciler,
  seciliOgrenciId,
  kalanOgrenciler = [],
  onOgrenciSec,
  tumSalonlar,
  onSalonDegistir,
  ayarlar = {},
  salonlar = [],
  seciliSalonId,
  onSeciliSalonDegistir,
  onStudentTransfer,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  yerlestirmeSonucu,
  tumOgrenciSayisi,
  aktifPlanAdi = '',
  readOnly = false,
  dndJustEnded = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showConfirm, showSuccess, showError } = useNotifications();

  // Ctrl+Z (Geri Al) ve Ctrl+Y (İleri Al) klavye kısayolları
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (readOnly) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          if (canRedo && onRedo) {
            e.preventDefault();
            onRedo();
          }
        } else {
          if (canUndo && onUndo) {
            e.preventDefault();
            onUndo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (canRedo && onRedo) {
          e.preventDefault();
          onRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, canUndo, canRedo, onUndo, onRedo]);

  const [modalAcik, setModalAcik] = useState(false);
  const [seciliOgrenci, setSeciliOgrenci] = useState(null);
  const [seciliMasa, setSeciliMasa] = useState(null);
  const [hoveredOgrenci, setHoveredOgrenci] = useState(null);
  const [transferModalAcik, setTransferModalAcik] = useState(false);
  const [transferOgrenci, setTransferOgrenci] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false); // Onay dialog state
  const [unplacedModalOpen, setUnplacedModalOpen] = useState(false);
  const globalOgrenciler = useExamStore(s => s.ogrenciler);
  const placementIndex = useExamStore(s => s.placementIndex);

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
    // Modal kapanma animasyonu sürerken içeriğin değişmemesi için state'leri hemen sıfırlamıyoruz.
    // Zaten yeni bir masaya tıklandığında bu değerler handleMasaClick içinde güncelleniyor.
  }, [seciliMasa, seciliOgrenci, onOgrenciSec, showSuccess]);

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
  }, []);




  const handleModalKapat = useCallback(() => {
    setModalAcik(false);
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

  // Tüm masalar için kısıt ihlallerini bir kez önceden hesapla (her render'da veya drag'de tekrar hesaplanmasın)
  const conflictsMap = useMemo(() => {
    if (!sinifDuzeni?.masalar || !plan2D) return new Map();
    const map = new Map();
    const satirSayisi = sinifDuzeni.satirSayisi || 0;
    const sutunSayisi = sinifDuzeni.sutunSayisi || 0;

    sinifDuzeni.masalar.forEach(masa => {
      if (masa?.ogrenci) {
        const komsular = getNeighbors(
          masa.satir,
          masa.sutun,
          satirSayisi,
          sutunSayisi
        );
        const genderOK = isGenderValid(masa.ogrenci, komsular, plan2D, masa.grup);
        const classSideBySideOK = isClassLevelValid(masa.ogrenci, komsular, plan2D, masa.grup);
        const classBackToBackOK = isBackToBackClassLevelValid(masa.ogrenci, masa, plan2D, masa.grup);
        map.set(masa.id, {
          gender: !genderOK,
          classSideBySide: !classSideBySideOK,
          classBackToBack: !classBackToBackOK
        });
      }
    });
    return map;
  }, [sinifDuzeni, plan2D]);




  // Salon sıralamasını memoize et - sıralama her render'da değişmesin
  // KULLANICI DEĞİŞTİRMEDİĞİ SÜRECE SIRALAMA DEĞİŞMESİN
  const sortedTumSalonlar = useMemo(() => {
    if (!tumSalonlar || tumSalonlar.length === 0) return [];
    const unique = new Map();
    tumSalonlar.forEach((salon, idx) => {
      const key = salon?.salonId ?? salon?.id ?? idx;
      if (!unique.has(key)) {
        unique.set(key, salon);
      }
    });
    return Array.from(unique.values()).sort((a, b) => {
      const nameA = a?.salonAdi || a?.ad || '';
      const nameB = b?.salonAdi || b?.ad || '';
      return trNumericCollator.compare(nameA, nameB);
    });
  }, [tumSalonlar]);

  const sortedSalonlar = useMemo(() => {
    if (!salonlar || salonlar.length === 0) return [];
    const unique = new Map();
    salonlar.forEach((salon, idx) => {
      const key = salon?.id ?? salon?.salonId ?? idx;
      if (!unique.has(key)) {
        unique.set(key, salon);
      }
    });
    return Array.from(unique.values()).sort((a, b) => {
      const nameA = a?.ad || a?.salonAdi || '';
      const nameB = b?.ad || b?.salonAdi || '';
      return trNumericCollator.compare(nameA, nameB);
    });
  }, [salonlar]);

  // Salon istatistik çipleri verisi - Üst seviyede memoize edildi
  const salonStatsChipsProps = useMemo(() => {
    if (yerlestirmeSonucu && Array.isArray(yerlestirmeSonucu.tumSalonlar)) {
      const countFilled = (salonKaydi) => {
        if (!salonKaydi) return 0;
        const uniqueStudentIds = new Set();

        const addStudent = (ogrenci) => {
          if (!ogrenci) return;
          const id = ogrenci.id !== undefined && ogrenci.id !== null ? String(ogrenci.id).trim() : null;
          if (id) {
            uniqueStudentIds.add(id);
          }
        };

        const addFromSeatArray = (seatArray) => {
          if (!Array.isArray(seatArray)) return;
          seatArray.forEach(seat => {
            if (seat?.ogrenci) {
              addStudent(seat.ogrenci);
            }
          });
        };

        addFromSeatArray(salonKaydi.masalar);

        if (!salonKaydi.masalar || salonKaydi.masalar.length === 0) {
          if (salonKaydi.gruplar) {
            const grupValues = Array.isArray(salonKaydi.gruplar)
              ? salonKaydi.gruplar
              : Object.values(salonKaydi.gruplar);
            grupValues.forEach(grup => addFromSeatArray(grup));
          }
          addFromSeatArray(salonKaydi.plan);
          addFromSeatArray(salonKaydi?.koltukMatrisi?.masalar);
          addFromSeatArray(salonKaydi?.salon?.masalar);

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
      const toplamOgrenci = yerlestirmeSonucu.istatistikler?.toplamOgrenci || (toplamYerlesen + toplamYerlesilemeyen);

      return {
        mode: 'plan',
        toplam: toplamOgrenci,
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
  }, [yerlestirmeSonucu, ogrenciler, globalOgrenciler]);

  // Alt çubuk istatistikleri - Tek geçişte ve memoize edildi
  const bottomStats = useMemo(() => {
    let kapasite = 0;
    if (sinif?.kapasite && typeof sinif.kapasite === 'number' && sinif.kapasite > 0) {
      kapasite = sinif.kapasite;
    } else if (sinif?.masalar && Array.isArray(sinif.masalar) && sinif.masalar.length > 0) {
      kapasite = sinif.masalar.length;
    } else if (sinif?.koltukMatrisi?.masalar && Array.isArray(sinif.koltukMatrisi.masalar) && sinif.koltukMatrisi.masalar.length > 0) {
      kapasite = sinif.koltukMatrisi.masalar.length;
    } else if (sinif?.siraDizilimi) {
      kapasite = (sinif.siraDizilimi.satir || 0) * (sinif.siraDizilimi.sutun || 0);
    }

    const sinifSeviyeleri = {};
    const seenIds = new Set();
    let yerlesenSayisi = 0;

    if (Array.isArray(ogrenciler)) {
      ogrenciler.forEach(ogrenci => {
        if (ogrenci && ogrenci.id && !seenIds.has(ogrenci.id)) {
          seenIds.add(ogrenci.id);
          yerlesenSayisi++;
          const sinifBilgisi = ogrenci.sinif || ogrenci.sube;
          if (sinifBilgisi) {
            const seviye = getSinifSeviyesi(sinifBilgisi);
            if (seviye) {
              sinifSeviyeleri[seviye] = (sinifSeviyeleri[seviye] || 0) + 1;
            }
          }
        }
      });
    }

    const gecerliSeviyeler = ['9', '10', '11', '12'];
    const seviyeDagilimi = Object.entries(sinifSeviyeleri)
      .filter(([seviye]) => gecerliSeviyeler.includes(seviye))
      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10));

    return {
      kapasite,
      yerlesenSayisi,
      seviyeDagilimi
    };
  }, [sinif, ogrenciler]);



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
        titleExtra={<SalonStatsChips {...salonStatsChipsProps} />}
        actions={
            <Box sx={{
              display: 'flex',
              gap: 1.25,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              {aktifPlanAdi ? (
                <Chip
                  icon={<BookmarkBorderIcon sx={{ fontSize: '1.05rem !important' }} />}
                  label={`Plan: ${aktifPlanAdi}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{
                    height: 34,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    maxWidth: { xs: '200px', sm: '260px' },
                    textTransform: 'none',
                    bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(79, 70, 229, 0.05)' : 'rgba(99, 102, 241, 0.1)',
                    borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(79, 70, 229, 0.25)' : 'rgba(99, 102, 241, 0.35)',
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }
                  }}
                  title={`Aktif Plan: ${aktifPlanAdi}`}
                />
              ) : null}

              {/* Geri Al / İleri Al Segmented Control */}
              {(onUndo || onRedo) && (
                <ButtonGroup
                  variant="outlined"
                  size="small"
                  aria-label="Geçmiş işlemleri geri ve ileri al"
                  sx={{
                    height: 34,
                    borderRadius: '10px',
                    bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(30, 41, 59, 0.5)',
                    boxShadow: 'none',
                    '& .MuiButton-root': {
                      height: 34,
                      px: 1.5,
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      borderColor: (theme) => theme.palette.mode === 'light' ? 'rgba(203, 213, 225, 0.9)' : 'rgba(71, 85, 105, 0.8)',
                    }
                  }}
                >
                  {onUndo && (
                    <Tooltip title="Son Yerleşim Değişikliğini Geri Al (Ctrl+Z)" arrow>
                      <span>
                        <Button
                          disabled={!canUndo || readOnly}
                          startIcon={<UndoIcon sx={{ fontSize: '1.1rem' }} />}
                          onClick={onUndo}
                          color="inherit"
                        >
                          Geri Al
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                  {onRedo && (
                    <Tooltip title="Geri Alınan Değişikliği Tekrar Uygula (Ctrl+Y)" arrow>
                      <span>
                        <Button
                          disabled={!canRedo || readOnly}
                          startIcon={<RedoIcon sx={{ fontSize: '1.1rem' }} />}
                          onClick={onRedo}
                          color="inherit"
                        >
                          İleri Al
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </ButtonGroup>
              )}

              <Divider orientation="vertical" flexItem sx={{ mx: 0.25, height: 22, alignSelf: 'center', borderColor: 'divider' }} />

              {/* Yerleşimi Temizle (Güvenli Buton) */}
              <Tooltip title="Tüm yerleştirme düzenini sıfırla" arrow>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<RestartAltIcon sx={{ fontSize: '1.15rem' }} />}
                  onClick={async () => {
                    const confirmed = await showConfirm('Tüm yerleştirme sonuçlarını temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.', 'Yerleşimi Sıfırla');
                    if (confirmed) {
                      if (typeof onOgrenciSec === 'function') {
                        onOgrenciSec('clear');
                      }
                    }
                  }}
                  sx={{
                    height: 34,
                    px: 1.5,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    borderRadius: '10px',
                    borderColor: 'error.main',
                    opacity: 0.9,
                    '&:hover': {
                      opacity: 1,
                    }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Yerleşimi </Box>Temizle
                </Button>
              </Tooltip>
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
          conflictsMap={conflictsMap}
          dndJustEnded={dndJustEnded}
        />


        {/* İstatistikler */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip
            label={`Toplam Kapasite: ${bottomStats.kapasite} koltuk`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Yerleşen: ${bottomStats.yerlesenSayisi} öğrenci`}
            color="success"
            variant="outlined"
          />
          {bottomStats.seviyeDagilimi.map(([seviye, sayi]) => (
            <Chip
              key={seviye}
              label={`${seviye}. Sınıf: ${sayi} öğrenci`}
              color={seviye === '9' ? 'primary' : seviye === '10' ? 'secondary' : seviye === '11' ? 'success' : 'warning'}
              variant="outlined"
            />
          ))}
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


