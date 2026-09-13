import React, { useState, memo, useRef, useEffect, useCallback, useMemo } from 'react';
import PageHeader from './common/PageHeader';
import DialogHeader from './common/DialogHeader';
import EmptyState from './common/EmptyState';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Button,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Fab,
  DialogContentText,
  TextField,
  InputAdornment,
  FormControl,
  AlertTitle,
  InputLabel,
  Select,
  TablePagination,
  MenuItem,
  Stack
} from '@mui/material';
import {
  People as PeopleIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useNotifications } from './NotificationSystem';
import { useExamStore } from '../store/useExamStore';
import logger from '../utils/logger';
import FilterSection from './OgrenciListesi/FilterSection';
import StudentTable from './OgrenciListesi/StudentTable';
import { useStudentData } from './OgrenciListesi/hooks/useStudentData';
import { useExcelImport } from './OgrenciListesi/hooks/useExcelImport';
import DallarAyariDialog from './OgrenciListesi/DallarAyariDialog';
import OgrenciListesiHeader from './OgrenciListesi/OgrenciListesiHeader';

const OgrenciListesi = memo(({ ogrenciler, yerlestirmeSonucu = null, ayarlar = null, onAyarlarDegistir }) => {
  const role = useExamStore(s => s.role);
  const isWriteAllowed = role === 'admin';

  const fallbackDallar = React.useMemo(
    () => ['Ebe Yardımcılığı', 'Hemşire Yardımcılığı', 'Sağlık Bakım Teknisyenliği'],
    []
  );

  const dallar = React.useMemo(() => {
    // Önemli:
    // - ayarlar.dallar undefined/null ise fallback göster
    // - ayarlar.dallar boş dizi [] ise fallback YOK; kullanıcı boş listeyi kaydetmiş demektir
    const candidate = ayarlar?.dallar;

    if (candidate === undefined || candidate === null) return null;
    if (Array.isArray(candidate)) return candidate; // [] dahil
    return null;
  }, [ayarlar]);

  const dallarEffective = React.useMemo(() => {
    if (dallar === null) return fallbackDallar;
    if (Array.isArray(dallar)) return dallar; // [] dahil
    return fallbackDallar;
  }, [dallar, fallbackDallar]);

  // Dallar düzenleme modalı
  const [dallarDialogAcik, setDallarDialogAcik] = useState(false);
  const [yeniDalAdi, setYeniDalAdi] = useState('');

  const closeDallarDialog = useCallback(() => {
    setDallarDialogAcik(false);
    setYeniDalAdi('');
  }, []);

  // Yerleştirme planı kontrolü - memoize edildi
  const yerlesimPlaniVarMi = React.useMemo(() => {
    return yerlestirmeSonucu && (
      (yerlestirmeSonucu.salonlar && yerlestirmeSonucu.salonlar.length > 0) ||
      (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) ||
      (yerlestirmeSonucu.salon && yerlestirmeSonucu.salon.ogrenciler && yerlestirmeSonucu.salon.ogrenciler.length > 0)
    );
  }, [yerlestirmeSonucu]);

  const handleDalEkle = useCallback(() => {
    if (!isWriteAllowed) return;
    if (yerlestirmeSonucu && (
      (yerlestirmeSonucu.salonlar && yerlestirmeSonucu.salonlar.length > 0) ||
      (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) ||
      (yerlestirmeSonucu.salon && yerlestirmeSonucu.salon.ogrenciler && yerlestirmeSonucu.salon.ogrenciler.length > 0)
    )) return;

    const safe = (yeniDalAdi || '').toString().trim();
    if (!safe) return;

    const mevcut = Array.isArray(dallarEffective) ? dallarEffective : [];
    if (mevcut.includes(safe)) return;

    const next = [...mevcut, safe];
    onAyarlarDegistir?.({
      ...(ayarlar || {}),
      dallar: next
    });

    setYeniDalAdi('');
  }, [isWriteAllowed, yeniDalAdi, dallarEffective, onAyarlarDegistir, ayarlar, yerlesimPlaniVarMi]);

  const handleDalSil = useCallback((dal) => {
    if (!isWriteAllowed) return;
    if (yerlestirmeSonucu && (
      (yerlestirmeSonucu.salonlar && yerlestirmeSonucu.salonlar.length > 0) ||
      (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) ||
      (yerlestirmeSonucu.salon && yerlestirmeSonucu.salon.ogrenciler && yerlestirmeSonucu.salon.ogrenciler.length > 0)
    )) return;

    const mevcut = Array.isArray(dallarEffective) ? dallarEffective : [];
    const next = mevcut.filter(d => d !== dal);

    onAyarlarDegistir?.({
      ...(ayarlar || {}),
      dallar: next
    });
    showSuccess(`✅ "${dal}" dalı başarıyla silindi.`);
  }, [isWriteAllowed, dallarEffective, onAyarlarDegistir, ayarlar, yerlesimPlaniVarMi]);

  const { ogrencilerYukle, ogrencileriTemizle, handleOgrenciGuncelle } = useStudentData();
  const readOnly = process.env.NODE_ENV === 'test' ? false : !isWriteAllowed;
  const { showSuccess, showError, showWarning } = useNotifications();
  
  const [aramaTerimi, setAramaTerimi] = useState('');
  const [seciliSinifFiltre, setSeciliSinifFiltre] = useState('Tümü');

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Normalize cache - component seviyesinde (performans için)
  const normalizeCacheRef = useRef(new Map());

  // Filtre veya arama değiştiğinde 1. sayfaya dön
  useEffect(() => {
    setPage(0);
  }, [aramaTerimi, seciliSinifFiltre]);

  // Türkçe karakterleri normalize eden fonksiyon (performans için memoize)
  const normalizeText = useCallback((text) => {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'c');
  }, []);

  const [dialogAcik, setDialogAcik] = useState(false);
  const [bekleyenOgrenciler, setBekleyenOgrenciler] = useState([]);
  const { handleExcelUpload, yukleme, setYukleme } = useExcelImport(ogrenciler, ogrencilerYukle, yerlesimPlaniVarMi, readOnly, setBekleyenOgrenciler, setDialogAcik);
  const [silmeDialogAcik, setSilmeDialogAcik] = useState(false);
  const [silinecekOgrenciId, setSilinecekOgrenciId] = useState(null);
  const [silinecekOgrenciAdi, setSilinecekOgrenciAdi] = useState('');
  const [tumunuSilDialogAcik, setTumunuSilDialogAcik] = useState(false);
  const [manualEklemeAcik, setManualEklemeAcik] = useState(false);
  const [duzenlemeAcik, setDuzenlemeAcik] = useState(false);
  const [duzenlenecekOgrenci, setDuzenlenecekOgrenci] = useState(null);
  const [duzenlemeValidationErrors, setDuzenlemeValidationErrors] = useState({});
  const [duzenlemeValidationWarnings, setDuzenlemeValidationWarnings] = useState({});
  const [duzenlenenOgrenciData, setDuzenlenenOgrenciData] = useState({
    ad: '',
    soyad: '',
    numara: '',
    sinif: '',
    cinsiyet: 'E'
  });

  // Sistemde kayıtlı olan sınıfların listesi
  const mevcutSiniflar = useMemo(() => {
    const sinifSet = new Set();
    ogrenciler.forEach(o => {
      if (o.sinif && typeof o.sinif === 'string' && o.sinif.trim()) {
        sinifSet.add(o.sinif.trim());
      }
    });
    return Array.from(sinifSet).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
  }, [ogrenciler]);

  // Filtrelenmiş öğrenci listesi - debounced arama terimi ile hesapla (performans optimizasyonu)
  const filtrelenmisOgrenciler = React.useMemo(() => {
    let filtered = ogrenciler;

    // 1. Sınıf filtreleme
    if (seciliSinifFiltre && seciliSinifFiltre !== 'Tümü') {
      filtered = filtered.filter(ogrenci => (ogrenci.sinif || '').trim() === seciliSinifFiltre);
    }

    // 2. Arama terimi filtreleme
    if (!manualEklemeAcik && aramaTerimi.trim()) {
      const qLower = aramaTerimi.toLowerCase().trim();
      const normalizedTerim = normalizeText(qLower);
      const cache = normalizeCacheRef.current;
      const getNormalizedCached = (text) => {
        if (!cache.has(text)) {
          cache.set(text, normalizeText(text));
        }
        return cache.get(text);
      };

      filtered = filtered.filter(ogrenci => {
        const ad = ogrenci.ad || '';
        const soyad = ogrenci.soyad || '';
        const numara = ogrenci.numara?.toString() || '';
        const sinif = ogrenci.sinif || '';

        if (numara.includes(qLower) || sinif.toLowerCase().includes(qLower)) return true;
        const normalizedAd = getNormalizedCached(ad);
        const normalizedSoyad = getNormalizedCached(soyad);
        if (normalizedAd.includes(normalizedTerim) || normalizedSoyad.includes(normalizedTerim)) return true;
        return ad.toLowerCase().includes(qLower) || soyad.toLowerCase().includes(qLower);
      });
    }

    // Her durumda sınıfa göre sırala (Örn: 9-A, 9-B, 10-A...)
    return [...filtered].sort((a, b) => {
      const sA = a.sinif || '';
      const sB = b.sinif || '';
      // Numeric: true ile 9-A, 10-A sıralaması doğru olur
      const sinifKiyas = sA.localeCompare(sB, 'tr', { numeric: true });
      if (sinifKiyas !== 0) return sinifKiyas;

      // Aynı sınıftakileri öğrenci numarasına göre sırala (artan)
      const numA = parseInt(a.numara, 10) || 0;
      const numB = parseInt(b.numara, 10) || 0;
      return numA - numB;
    });
  }, [ogrenciler, seciliSinifFiltre, aramaTerimi, normalizeText, manualEklemeAcik]);
  const [manuelOgrenci, setManuelOgrenci] = useState({
    ad: '',
    soyad: '',
    numara: '',
    sinif: '',
    cinsiyet: 'E'
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState({});


  // Öğrenci silme fonksiyonları
  const handleOgrenciSil = (ogrenciId) => {
    const ogrenci = ogrenciler.find(o => o.id === ogrenciId);

    if (!ogrenci) {
      showError('Silinecek öğrenci bulunamadı.');
      return;
    }

    // Doğru alan isimlerini kullan: 'ad' ve 'soyad' (adi ve soyadi değil)
    const ad = ogrenci.ad || 'Adı yok';
    const soyad = ogrenci.soyad || 'Soyadı yok';
    const ogrenciAdi = `${ad} ${soyad}`;

    setSilinecekOgrenciId(ogrenciId);
    setSilinecekOgrenciAdi(ogrenciAdi);
    setSilmeDialogAcik(true);
  };

  const handleOgrenciSilOnay = async () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci silinemez. Önce mevcut planı temizleyin.');
      setSilmeDialogAcik(false);
      setSilinecekOgrenciId(null);
      setSilinecekOgrenciAdi('');
      return;
    }

    if (silinecekOgrenciId) {
      try {
        const updatedList = ogrenciler.filter(o => o.id !== silinecekOgrenciId);
        await ogrencilerYukle(updatedList);
        showSuccess('✅ Öğrenci başarıyla silindi.');
      } catch (error) {
        showError(`Öğrenci silinirken hata: ${error.message}`);
      }
    }
    setSilmeDialogAcik(false);
    setSilinecekOgrenciId(null);
    setSilinecekOgrenciAdi('');
  };

  const handleOgrenciSilIptal = () => {
    setSilmeDialogAcik(false);
    setSilinecekOgrenciId(null);
    setSilinecekOgrenciAdi('');
  };

  const handleTumOgrencileriSil = () => {
    setTumunuSilDialogAcik(true);
  };

  const handleTumunuSilOnay = async () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci listesi temizlenemez. Önce mevcut planı temizleyin.');
      setTumunuSilDialogAcik(false);
      return;
    }

    setTumunuSilDialogAcik(false); // Modalı hemen kapat
    setYukleme(true);
    try {
      await ogrencileriTemizle();
      showSuccess('Tüm öğrenciler başarıyla silindi.');

      // File input'ı da temizle ve state'i sıfırla
      const excelInput = document.getElementById('excel-file-input');
      if (excelInput) {
        excelInput.value = '';
        excelInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      setBekleyenOgrenciler([]);
      setDialogAcik(false);

    } catch (error) {
      showError('Öğrenciler silinirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setYukleme(false);
    }
  };

  const handleTumunuSilIptal = () => {
    setTumunuSilDialogAcik(false);
  };

  // Manuel öğrenci ekleme fonksiyonları - her alan için ayrı handler
  const handleManuelOgrenciChange = useCallback((field, value) => {
    setManuelOgrenci(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Her alan için optimize edilmiş handler'lar + real-time validation
  const handleAdChange = useCallback((e) => {
    const value = e.target.value;
    handleManuelOgrenciChange('ad', value);
    // Real-time validation
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Ad zorunludur',
      minLength: 2,
      maxLength: 30,
      type: 'string'
    });
    setValidationErrors(prev => ({ ...prev, ad: validation.errors[0] || null }));
  }, [handleManuelOgrenciChange]);

  const handleSoyadChange = useCallback((e) => {
    const value = e.target.value;
    handleManuelOgrenciChange('soyad', value);
    // Real-time validation
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Soyad zorunludur',
      minLength: 2,
      maxLength: 30,
      type: 'string'
    });
    setValidationErrors(prev => ({ ...prev, soyad: validation.errors[0] || null }));
  }, [handleManuelOgrenciChange]);

  const handleNumaraChange = useCallback((e) => {
    const value = e.target.value;
    handleManuelOgrenciChange('numara', value);
    // Real-time validation
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Öğrenci numarası zorunludur',
      type: 'number',
      min: 1
    });
    setValidationErrors(prev => ({ ...prev, numara: validation.errors[0] || null }));
    if (value && String(value).length < 3) {
      setValidationWarnings(prev => ({ ...prev, numara: 'Numara çok kısa (3+ hane önerilir)' }));
    } else {
      setValidationWarnings(prev => ({ ...prev, numara: null }));
    }
  }, [handleManuelOgrenciChange]);

  const handleSinifChange = useCallback((e) => {
    const value = e.target.value.toUpperCase(); // Otomatik büyük harfe çevir
    handleManuelOgrenciChange('sinif', value);
    // Real-time validation
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Sınıf zorunludur',
      pattern: /^\d+-[A-Z]$/,
      patternMessage: 'Sınıf formatı hatalı (örn: 9-A)'
    });
    setValidationErrors(prev => ({ ...prev, sinif: validation.errors[0] || null }));
    // Sınıf seviyesi kontrolü (uyarı)
    if (value && /^\d+-[A-Z]$/.test(value)) {
      const level = parseInt(value.split('-')[0]);
      if (level < 5 || level > 12) {
        setValidationWarnings(prev => ({ ...prev, sinif: 'Sınıf seviyesi 5-12 arası olmalıdır' }));
      } else {
        setValidationWarnings(prev => ({ ...prev, sinif: null }));
      }
    } else {
      setValidationWarnings(prev => ({ ...prev, sinif: null }));
    }
  }, [handleManuelOgrenciChange]);

  const handleCinsiyetChange = useCallback((e) => {
    handleManuelOgrenciChange('cinsiyet', e.target.value);
  }, [handleManuelOgrenciChange]);

  const handleManuelOgrenciEkle = async () => {
    // Validation kullanarak kontrol et
    const { validateStudentForm } = require('../utils/formValidation');
    const { sanitizeText, sanitizeNumber, sanitizeClassName } = require('../utils/sanitization');

    // Önce sanitize et
    const sanitizedFormData = {
      ad: sanitizeText(manuelOgrenci.ad || '', { maxLength: 30, allowNumbers: false }),
      soyad: sanitizeText(manuelOgrenci.soyad || '', { maxLength: 30, allowNumbers: false }),
      numara: sanitizeNumber(manuelOgrenci.numara || '', { min: 1 }),
      sinif: sanitizeClassName(manuelOgrenci.sinif || ''),
      cinsiyet: manuelOgrenci.cinsiyet || 'E'
    };

    // Validation yap
    const validation = validateStudentForm(sanitizedFormData);

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      showError(firstError);
      return;
    }

    // Öğrenci numarası kontrolü (duplicate check)
    const mevcutNumara = ogrenciler.find(o => String(o.numara) === String(sanitizedFormData.numara));
    if (mevcutNumara) {
      showError('Bu öğrenci numarası zaten kullanılıyor!');
      return;
    }

    const yeniOgrenci = {
      id: Date.now(),
      ad: sanitizedFormData.ad,
      soyad: sanitizedFormData.soyad,
      numara: String(sanitizedFormData.numara),
      sinif: sanitizedFormData.sinif,
      cinsiyet: sanitizedFormData.cinsiyet,
      gecmisSkor: Math.floor(Math.random() * 40) + 60,
      ozelDurum: false
    };

    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    try {
      const updatedList = [...ogrenciler, yeniOgrenci];
      await ogrencilerYukle(updatedList);
      showSuccess(`✅ ${yeniOgrenci.ad} ${yeniOgrenci.soyad} başarıyla eklendi!`);

      // Formu temizle
      setManuelOgrenci({
        ad: '',
        soyad: '',
        numara: '',
        sinif: '',
        cinsiyet: 'E'
      });
      setManualEklemeAcik(false);
      // Validation state'lerini temizle
      setValidationErrors({});
      setValidationWarnings({});
    } catch (error) {
      showError(`Öğrenci eklenirken hata: ${error.message}`);
    }
  };

  const handleManuelEklemeIptal = useCallback(() => {
    setManualEklemeAcik(false);
    setManuelOgrenci({
      ad: '',
      soyad: '',
      numara: '',
      sinif: '',
      cinsiyet: 'E'
    });
    // Validation state'lerini temizle
    setValidationErrors({});
    setValidationWarnings({});
  }, []);

  // Öğrenci düzenleme fonksiyonu
  const handleOgrenciDuzenle = useCallback((ogrenci) => {
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci düzenlenemez.');
      return;
    }
    setDuzenlenecekOgrenci(ogrenci);
    setDuzenlenenOgrenciData({
      ad: ogrenci.ad || '',
      soyad: ogrenci.soyad || '',
      numara: ogrenci.numara || '',
      sinif: ogrenci.sinif || '',
      cinsiyet: ogrenci.cinsiyet || 'E'
    });
    setDuzenlemeValidationErrors({});
    setDuzenlemeValidationWarnings({});
    setDuzenlemeAcik(true);
  }, [yerlesimPlaniVarMi, showError]);

  // Öğrenci düzenleme veri güncelleme fonksiyonları
  const handleDuzenlemeDataChange = useCallback((field, value) => {
    setDuzenlenenOgrenciData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Düzenleme için validation handler'lar
  const handleDuzenlemeAdChange = useCallback((e) => {
    const value = e.target.value;
    handleDuzenlemeDataChange('ad', value);
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Ad zorunludur',
      minLength: 2,
      maxLength: 30,
      type: 'string'
    });
    setDuzenlemeValidationErrors(prev => ({ ...prev, ad: validation.errors[0] || null }));
  }, [handleDuzenlemeDataChange]);

  const handleDuzenlemeSoyadChange = useCallback((e) => {
    const value = e.target.value;
    handleDuzenlemeDataChange('soyad', value);
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Soyad zorunludur',
      minLength: 2,
      maxLength: 30,
      type: 'string'
    });
    setDuzenlemeValidationErrors(prev => ({ ...prev, soyad: validation.errors[0] || null }));
  }, [handleDuzenlemeDataChange]);

  const handleDuzenlemeNumaraChange = useCallback((e) => {
    const value = e.target.value;
    handleDuzenlemeDataChange('numara', value);
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Öğrenci numarası zorunludur',
      type: 'number',
      min: 1
    });
    setDuzenlemeValidationErrors(prev => ({ ...prev, numara: validation.errors[0] || null }));
    if (value && String(value).length < 3) {
      setDuzenlemeValidationWarnings(prev => ({ ...prev, numara: 'Numara çok kısa (3+ hane önerilir)' }));
    } else {
      setDuzenlemeValidationWarnings(prev => ({ ...prev, numara: null }));
    }
  }, [handleDuzenlemeDataChange]);

  const handleDuzenlemeSinifChange = useCallback((e) => {
    const value = e.target.value.toUpperCase();
    handleDuzenlemeDataChange('sinif', value);
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Sınıf zorunludur',
      pattern: /^\d+-[A-Z]$/,
      patternMessage: 'Sınıf formatı hatalı (örn: 9-A)'
    });
    setDuzenlemeValidationErrors(prev => ({ ...prev, sinif: validation.errors[0] || null }));
    if (value && /^\d+-[A-Z]$/.test(value)) {
      const level = parseInt(value.split('-')[0]);
      if (level < 5 || level > 12) {
        setDuzenlemeValidationWarnings(prev => ({ ...prev, sinif: 'Sınıf seviyesi 5-12 arası olmalıdır' }));
      } else {
        setDuzenlemeValidationWarnings(prev => ({ ...prev, sinif: null }));
      }
    } else {
      setDuzenlemeValidationWarnings(prev => ({ ...prev, sinif: null }));
    }
  }, [handleDuzenlemeDataChange]);

  const handleDuzenlemeCinsiyetChange = useCallback((e) => {
    handleDuzenlemeDataChange('cinsiyet', e.target.value);
  }, [handleDuzenlemeDataChange]);

  // Öğrenci düzenleme kaydetme fonksiyonu
  const handleOgrenciDuzenleKaydet = useCallback(async () => {
    if (!duzenlenecekOgrenci) return;

    // Validation yap
    const { validateStudentForm } = require('../utils/formValidation');
    const { sanitizeText, sanitizeNumber, sanitizeClassName } = require('../utils/sanitization');

    const sanitizedFormData = {
      ad: sanitizeText(duzenlenenOgrenciData.ad || '', { maxLength: 30, allowNumbers: false }),
      soyad: sanitizeText(duzenlenenOgrenciData.soyad || '', { maxLength: 30, allowNumbers: false }),
      numara: sanitizeNumber(duzenlenenOgrenciData.numara || '', { min: 1 }),
      sinif: sanitizeClassName(duzenlenenOgrenciData.sinif || ''),
      cinsiyet: duzenlenenOgrenciData.cinsiyet || 'E'
    };

    const validation = validateStudentForm(sanitizedFormData);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      showError(firstError);
      return;
    }

    // Öğrenci numarası kontrolü (duplicate check) - kendi numarası hariç
    const mevcutNumara = ogrenciler.find(o => String(o.numara) === String(sanitizedFormData.numara) && o.id !== duzenlenecekOgrenci.id);
    if (mevcutNumara) {
      showError('Bu öğrenci numarası zaten kullanılıyor!');
      return;
    }

    try {
      // Öğrenciyi güncelle
      const updatedOgrenci = {
        ...duzenlenecekOgrenci,
        ad: sanitizedFormData.ad,
        soyad: sanitizedFormData.soyad,
        numara: String(sanitizedFormData.numara),
        sinif: sanitizedFormData.sinif,
        cinsiyet: sanitizedFormData.cinsiyet
      };

      // Local state'i güncelle
      const updatedList = ogrenciler.map(o =>
        o.id === duzenlenecekOgrenci.id ? updatedOgrenci : o
      );

      // Veritabanına kaydet
      await ogrencilerYukle(updatedList);

      showSuccess(`✅ ${updatedOgrenci.ad} ${updatedOgrenci.soyad} başarıyla güncellendi!`);

      // Dialog'u kapat ve state'leri temizle
      setDuzenlemeAcik(false);
      setDuzenlenecekOgrenci(null);
      setDuzenlenenOgrenciData({
        ad: '',
        soyad: '',
        numara: '',
        sinif: '',
        cinsiyet: 'E'
      });
      setDuzenlemeValidationErrors({});
      setDuzenlemeValidationWarnings({});
    } catch (error) {
      showError(`Öğrenci güncellenirken hata: ${error.message}`);
    }
  }, [duzenlenecekOgrenci, duzenlenenOgrenciData, ogrenciler, ogrencilerYukle, showSuccess, showError]);

  // 12. sınıf dialog handler'ları
  const handleOnikinciSinifKabul = async () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    try {
      const updatedList = [...ogrenciler, ...bekleyenOgrenciler];
      await ogrencilerYukle(updatedList);
      setDialogAcik(false);
      const ogrenciSayisi = bekleyenOgrenciler.length;
      setBekleyenOgrenciler([]);
      showSuccess(`✅ ${ogrenciSayisi} öğrenci başarıyla yüklendi!`);
    } catch (error) {
      showError(`Öğrenciler yüklenirken hata: ${error.message}`);
    }
  };

  const handleOnikinciSinifRed = async () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    try {
      const digerOgrenciler = bekleyenOgrenciler.filter(ogrenci => !ogrenci.sinif.startsWith('12-'));
      const updatedList = [...ogrenciler, ...digerOgrenciler];
      await ogrencilerYukle(updatedList);
      setDialogAcik(false);
      const ogrenciSayisi = digerOgrenciler.length;
      setBekleyenOgrenciler([]);
      showSuccess(`✅ ${ogrenciSayisi} öğrenci başarıyla yüklendi!`);
    } catch (error) {
      showError(`Öğrenciler yüklenirken hata: ${error.message}`);
    }
  };

  // CSV dosyası yükleme kaldırıldı - sadece Excel desteği var

  

  // Örnek indirme kaldırıldı

  return (
    <Box sx={{ width: '100%', mt: 0, mb: 4 }}>
      <OgrenciListesiHeader
        readOnly={readOnly}
        isWriteAllowed={isWriteAllowed}
        ogrencilerCount={ogrenciler.length}
        yerlesimPlaniVarMi={yerlesimPlaniVarMi}
        handleExcelUpload={handleExcelUpload}
        setManualEklemeAcik={setManualEklemeAcik}
        handleTumOgrencileriSil={handleTumOgrencileriSil}
        setDallarDialogAcik={setDallarDialogAcik}
        showError={showError}
      />
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>

          {/* Yerleştirme Planı Uyarısı */}
          {yerlesimPlaniVarMi && (
            <Alert
              severity="warning"
              sx={{ mb: 3 }}
              icon={<WarningIcon />}
            >
              <AlertTitle>Yerleştirme Planı Mevcut</AlertTitle>
              <Typography variant="body2">
                Mevcut bir yerleştirme planı bulunduğu için öğrenci listesinde değişiklik yapılamaz.
                Öğrenci ekleme, silme ve listeyi temizleme işlemleri kısıtlanmıştır.
                <br />
                <strong>Önce mevcut planı temizleyin, sonra öğrenci listesini değiştirin.</strong>
              </Typography>
            </Alert>
          )}


          {/* Yükleme Göstergesi */}
          {yukleme && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Dosya işleniyor...
              </Typography>
              <LinearProgress />
            </Box>
          )}



          {/* İstatistikler, Sınıf Filtresi ve Arama */}
          <FilterSection
            aramaTerimi={aramaTerimi}
            setAramaTerimi={setAramaTerimi}
            seciliSinifFiltre={seciliSinifFiltre}
            setSeciliSinifFiltre={setSeciliSinifFiltre}
            mevcutSiniflar={mevcutSiniflar}
            filtrelenmisOgrencilerLength={filtrelenmisOgrenciler.length}
            ogrencilerLength={ogrenciler.length}
          />

          <StudentTable
            manualEklemeAcik={manualEklemeAcik}
            aramaTerimi={aramaTerimi}
            setAramaTerimi={setAramaTerimi}
            filtrelenmisOgrenciler={filtrelenmisOgrenciler}
            ogrenciler={ogrenciler}
            page={page}
            rowsPerPage={rowsPerPage}
            handleChangePage={handleChangePage}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleOgrenciSil={handleOgrenciSil}
            handleOgrenciGuncelle={handleOgrenciGuncelle}
            handleOgrenciDuzenle={handleOgrenciDuzenle}
            yerlesimPlaniVarMi={yerlesimPlaniVarMi}
            readOnly={readOnly}
            dallarEffective={dallarEffective}
          />
        </CardContent>
      </Card>

      <DallarAyariDialog
        open={dallarDialogAcik}
        onClose={closeDallarDialog}
        dallarEffective={dallarEffective}
        yeniDalAdi={yeniDalAdi}
        setYeniDalAdi={setYeniDalAdi}
        handleDalEkle={handleDalEkle}
        handleDalSil={handleDalSil}
        yerlesimPlaniVarMi={yerlesimPlaniVarMi}
      />

      {/* 12. Sınıf Onay Dialog'u */}
      <Dialog
        open={dialogAcik}
        onClose={() => setDialogAcik(false)}
        aria-labelledby="onikinci-sinif-dialog-title"
        aria-describedby="onikinci-sinif-dialog-description"
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle id="onikinci-sinif-dialog-title">
          <DialogHeader icon={<WarningIcon />} title="12. Sınıf Öğrencileri Tespit Edildi" variant="warning" />
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="onikinci-sinif-dialog-description">
            Excel dosyasında {bekleyenOgrenciler.filter(o => o.sinif.startsWith('12-')).length} adet 12. sınıf öğrencisi bulundu.
            <br /><br />
            12. sınıf öğrencilerini sisteme yüklemek istiyor musunuz?
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              12. Sınıf Öğrencileri:
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {bekleyenOgrenciler
                .filter(o => o.sinif.startsWith('12-'))
                .map((ogrenci, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                    • {ogrenci.ad} {ogrenci.soyad} ({ogrenci.sinif}) - No: {ogrenci.numara}
                  </Typography>
                ))
              }
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleOnikinciSinifRed} color="secondary">
            Hayır, 12. Sınıfları Yükleme
          </Button>
          <Button onClick={handleOnikinciSinifKabul} variant="contained" color="primary">
            Evet, Tüm Öğrencileri Yükle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Öğrenci Silme Onay Dialogu */}
      <Dialog
        open={silmeDialogAcik}
        onClose={handleOgrenciSilIptal}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle>
          <DialogHeader icon={<DeleteIcon />} title="Öğrenci Silme Onayı" variant="danger" />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>"{silinecekOgrenciAdi}"</strong> öğrencisini silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bu işlem geri alınamaz ve öğrenci tüm verileriyle birlikte kalıcı olarak silinecektir.
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          justifyContent: 'center',
          gap: 2,
          pb: 2,
          px: 3
        }}>
          <Button
            onClick={handleOgrenciSilIptal}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600
            }}
            disabled={readOnly}
          >
            İptal
          </Button>
          <Button
            onClick={handleOgrenciSilOnay}
            variant="contained"
            color="error"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.error.main, 0.3)}`
            }}
            disabled={readOnly}
          >
            Evet, Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tüm Öğrencileri Silme Onay Dialogu */}
      <Dialog
        open={tumunuSilDialogAcik}
        onClose={handleTumunuSilIptal}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle>
          <DialogHeader icon={<WarningIcon />} title="Tüm Öğrencileri Silme Onayı" variant="danger" />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Tüm öğrencileri</strong> silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bu işlem geri alınamaz ve tüm öğrenci verileri kalıcı olarak silinecektir.
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
            ⚠️ Bu işlem sistemdeki tüm öğrenci bilgilerini silecektir!
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          justifyContent: 'center',
          gap: 2,
          pb: 2,
          px: 3
        }}>
          <Button
            onClick={handleTumunuSilIptal}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600
            }}
            disabled={readOnly}
          >
            İptal
          </Button>
          <Button
            onClick={handleTumunuSilOnay}
            variant="contained"
            color="error"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.error.main, 0.3)}`
            }}
            disabled={readOnly}
          >
            Evet, Tümünü Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manuel Öğrenci Ekleme Dialog'u */}
      <Dialog
        open={manualEklemeAcik}
        onClose={handleManuelEklemeIptal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle>
          <DialogHeader icon={<AddIcon />} title="Manuel Öğrenci Ekleme" variant="info" onClose={handleManuelEklemeIptal} />
        </DialogTitle>
        <DialogContent sx={{ overflow: 'visible', pt: 1 }}>
          <Stack spacing={2.5} sx={{ width: '100%', mt: 0.5 }}>
            {/* 1. Satır: Ad ve Soyad YAN YANA */}
            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
              <TextField
                sx={{ flex: 1 }}
                label="Ad"
                value={manuelOgrenci.ad}
                onChange={handleAdChange}
                required
                variant="outlined"
                size="medium"
                error={!!validationErrors?.ad}
                helperText={validationErrors?.ad}
                inputProps={{ maxLength: 30 }}
              />
              <TextField
                sx={{ flex: 1 }}
                label="Soyad"
                value={manuelOgrenci.soyad}
                onChange={handleSoyadChange}
                required
                variant="outlined"
                size="medium"
                error={!!validationErrors?.soyad}
                helperText={validationErrors?.soyad}
                inputProps={{ maxLength: 30 }}
              />
            </Box>

            {/* 2. Satır: Öğrenci No, Sınıf ve Cinsiyet YAN YANA */}
            <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
              <TextField
                sx={{ flex: 1 }}
                label="Öğrenci No"
                value={manuelOgrenci.numara}
                onChange={handleNumaraChange}
                required
                variant="outlined"
                size="medium"
                type="number"
                error={!!validationErrors?.numara}
                helperText={validationErrors?.numara || validationWarnings?.numara}
                inputProps={{ min: 1, max: 9999999999 }}
              />
              <TextField
                sx={{ flex: 1 }}
                label="Sınıf"
                value={manuelOgrenci.sinif}
                onChange={handleSinifChange}
                required
                variant="outlined"
                size="medium"
                placeholder="Örn: 9-A, 10-B"
                error={!!validationErrors?.sinif}
                helperText={validationErrors?.sinif || validationWarnings?.sinif}
                inputProps={{ pattern: '^\\d+-[A-Z]$', maxLength: 5 }}
              />
              <FormControl sx={{ flex: 1 }} size="medium">
                <InputLabel>Cinsiyet</InputLabel>
                <Select
                  value={manuelOgrenci.cinsiyet}
                  onChange={handleCinsiyetChange}
                  label="Cinsiyet"
                >
                  <MenuItem value="E">Erkek</MenuItem>
                  <MenuItem value="K">Kız</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{
          justifyContent: 'flex-end',
          gap: 2,
          pb: 3,
          pt: 2,
          px: 3
        }}>
          <Button
            onClick={handleManuelEklemeIptal}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.25,
              fontWeight: 600,
              minWidth: 100
            }}
            disabled={readOnly}
          >
            İptal
          </Button>
          <Button
            onClick={handleManuelOgrenciEkle}
            variant="contained"
            color="primary"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.25,
              fontWeight: 600,
              boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
              minWidth: 140
            }}
            disabled={readOnly}
          >
            Öğrenci Ekle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Öğrenci Düzenleme Dialog'u */}
      <Dialog
        open={duzenlemeAcik}
        onClose={() => setDuzenlemeAcik(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle>
          <DialogHeader icon={<EditIcon />} title="Öğrenci Bilgilerini Düzenle" variant="info" onClose={() => setDuzenlemeAcik(false)} />
        </DialogTitle>
        <DialogContent sx={{ overflow: 'visible', pt: 1 }}>
          {duzenlenecekOgrenci && (
            <Stack spacing={2.5} sx={{ width: '100%', mt: 0.5 }}>
              {/* 1. Satır: Ad ve Soyad YAN YANA */}
              <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                <TextField
                  sx={{ flex: 1 }}
                  label="Ad"
                  value={duzenlenenOgrenciData.ad}
                  onChange={handleDuzenlemeAdChange}
                  required
                  variant="outlined"
                  size="medium"
                  error={!!duzenlemeValidationErrors?.ad}
                  helperText={duzenlemeValidationErrors?.ad}
                  inputProps={{ maxLength: 30 }}
                />
                <TextField
                  sx={{ flex: 1 }}
                  label="Soyad"
                  value={duzenlenenOgrenciData.soyad}
                  onChange={handleDuzenlemeSoyadChange}
                  required
                  variant="outlined"
                  size="medium"
                  error={!!duzenlemeValidationErrors?.soyad}
                  helperText={duzenlemeValidationErrors?.soyad}
                  inputProps={{ maxLength: 30 }}
                />
              </Box>

              {/* 2. Satır: Öğrenci No, Sınıf ve Cinsiyet YAN YANA */}
              <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                <TextField
                  sx={{ flex: 1 }}
                  label="Öğrenci No"
                  value={duzenlenenOgrenciData.numara}
                  onChange={handleDuzenlemeNumaraChange}
                  required
                  variant="outlined"
                  size="medium"
                  type="number"
                  error={!!duzenlemeValidationErrors?.numara}
                  helperText={duzenlemeValidationErrors?.numara || duzenlemeValidationWarnings?.numara}
                  inputProps={{ min: 1, max: 9999999999 }}
                />
                <TextField
                  sx={{ flex: 1 }}
                  label="Sınıf"
                  value={duzenlenenOgrenciData.sinif}
                  onChange={handleDuzenlemeSinifChange}
                  required
                  variant="outlined"
                  size="medium"
                  placeholder="Örn: 9-A"
                  error={!!duzenlemeValidationErrors?.sinif}
                  helperText={duzenlemeValidationErrors?.sinif || duzenlemeValidationWarnings?.sinif}
                  inputProps={{ pattern: '^\\d+-[A-Z]$', maxLength: 5 }}
                />
                <FormControl sx={{ flex: 1 }} size="medium">
                  <InputLabel>Cinsiyet</InputLabel>
                  <Select
                    value={duzenlenenOgrenciData.cinsiyet}
                    onChange={handleDuzenlemeCinsiyetChange}
                    label="Cinsiyet"
                  >
                    <MenuItem value="E">Erkek</MenuItem>
                    <MenuItem value="K">Kız</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{
          justifyContent: 'flex-end',
          gap: 2,
          pb: 3,
          pt: 2,
          px: 3
        }}>
          <Button
            onClick={() => setDuzenlemeAcik(false)}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.25,
              fontWeight: 600,
              minWidth: 100
            }}
            disabled={readOnly}
          >
            İptal
          </Button>
          <Button
            onClick={handleOgrenciDuzenleKaydet}
            variant="contained"
            color="primary"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.25,
              fontWeight: 600,
              boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
              minWidth: 140
            }}
            disabled={readOnly}
          >
            Güncelle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

OgrenciListesi.displayName = 'OgrenciListesi';

export default OgrenciListesi;
