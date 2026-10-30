import React, { useState, memo, useRef, useEffect, useCallback, useMemo } from 'react';
import deepEqual from '../utils/deepEqual';
import PageHeader from './common/PageHeader';
import DialogHeader from './common/DialogHeader';
import EmptyState from './common/EmptyState';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  IconButton,
  Select,
  MenuItem,
  Paper,
  Switch,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Tooltip,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  MeetingRoom as MeetingRoomIcon,
  Chair as ChairIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
  ArrowForward as ArrowForwardIcon,
  AutoAwesome as AutoAwesomeIcon,
  CopyAll as CopyAllIcon,
  SortByAlpha as SortByAlphaIcon,
  Search as SearchIcon,
  Bolt as BoltIcon
} from '@mui/icons-material';
import { useExamStore } from '../store/useExamStore';
import { useNotifications } from './NotificationSystem';
import { useExamSelector } from '../context/ExamContext';
import logger from '../utils/logger';

// ==========================================
// 1. KOMPAKT TEK SATIRLIK SALON SATIRI (ROW)
// ==========================================
const SalonRow = memo(({
  form,
  index,
  onFormChange,
  onFormDelete,
  onFormCopy,
  onEqualizeGroups,
  onApplyToAll,
  yerlesimPlaniVarMi,
  topluSilmeModu,
  seciliSalonlar,
  onSalonSecimi,
  shouldFocus,
  onFocusDone
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (onFocusDone) onFocusDone();
    }
  }, [shouldFocus, onFocusDone]);

  const carpan = form.siraTipi === 'tekli' ? 1 : 2;
  const toplamSiraSayisi = form.gruplar?.reduce((sum, g) => sum + (parseInt(g.siraSayisi) || 0), 0) || 0;
  const toplamKapasite = toplamSiraSayisi * carpan;
  const isLocked = yerlesimPlaniVarMi && yerlesimPlaniVarMi();

  return (
    <TableRow
      hover
      sx={{
        opacity: form.aktif ? 1 : 0.6,
        bgcolor: form.aktif ? 'inherit' : (theme) => theme.palette.mode === 'light' ? '#fbfbfb' : 'rgba(255,255,255,0.02)',
        transition: 'background-color 0.15s ease',
        '&:hover': {
          bgcolor: (theme) => theme.palette.mode === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.04)'
        }
      }}
    >
      {/* Toplu Silme Checkbox */}
      {topluSilmeModu && (
        <TableCell width={36} sx={{ py: 0.75, px: 0.5, textAlign: 'center' }}>
          <Checkbox
            checked={seciliSalonlar.includes(form.id)}
            onChange={(e) => onSalonSecimi(form.id, e.target.checked)}
            size="small"
            sx={{ p: 0.25 }}
          />
        </TableCell>
      )}

      {/* İndeks No (#1, #2) */}
      <TableCell width={40} sx={{ py: 0.75, px: 0.75, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.8rem' }}>
          #{index + 1}
        </Typography>
      </TableCell>

      {/* Salon Adı */}
      <TableCell width={130} sx={{ py: 0.75, px: 0.75 }}>
        <TextField
          inputRef={inputRef}
          value={form.salonAdi}
          onChange={(e) => onFormChange(form.id, 'salonAdi', e.target.value)}
          placeholder="Örn: 9/A"
          size="small"
          disabled={isLocked}
          sx={{
            width: '100%',
            '& .MuiOutlinedInput-root': {
              height: 32,
              fontSize: '0.88rem',
              fontWeight: 700,
              bgcolor: 'background.paper'
            }
          }}
        />
      </TableCell>

      {/* Sıra Tipi */}
      <TableCell width={115} sx={{ py: 0.75, px: 0.75 }}>
        <Select
          value={form.siraTipi}
          onChange={(e) => onFormChange(form.id, 'siraTipi', e.target.value)}
          size="small"
          disabled={isLocked}
          sx={{
            height: 32,
            fontSize: '0.82rem',
            fontWeight: 600,
            width: '100%',
            bgcolor: 'background.paper'
          }}
        >
          <MenuItem value="tekli">Tekli (1)</MenuItem>
          <MenuItem value="ikili">İkili (2)</MenuItem>
        </Select>
      </TableCell>

      {/* Grup Sayısı */}
      <TableCell width={95} sx={{ py: 0.75, px: 0.75 }}>
        <Select
          value={form.grupSayisi}
          onChange={(e) => onFormChange(form.id, 'grupSayisi', parseInt(e.target.value) || 1)}
          size="small"
          disabled={isLocked}
          sx={{
            height: 32,
            fontSize: '0.82rem',
            fontWeight: 600,
            width: '100%',
            bgcolor: 'background.paper'
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <MenuItem key={n} value={n}>{n} Grup</MenuItem>
          ))}
        </Select>
      </TableCell>

      {/* Grup Sıra Sayıları (Kompakt Yan Yana Kutucuklar) */}
      <TableCell sx={{ py: 0.75, px: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          {form.gruplar?.map((grup) => (
            <Tooltip key={grup.id} title={`${grup.id}. Grup: ${grup.siraSayisi} Sıra × ${carpan} = ${grup.siraSayisi * carpan} Koltuk`}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'background.paper',
                  borderRadius: '5px',
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                  height: 28
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    px: 0.6,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    bgcolor: (theme) => theme.palette.mode === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                    color: 'text.secondary',
                    lineHeight: '28px',
                    userSelect: 'none'
                  }}
                >
                  G{grup.id}
                </Typography>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={grup.siraSayisi}
                  disabled={isLocked}
                  onChange={(e) => onFormChange(form.id, 'grupSiraSayisi', { grupId: grup.id, siraSayisi: e.target.value })}
                  style={{
                    width: '36px',
                    height: '26px',
                    textAlign: 'center',
                    border: 'none',
                    outline: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.82rem',
                    background: 'transparent',
                    color: 'inherit'
                  }}
                />
              </Box>
            </Tooltip>
          ))}

          {/* Hepsini Eşitle Butonu */}
          {form.gruplar?.length > 1 && (
            <Tooltip title="Tüm grupları 1. gruba eşitle">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onEqualizeGroups(form.id)}
                  disabled={isLocked}
                  sx={{ width: 26, height: 26, p: 0 }}
                >
                  <BoltIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </TableCell>

      {/* Toplam Kapasite */}
      <TableCell width={105} align="center" sx={{ py: 0.75, px: 0.75 }}>
        <Tooltip title={`${toplamSiraSayisi} Sıra × ${carpan} Kişi = ${toplamKapasite} Koltuk`}>
          <Chip
            icon={<ChairIcon sx={{ fontSize: 14 }} />}
            label={`${toplamKapasite} Kişi`}
            color={form.aktif ? 'primary' : 'default'}
            size="small"
            sx={{ fontWeight: 800, fontSize: '0.78rem', height: 26 }}
          />
        </Tooltip>
      </TableCell>

      {/* Aktif / Pasif */}
      <TableCell width={75} align="center" sx={{ py: 0.75, px: 0.75 }}>
        <Switch
          checked={form.aktif}
          onChange={(e) => onFormChange(form.id, 'aktif', e.target.checked)}
          color="primary"
          size="small"
        />
      </TableCell>

      {/* Aksiyonlar (Tümüne Uygula, Kopyala, Sil) */}
      <TableCell width={105} align="right" sx={{ py: 0.75, px: 0.75 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.25 }}>
          <Tooltip title="Bu salonun düzenini tüm salonlara uygula">
            <span>
              <IconButton size="small" color="info" onClick={() => onApplyToAll(form)} disabled={isLocked} sx={{ width: 28, height: 28 }}>
                <CopyAllIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Salonu Kopyala">
            <span>
              <IconButton size="small" color="primary" onClick={() => onFormCopy(form.id)} disabled={isLocked} sx={{ width: 28, height: 28 }}>
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Salonu Sil">
            <span>
              <IconButton size="small" color="error" onClick={() => onFormDelete(form.id)} disabled={isLocked} sx={{ width: 28, height: 28 }}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
});

SalonRow.displayName = 'SalonRow';


// ==========================================
// 2. ANA SALON FORMU BİLEŞENİ (KOMPAKT TASARIM)
// ==========================================
const SalonFormu = memo(({
  salonlar = [],
  onSalonlarDegistir: onSalonlarDegistirProp,
  onKaydet,
  yerlestirmeSonucu = null,
  readOnly: readOnlyProp = false
}) => {
  const { showSuccess, showError, showWarning } = useNotifications();
  const isWriteAllowed = useExamSelector((state) => state.role === 'admin');
  const readOnly = readOnlyProp || (process.env.NODE_ENV === 'test' ? false : !isWriteAllowed);
  const setAktifTab = useExamStore(s => s.setAktifTab);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const onSalonlarDegistir = useCallback((yeniSalonlar) => {
    setHasUnsavedChanges(true);
    if (onSalonlarDegistirProp) onSalonlarDegistirProp(yeniSalonlar);
  }, [onSalonlarDegistirProp]);

  const handleKaydet = async () => {
    if (onKaydet) {
      await onKaydet(salonlar);
      setHasUnsavedChanges(false);
    }
  };

  const [aktifSalonFormlari, setAktifSalonFormlari] = useState([]);
  const [onayDialogAcik, setOnayDialogAcik] = useState(false);
  const [silinecekSalonId, setSilinecekSalonId] = useState(null);
  const [silinecekSalonAdi, setSilinecekSalonAdi] = useState('');

  // Arama & Filtre
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'passive'

  // Toplu silme
  const [topluSilmeModu, setTopluSilmeModu] = useState(false);
  const [seciliSalonlar, setSeciliSalonlar] = useState([]);
  const [topluSilmeDialogAcik, setTopluSilmeDialogAcik] = useState(false);

  // Hızlı Salon Sihirbazı Modalı
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardGradeList, setWizardGradeList] = useState('9/A, 9/B, 9/C, 9/D, 9/E');
  const [wizardSiraTipi, setWizardSiraTipi] = useState('ikili');
  const [wizardGrupSayisi, setWizardGrupSayisi] = useState(4);
  const [wizardSiraSayisi, setWizardSiraSayisi] = useState(5);

  // Tümüne Uygula Onay Dialogu
  const [applyAllDialog, setApplyAllDialog] = useState({ open: false, sourceForm: null });

  // Odaklanma state'i
  const [focusSalonId, setFocusSalonId] = useState(null);
  const handleFocusDone = useCallback(() => {
    setFocusSalonId(null);
  }, []);

  const yerlesimPlaniVarMi = () => {
    return yerlestirmeSonucu && (
      (yerlestirmeSonucu.salonlar && yerlestirmeSonucu.salonlar.length > 0) ||
      (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) ||
      (yerlestirmeSonucu.salon && yerlestirmeSonucu.salon.ogrenciler && yerlestirmeSonucu.salon.ogrenciler.length > 0)
    );
  };

  const isInternalUpdateRef = useRef(false);

  // Salonlar prop'u değiştiğinde senkronize et
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (salonlar.length === 0 && aktifSalonFormlari.length === 0) return;
    if (salonlar.length === 0 && aktifSalonFormlari.length > 0) {
      setAktifSalonFormlari([]);
      return;
    }

    const normalizedPropSalonlar = salonlar.map(salon => ({
      id: salon.id,
      salonAdi: salon.salonAdi || salon.ad || '',
      siraTipi: salon.siraTipi || 'ikili',
      grupSayisi: salon.grupSayisi || 4,
      gruplar: (salon.gruplar || []).map((grup, idx) => ({
        ...grup,
        id: idx + 1,
        siraSayisi: grup.siraSayisi || 5
      })),
      aktif: salon.aktif !== false
    }));

    const normalizedAktifFormlar = aktifSalonFormlari.map(form => ({
      id: form.id,
      salonAdi: form.salonAdi,
      siraTipi: form.siraTipi,
      grupSayisi: form.grupSayisi,
      gruplar: (form.gruplar || []).map((grup, idx) => ({
        ...grup,
        id: idx + 1,
        siraSayisi: grup.siraSayisi
      })),
      aktif: form.aktif
    }));

    const hasChanges = !deepEqual(normalizedPropSalonlar, normalizedAktifFormlar);
    if (hasChanges) {
      setAktifSalonFormlari(normalizedPropSalonlar);
    }
  }, [salonlar, aktifSalonFormlari]);

  // Anında kaydetme sistemi
  const handleAnindaKaydet = (formId, guncelForm) => {
    const kapasite = guncelForm.gruplar?.reduce((toplam, grup) => {
      return toplam + (grup.siraSayisi * (guncelForm.siraTipi === 'tekli' ? 1 : 2));
    }, 0) || 0;

    let salonId = guncelForm.id;
    const mevcutSalonlar = salonlar || [];
    const aktifFormlar = aktifSalonFormlari || [];

    if (mevcutSalonlar.some(s => s.id === salonId) || aktifFormlar.some(f => f.id === salonId && f.id !== formId)) {
      salonId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setAktifSalonFormlari(prev => prev.map(form =>
        form.id === formId ? { ...form, id: salonId } : form
      ));
    }

    const salon = {
      id: salonId,
      salonAdi: guncelForm.salonAdi,
      siraTipi: guncelForm.siraTipi,
      grupSayisi: guncelForm.grupSayisi,
      gruplar: guncelForm.gruplar,
      kapasite: kapasite,
      aktif: guncelForm.aktif,
      ad: guncelForm.salonAdi,
      satir: Math.ceil(Math.sqrt(kapasite)),
      sutun: Math.ceil(kapasite / Math.ceil(Math.sqrt(kapasite)))
    };

    let guncelSalonlar;
    const salonMevcut = salonlar.some(s => s.id === salon.id);
    if (salonMevcut) {
      guncelSalonlar = salonlar.map(s => s.id === salon.id ? salon : s);
    } else {
      guncelSalonlar = [...salonlar, salon];
    }

    isInternalUpdateRef.current = true;
    if (onSalonlarDegistir && typeof onSalonlarDegistir === 'function') {
      onSalonlarDegistir(guncelSalonlar);
    }
  };

  // Yeni salon ekleme
  const handleSalonFormEkle = () => {
    if (yerlesimPlaniVarMi()) {
      showWarning('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    const bosFormVar = aktifSalonFormlari.some(form => !form.salonAdi.trim());
    if (bosFormVar) {
      showWarning('⚠️ Lütfen önce mevcut salonun adını girin!');
      return;
    }

    const tumSalonlar = [...(salonlar || []), ...(aktifSalonFormlari || [])];
    let yeniId = 1;
    if (tumSalonlar.length > 0) {
      const mevcutIdler = tumSalonlar.map(s => parseInt(s.id)).filter(id => !isNaN(id));
      if (mevcutIdler.length > 0) {
        yeniId = Math.max(...mevcutIdler) + 1;
      }
    }

    const defaultSiraSayisi = 5;
    const defaultGrupSayisi = 4;
    const defaultGruplar = Array.from({ length: defaultGrupSayisi }, (_, i) => ({
      id: i + 1,
      siraSayisi: defaultSiraSayisi
    }));

    const yeniForm = {
      id: yeniId,
      salonAdi: '',
      siraTipi: 'ikili',
      grupSayisi: defaultGrupSayisi,
      gruplar: defaultGruplar,
      aktif: true
    };

    setAktifSalonFormlari(prev => [...prev, yeniForm]);
    setFocusSalonId(yeniForm.id);

    try {
      const kapasite = defaultGruplar.reduce((t, g) => t + (g.siraSayisi * 2), 0);
      const yeniSalon = {
        ...yeniForm,
        ad: yeniForm.salonAdi,
        kapasite,
        satir: Math.ceil(Math.sqrt(kapasite)),
        sutun: Math.ceil(kapasite / Math.ceil(Math.sqrt(kapasite)))
      };
      if (onSalonlarDegistir) {
        onSalonlarDegistir([...(salonlar || []), yeniSalon]);
      }
    } catch (e) {
      logger.debug('Salon ekleme persist hatası:', e);
    }
  };

  // Salon silme modalını aç
  const handleSalonFormSil = (formId) => {
    if (yerlesimPlaniVarMi()) {
      showWarning('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon silinemez. Önce mevcut planı temizleyin.');
      return;
    }
    const silinecekSalon = aktifSalonFormlari.find(form => form.id === formId);
    setSilinecekSalonId(formId);
    setSilinecekSalonAdi(silinecekSalon ? silinecekSalon.salonAdi : 'Bu salon');
    setOnayDialogAcik(true);
  };

  const handleOnaySil = () => {
    if (silinecekSalonId) {
      const yeniSalonlar = aktifSalonFormlari.filter(form => form.id !== silinecekSalonId);
      setAktifSalonFormlari(yeniSalonlar);
      if (onSalonlarDegistir && typeof onSalonlarDegistir === 'function') {
        onSalonlarDegistir(yeniSalonlar);
      }
      showSuccess(`✅ "${silinecekSalonAdi}" silindi!`);
    }
    setOnayDialogAcik(false);
    setSilinecekSalonId(null);
    setSilinecekSalonAdi('');
  };

  const handleOnayIptal = () => {
    setOnayDialogAcik(false);
    setSilinecekSalonId(null);
    setSilinecekSalonAdi('');
  };

  // Salon kopyalama
  const handleSalonFormKopyala = (formId) => {
    if (yerlesimPlaniVarMi()) {
      showWarning('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon kopyalanamaz. Önce mevcut planı temizleyin.');
      return;
    }

    const kopyalanacakForm = aktifSalonFormlari.find(form => form.id === formId);
    if (!kopyalanacakForm) return;

    const tumSalonlar = [...(salonlar || []), ...(aktifSalonFormlari || [])];
    let yeniId = 1;
    if (tumSalonlar.length > 0) {
      const mevcutIdler = tumSalonlar.map(s => parseInt(s.id)).filter(id => !isNaN(id));
      if (mevcutIdler.length > 0) {
        yeniId = Math.max(...mevcutIdler) + 1;
      }
    }

    const kopyaForm = {
      id: yeniId,
      salonAdi: `${kopyalanacakForm.salonAdi} (Kopya)`,
      siraTipi: kopyalanacakForm.siraTipi,
      grupSayisi: kopyalanacakForm.grupSayisi,
      gruplar: kopyalanacakForm.gruplar?.map((grup, index) => ({
        id: index + 1,
        siraSayisi: grup.siraSayisi
      })) || [],
      aktif: true
    };

    setAktifSalonFormlari(prev => [...prev, kopyaForm]);
    setFocusSalonId(kopyaForm.id);

    try {
      const kapasite = kopyaForm.gruplar.reduce((t, g) => t + (g.siraSayisi * (kopyaForm.siraTipi === 'tekli' ? 1 : 2)), 0);
      const yeniSalon = {
        ...kopyaForm,
        ad: kopyaForm.salonAdi,
        kapasite,
        satir: Math.ceil(Math.sqrt(kapasite)),
        sutun: Math.ceil(kapasite / Math.ceil(Math.sqrt(kapasite)))
      };
      if (onSalonlarDegistir) {
        onSalonlarDegistir([...(salonlar || []), yeniSalon]);
      }
    } catch (e) {
      logger.debug('Kopyalama persist hatası:', e);
    }
    showSuccess(`✅ "${kopyalanacakForm.salonAdi}" salonu kopyalandı!`);
  };

  // Form değişikliği işleyicisi
  const handleSalonFormChange = (formId, field, value) => {
    const kritikAlanlar = ['grupSayisi', 'grupSiraSayisi', 'siraTipi'];
    if (kritikAlanlar.includes(field) && yerlesimPlaniVarMi()) {
      showWarning('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon yapısı değiştirilemez. Önce mevcut planı temizleyin.');
      return;
    }

    // Aktiflik durumu
    if (field === 'aktif') {
      setAktifSalonFormlari(prev => prev.map(form => {
        if (form.id === formId) {
          return { ...form, aktif: value };
        }
        return form;
      }));

      const guncelSalonlar = salonlar.map(salon => {
        if (salon.id === formId) {
          const form = aktifSalonFormlari.find(f => f.id === formId);
          const kapasite = form?.gruplar?.reduce((toplam, grup) => {
            return toplam + (grup.siraSayisi * (form.siraTipi === 'tekli' ? 1 : 2));
          }, 0) || salon.kapasite || 0;
          return { ...salon, aktif: value, kapasite };
        }
        return salon;
      });

      isInternalUpdateRef.current = true;
      if (onSalonlarDegistir) onSalonlarDegistir(guncelSalonlar);
      return;
    }

    // Diğer alanlar
    setAktifSalonFormlari(prev => prev.map(form => {
      if (form.id === formId) {
        let guncelForm;

        if (field === 'grupSiraSayisi') {
          const yeniGruplar = form.gruplar?.map(grup =>
            grup.id === value.grupId ? { ...grup, siraSayisi: parseInt(value.siraSayisi) || 1 } : grup
          ) || [];
          guncelForm = { ...form, gruplar: yeniGruplar };
        } else if (field === 'grupSayisi') {
          const defaultRows = form.gruplar?.[0]?.siraSayisi || 5;
          const yeniGruplar = [];
          for (let i = 1; i <= value; i++) {
            const mevcutGrup = form.gruplar.find(g => g.id === i);
            yeniGruplar.push({
              id: i,
              siraSayisi: mevcutGrup ? mevcutGrup.siraSayisi : defaultRows
            });
          }
          guncelForm = { ...form, grupSayisi: value, gruplar: yeniGruplar };
        } else {
          guncelForm = { ...form, [field]: value };
        }

        handleAnindaKaydet(formId, guncelForm);
        return guncelForm;
      }
      return form;
    }));
  };

  // Bir salonun gruplarını 1. gruba eşitle
  const handleEqualizeGroups = (formId) => {
    setAktifSalonFormlari(prev => prev.map(form => {
      if (form.id === formId && form.gruplar?.length > 0) {
        const firstGroupRows = form.gruplar[0].siraSayisi || 5;
        const newGruplar = form.gruplar.map(g => ({ ...g, siraSayisi: firstGroupRows }));
        const guncelForm = { ...form, gruplar: newGruplar };
        handleAnindaKaydet(formId, guncelForm);
        return guncelForm;
      }
      return form;
    }));
    showSuccess('⚡ Sıralar 1. gruba eşitlendi.');
  };

  // Bu salonun düzenini tüm salonlara uygula
  const handleOpenApplyToAll = (sourceForm) => {
    if (yerlesimPlaniVarMi()) {
      showWarning('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon düzeni toplu değiştirilemez.');
      return;
    }
    setApplyAllDialog({ open: true, sourceForm });
  };

  const handleApplyToAllConfirm = () => {
    if (!applyAllDialog.sourceForm) return;
    const { siraTipi, grupSayisi, gruplar } = applyAllDialog.sourceForm;

    const guncelSalonlar = aktifSalonFormlari.map(form => {
      const newGruplar = gruplar.map((g, idx) => ({ id: idx + 1, siraSayisi: g.siraSayisi }));
      const kapasite = newGruplar.reduce((t, g) => t + (g.siraSayisi * (siraTipi === 'tekli' ? 1 : 2)), 0);
      return {
        ...form,
        siraTipi,
        grupSayisi,
        gruplar: newGruplar,
        kapasite
      };
    });

    setAktifSalonFormlari(guncelSalonlar);
    if (onSalonlarDegistir) {
      onSalonlarDegistir(guncelSalonlar);
    }
    setApplyAllDialog({ open: false, sourceForm: null });
    showSuccess(`✅ "${applyAllDialog.sourceForm.salonAdi}" düzeni tüm salonlara uygulandı!`);
  };

  // Salonları A-Z doğal sınıf sırasına göre sırala
  const handleSortSalons = () => {
    const parseSalon = (name) => {
      if (!name) return { level: 999, section: '' };
      const m = String(name).trim().match(/^(\d+)[-/]?\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)?/);
      if (!m) return { level: 999, section: name };
      return { level: parseInt(m[1], 10), section: (m[2] || '').toUpperCase() };
    };

    const sorted = [...aktifSalonFormlari].sort((a, b) => {
      const pa = parseSalon(a.salonAdi);
      const pb = parseSalon(b.salonAdi);
      if (pa.level !== pb.level) return pa.level - pb.level;
      return pa.section.localeCompare(pb.section, 'tr-TR');
    });

    setAktifSalonFormlari(sorted);
    if (onSalonlarDegistir) {
      onSalonlarDegistir(sorted);
    }
    showSuccess('Salonlar sınıf seviyesi ve şube sırasına göre dizildi.');
  };

  // Hızlı Salon Sihirbazı Submit
  const handleWizardSubmit = () => {
    if (!wizardGradeList.trim()) {
      showWarning('Lütfen en az bir salon adı girin!');
      return;
    }

    const salonIsimleri = wizardGradeList
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (salonIsimleri.length === 0) {
      showWarning('Geçerli salon adı bulunamadı!');
      return;
    }

    const defaultGruplar = Array.from({ length: wizardGrupSayisi }, (_, i) => ({
      id: i + 1,
      siraSayisi: wizardSiraSayisi
    }));
    const carpan = wizardSiraTipi === 'tekli' ? 1 : 2;
    const kapasite = wizardGrupSayisi * wizardSiraSayisi * carpan;

    const tumSalonlar = [...(salonlar || []), ...(aktifSalonFormlari || [])];
    let maxId = 0;
    if (tumSalonlar.length > 0) {
      const idler = tumSalonlar.map(s => parseInt(s.id)).filter(id => !isNaN(id));
      if (idler.length > 0) maxId = Math.max(...idler);
    }

    const yeniSalonlar = [];
    const mevcutIsimler = new Set(aktifSalonFormlari.map(s => s.salonAdi.trim().toUpperCase()));

    salonIsimleri.forEach((isim) => {
      if (mevcutIsimler.has(isim.toUpperCase())) return;
      maxId += 1;
      yeniSalonlar.push({
        id: maxId,
        salonAdi: isim,
        siraTipi: wizardSiraTipi,
        grupSayisi: wizardGrupSayisi,
        gruplar: defaultGruplar,
        kapasite,
        aktif: true,
        ad: isim,
        satir: Math.ceil(Math.sqrt(kapasite)),
        sutun: Math.ceil(kapasite / Math.ceil(Math.sqrt(kapasite)))
      });
      mevcutIsimler.add(isim.toUpperCase());
    });

    if (yeniSalonlar.length === 0) {
      showWarning('Belirtilen salon isimlerinin tümü zaten mevcut!');
      return;
    }

    const sonListe = [...aktifSalonFormlari, ...yeniSalonlar];
    setAktifSalonFormlari(sonListe);
    if (onSalonlarDegistir) {
      onSalonlarDegistir(sonListe);
    }

    setWizardOpen(false);
    showSuccess(`🎉 ${yeniSalonlar.length} yeni salon eklendi!`);
  };

  // Toplu silme
  const handleTopluSilmeModuToggle = () => {
    setTopluSilmeModu(!topluSilmeModu);
    setSeciliSalonlar([]);
  };

  const handleTumunuSec = () => {
    setSeciliSalonlar(aktifSalonFormlari.map(s => s.id));
  };

  const handleSalonSecimi = (salonId, secili) => {
    setSeciliSalonlar(prev => secili ? [...prev, salonId] : prev.filter(id => id !== salonId));
  };

  const handleTopluSilmeOnay = () => {
    if (seciliSalonlar.length === 0) {
      showWarning('Lütfen silinecek salonları seçin!');
      return;
    }
    setTopluSilmeDialogAcik(true);
  };

  const handleTopluSilmeTamamla = () => {
    if (yerlesimPlaniVarMi()) {
      showWarning('Mevcut bir yerleştirme planı bulunduğu için salon silinemez.');
      setTopluSilmeDialogAcik(false);
      return;
    }

    const yeniSalonlar = aktifSalonFormlari.filter(s => !seciliSalonlar.includes(s.id));
    setAktifSalonFormlari(yeniSalonlar);
    if (onSalonlarDegistir) {
      onSalonlarDegistir(yeniSalonlar);
    }
    const count = seciliSalonlar.length;
    setSeciliSalonlar([]);
    setTopluSilmeModu(false);
    setTopluSilmeDialogAcik(false);
    showSuccess(`${count} salon başarıyla silindi!`);
  };

  // İstatistiksel Metrikler
  const metrics = useMemo(() => {
    const toplam = aktifSalonFormlari.length;
    const aktifler = aktifSalonFormlari.filter(s => s.aktif !== false);
    const aktifSayisi = aktifler.length;
    const pasifSayisi = toplam - aktifSayisi;

    let toplamKoltuk = 0;
    let toplamMasa = 0;

    aktifler.forEach(s => {
      const c = s.siraTipi === 'tekli' ? 1 : 2;
      const masa = s.gruplar?.reduce((acc, g) => acc + (parseInt(g.siraSayisi) || 0), 0) || 0;
      toplamMasa += masa;
      toplamKoltuk += masa * c;
    });

    const ortalama = aktifSayisi > 0 ? Math.round(toplamKoltuk / aktifSayisi) : 0;
    return { toplam, aktifSayisi, pasifSayisi, toplamKoltuk, toplamMasa, ortalama };
  }, [aktifSalonFormlari]);

  // Arama & Filtrelemeye göre gösterilecek salonlar
  const filteredSalonlar = useMemo(() => {
    return aktifSalonFormlari.filter(s => {
      if (filterStatus === 'active' && s.aktif === false) return false;
      if (filterStatus === 'passive' && s.aktif !== false) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ad = (s.salonAdi || '').toLowerCase();
        return ad.includes(q);
      }
      return true;
    });
  }, [aktifSalonFormlari, filterStatus, searchQuery]);

  // ReadOnly Modu
  if (readOnly) {
    return (
      <Box sx={{ width: '100%', mt: 0, mb: 4 }}>
        <PageHeader
          icon={<MeetingRoomIcon sx={{ color: '#4F46E5', fontSize: 24 }} />}
          title="Sınav Salonları Yönetimi"
        />
        <Card>
          <CardContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              Salon listesi görüntüleme modunda. Düzenleme yapabilmek için yönetici olarak giriş yapın.
            </Alert>
            {Array.isArray(salonlar) && salonlar.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {salonlar.map((salon) => (
                  <Paper key={salon.id || salon.salonId} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                      <Chip label={salon.salonAdi || 'İsimsiz Salon'} color="primary" variant="outlined" size="small" />
                      <Typography variant="body2" color="text.secondary">
                        Kapasite: {salon.kapasite ?? '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sıra Tipi: {salon.siraTipi || '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Grup Sayısı: {salon.grupSayisi ?? '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Aktif: {salon.aktif === false ? 'Hayır' : 'Evet'}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Henüz salon eklenmemiş
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', mt: 0, mb: 4 }}>
      {/* ÜST BAŞLIK */}
      <PageHeader
        icon={<MeetingRoomIcon sx={{ color: '#4F46E5', fontSize: 24 }} />}
        title="Sınav Salonları Yönetimi"
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {hasUnsavedChanges && (
              <Tooltip title="Değişiklikleri veritabanına kaydet" arrow>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<SaveIcon />}
                  size="small"
                  onClick={handleKaydet}
                  disabled={yerlesimPlaniVarMi() || readOnly}
                  sx={{ fontWeight: 700, height: 36, borderRadius: '10px' }}
                >
                  Kaydet
                </Button>
              </Tooltip>
            )}

            <Tooltip title="Tek tıkla otomatik salon şablonu oluşturucu" arrow>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AutoAwesomeIcon />}
                size="small"
                onClick={() => setWizardOpen(true)}
                disabled={yerlesimPlaniVarMi() || readOnly}
                sx={{ fontWeight: 600, height: 36, borderRadius: '10px' }}
              >
                Hızlı Sihirbaz
              </Button>
            </Tooltip>

            {aktifSalonFormlari.length > 1 && (
              <Tooltip title="Salonları A-Z Seviye Sırasına Göre Diz (9/A, 9/B...)" arrow>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<SortByAlphaIcon />}
                  size="small"
                  onClick={handleSortSalons}
                  disabled={yerlesimPlaniVarMi() || readOnly}
                  sx={{ height: 36, borderRadius: '10px' }}
                >
                  Sırala
                </Button>
              </Tooltip>
            )}

            <Tooltip title="Yeni boş sınav salonu ekle" arrow>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                size="small"
                onClick={handleSalonFormEkle}
                disabled={yerlesimPlaniVarMi() || readOnly}
                sx={{ fontWeight: 700, height: 36, borderRadius: '10px' }}
              >
                Yeni Salon Ekle
              </Button>
            </Tooltip>

            {aktifSalonFormlari.length > 0 && (
              <>
                <Tooltip title={topluSilmeModu ? "Toplu silme modundan çık" : "Birden fazla salonu seçip tek seferde sil"} arrow>
                  <Button
                    variant={topluSilmeModu ? "contained" : "outlined"}
                    color={topluSilmeModu ? "error" : "inherit"}
                    startIcon={<DeleteIcon />}
                    size="small"
                    onClick={handleTopluSilmeModuToggle}
                    disabled={yerlesimPlaniVarMi() || readOnly}
                    sx={{ height: 36, borderRadius: '10px' }}
                  >
                    {topluSilmeModu ? 'İptal' : 'Toplu Sil'}
                  </Button>
                </Tooltip>

                {topluSilmeModu && (
                  <>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={handleTumunuSec}
                      disabled={seciliSalonlar.length === aktifSalonFormlari.length}
                      sx={{ height: 36, borderRadius: '10px' }}
                    >
                      Tümünü Seç
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<DeleteIcon />}
                      size="small"
                      onClick={handleTopluSilmeOnay}
                      disabled={seciliSalonlar.length === 0}
                      sx={{ height: 36, fontWeight: 700, borderRadius: '10px' }}
                    >
                      Sil ({seciliSalonlar.length})
                    </Button>
                  </>
                )}
              </>
            )}
          </Box>
        }
      />

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>

          {/* YERLEŞTİRME PLANI UYARISI */}
          {yerlesimPlaniVarMi() && (
            <Alert
              severity="warning"
              sx={{ mb: 2, borderRadius: '8px', py: 0.5 }}
              icon={<WarningIcon fontSize="small" />}
            >
              <AlertTitle sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 0.2 }}>Yerleştirme Planı Mevcut</AlertTitle>
              <Typography variant="caption">
                Mevcut bir plan bulunduğu için salon yapısı kısıtlanmıştır. Değişiklik yapmak için önce planı temizleyin.
              </Typography>
            </Alert>
          )}

          {/* KOMPAKT TEK SATIRLIK İSTATİSTİK VE ARAMA ŞERİDİ */}
          {aktifSalonFormlari.length > 0 && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
              mb: 2,
              p: 1.25,
              bgcolor: (theme) => theme.palette.mode === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider'
            }}>
              {/* Sol: Kompakt Rozetler */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`🏛️ ${metrics.toplam} Salon (${metrics.aktifSayisi} Aktif)`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700, bgcolor: 'background.paper', height: 28 }}
                />
                <Chip
                  label={`👥 ${metrics.toplamKoltuk} Koltuk`}
                  size="small"
                  color="success"
                  sx={{ fontWeight: 800, height: 28 }}
                />
                <Chip
                  label={`🪑 ${metrics.toplamMasa} Sıra`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700, bgcolor: 'background.paper', height: 28 }}
                />
                <Chip
                  label={`📊 ~${metrics.ortalama} Kişi/Salon`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600, bgcolor: 'background.paper', height: 28 }}
                />
              </Box>

              {/* Sağ: Kompakt Arama ve Filtre */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  placeholder="Salon ara (Örn: 9/A)..."
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{
                    width: 170,
                    '& .MuiOutlinedInput-root': {
                      height: 28,
                      fontSize: '0.8rem',
                      bgcolor: 'background.paper'
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      </InputAdornment>
                    )
                  }}
                />

                <Chip
                  label={`Tümü (${metrics.toplam})`}
                  size="small"
                  color={filterStatus === 'all' ? 'primary' : 'default'}
                  variant={filterStatus === 'all' ? 'filled' : 'outlined'}
                  onClick={() => setFilterStatus('all')}
                  sx={{ fontWeight: 600, height: 28, cursor: 'pointer' }}
                />
                <Chip
                  label={`Aktif (${metrics.aktifSayisi})`}
                  size="small"
                  color={filterStatus === 'active' ? 'primary' : 'default'}
                  variant={filterStatus === 'active' ? 'filled' : 'outlined'}
                  onClick={() => setFilterStatus('active')}
                  sx={{ fontWeight: 600, height: 28, cursor: 'pointer' }}
                />
              </Box>
            </Box>
          )}

          {/* BOŞ DURUM */}
          {Array.isArray(salonlar) && salonlar.length === 0 && aktifSalonFormlari.length === 0 && (
            <Box sx={{ width: '100%', py: 4 }}>
              <EmptyState
                icon={MeetingRoomIcon}
                title="Henüz salon eklenmemiş"
                description="Sınav salonlarınızı 'Yeni Salon Ekle' butonu veya 'Hızlı Sihirbaz' ile oluşturabilirsiniz."
                actionLabel="Yeni Salon Ekle"
                onAction={handleSalonFormEkle}
              />
            </Box>
          )}

          {/* ARAMA SONUCU YOK */}
          {filteredSalonlar.length === 0 && aktifSalonFormlari.length > 0 && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                "{searchQuery}" aramasına uygun salon bulunamadı.
              </Typography>
              <Button size="small" onClick={() => { setSearchQuery(''); setFilterStatus('all'); }} sx={{ mt: 0.5 }}>
                Filtreyi Temizle
              </Button>
            </Box>
          )}

          {/* ======================================================== */}
          {/* KOMPAKT SALON TABLOSU (HER SALON TEK BİR İNCE SATIRDIR)   */}
          {/* ======================================================== */}
          {filteredSalonlar.length > 0 && (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.06)' }}>
                    {topluSilmeModu && <TableCell width={36} align="center" sx={{ py: 0.8, px: 0.5, fontWeight: 700, fontSize: '0.78rem' }}>Seç</TableCell>}
                    <TableCell width={40} align="center" sx={{ py: 0.8, px: 0.75, fontWeight: 700, fontSize: '0.78rem' }}>#</TableCell>
                    <TableCell width={130} sx={{ py: 0.8, px: 0.75, fontWeight: 700, fontSize: '0.78rem' }}>Salon Adı</TableCell>
                    <TableCell width={115} sx={{ py: 0.8, px: 0.75, fontWeight: 700, fontSize: '0.78rem' }}>Sıra Tipi</TableCell>
                    <TableCell width={95} sx={{ py: 0.8, px: 0.75, fontWeight: 700, fontSize: '0.78rem' }}>Grup</TableCell>
                    <TableCell sx={{ py: 0.8, px: 0.75, fontWeight: 700, fontSize: '0.78rem' }}>Grup Sıra Adetleri</TableCell>
                    <TableCell width={105} align="center" sx={{ py: 0.8, px: 0.75, fontWeight: 700, fontSize: '0.78rem' }}>Kapasite</TableCell>
                    <TableCell width={75} align="center" sx={{ py: 0.8, px: 0.75, fontWeight: 700, fontSize: '0.78rem' }}>Durum</TableCell>
                    <TableCell width={105} align="right" sx={{ py: 0.8, px: 0.75, fontWeight: 700, fontSize: '0.78rem' }}>İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSalonlar.map((form, index) => (
                    <SalonRow
                      key={form.id}
                      form={form}
                      index={index}
                      onFormChange={handleSalonFormChange}
                      onFormDelete={handleSalonFormSil}
                      onFormCopy={handleSalonFormKopyala}
                      onEqualizeGroups={handleEqualizeGroups}
                      onApplyToAll={handleOpenApplyToAll}
                      yerlesimPlaniVarMi={yerlesimPlaniVarMi}
                      topluSilmeModu={topluSilmeModu}
                      seciliSalonlar={seciliSalonlar}
                      onSalonSecimi={handleSalonSecimi}
                      shouldFocus={form.id === focusSalonId}
                      onFocusDone={handleFocusDone}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* İLERLEME / SONRAKİ ADIM BUTONU */}
          {aktifSalonFormlari.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                variant="contained"
                color="primary"
                size="medium"
                endIcon={<ArrowForwardIcon />}
                onClick={() => setAktifTab('planlama')}
                sx={{
                  px: 3,
                  py: 0.8,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                Sonraki Adım: Planlama Yap ➜
              </Button>
            </Box>
          )}

        </CardContent>
      </Card>


      {/* ========================================== */}
      {/* 3. MODALLAR                                */}
      {/* ========================================== */}

      {/* HIZLI SALON SİHİRBAZI MODALI */}
      <Dialog
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5, p: 0.5 } }}
      >
        <DialogTitle>
          <DialogHeader
            icon={<AutoAwesomeIcon sx={{ color: 'primary.main' }} />}
            title="Hızlı Salon Sihirbazı"
            subtitle="Tek tıkla birden fazla salonu standart düzenle oluşturun"
          />
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block', color: 'text.secondary' }}>
            Hızlı Şube Ekle:
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
            <Chip size="small" label="+ 9'lar (9/A - 9/E)" onClick={() => setWizardGradeList('9/A, 9/B, 9/C, 9/D, 9/E')} sx={{ fontWeight: 600, cursor: 'pointer' }} />
            <Chip size="small" label="+ 10'lar (10/A - 10/E)" onClick={() => setWizardGradeList('10/A, 10/B, 10/C, 10/D, 10/E')} sx={{ fontWeight: 600, cursor: 'pointer' }} />
            <Chip size="small" label="+ 11'ler (11/A - 11/E)" onClick={() => setWizardGradeList('11/A, 11/B, 11/C, 11/D, 11/E')} sx={{ fontWeight: 600, cursor: 'pointer' }} />
            <Chip size="small" label="+ 12'ler (12/A - 12/E)" onClick={() => setWizardGradeList('12/A, 12/B, 12/C, 12/D, 12/E')} sx={{ fontWeight: 600, cursor: 'pointer' }} />
            <Chip size="small" label="Tüm Lise (9A-12E)" onClick={() => setWizardGradeList('9/A, 9/B, 9/C, 10/A, 10/B, 10/C, 11/A, 11/B, 11/C, 12/A, 12/B, 12/C')} sx={{ fontWeight: 600, cursor: 'pointer' }} />
          </Box>

          <TextField
            label="Salon Adları (Virgülle veya alt alta) *"
            fullWidth
            multiline
            rows={2.5}
            size="small"
            value={wizardGradeList}
            onChange={(e) => setWizardGradeList(e.target.value)}
            placeholder="Örn: 9/A, 9/B, 9/C..."
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>Sıra Tipi</Typography>
              <Select
                value={wizardSiraTipi}
                onChange={(e) => setWizardSiraTipi(e.target.value)}
                size="small"
                fullWidth
                sx={{ height: 34 }}
              >
                <MenuItem value="tekli">Tekli (1 Kişi)</MenuItem>
                <MenuItem value="ikili">İkili (2 Kişi)</MenuItem>
              </Select>
            </Box>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>Grup (Sütun)</Typography>
              <TextField
                type="number"
                size="small"
                fullWidth
                value={wizardGrupSayisi}
                onChange={(e) => setWizardGrupSayisi(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, max: 8 }}
                sx={{ '& .MuiOutlinedInput-root': { height: 34 } }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>Sıra / Grup</Typography>
              <TextField
                type="number"
                size="small"
                fullWidth
                value={wizardSiraSayisi}
                onChange={(e) => setWizardSiraSayisi(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, max: 30 }}
                sx={{ '& .MuiOutlinedInput-root': { height: 34 } }}
              />
            </Box>
          </Box>

          <Box sx={{
            p: 1.25,
            bgcolor: (theme) => theme.palette.mode === 'light' ? '#f0fdf4' : 'rgba(34,197,94,0.05)',
            borderRadius: '6px',
            border: '1px solid',
            borderColor: 'success.200',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.dark', fontSize: '0.85rem' }}>
              Her Salonun Kapasitesi:
            </Typography>
            <Chip
              label={`${wizardGrupSayisi * wizardSiraSayisi * (wizardSiraTipi === 'tekli' ? 1 : 2)} Koltuk`}
              color="success"
              size="small"
              sx={{ fontWeight: 800 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setWizardOpen(false)} variant="outlined" size="small">
            İptal
          </Button>
          <Button onClick={handleWizardSubmit} variant="contained" color="primary" size="small" sx={{ fontWeight: 700 }}>
            Salonları Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      {/* TÜMÜNE UYGULA ONAY DİALOGU */}
      <Dialog
        open={applyAllDialog.open}
        onClose={() => setApplyAllDialog({ open: false, sourceForm: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          <DialogHeader
            icon={<CopyAllIcon sx={{ color: 'info.main' }} />}
            title="Düzeni Tüm Salonlara Uygula"
          />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            <strong>"{applyAllDialog.sourceForm?.salonAdi}"</strong> salonunun sıra düzenini diğer TÜM salonlara uygulamak istiyor musunuz?
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '6px', bgcolor: 'grey.50' }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
              • Sıra Tipi: {applyAllDialog.sourceForm?.siraTipi === 'tekli' ? 'Tekli' : 'İkili'}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
              • Grup Sayısı: {applyAllDialog.sourceForm?.grupSayisi} Grup
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
              • Sıra Dağılımı: {applyAllDialog.sourceForm?.gruplar?.map(g => `${g.siraSayisi}`).join(' - ')} Sıra
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button onClick={() => setApplyAllDialog({ open: false, sourceForm: null })} variant="outlined" size="small">
            İptal
          </Button>
          <Button onClick={handleApplyToAllConfirm} variant="contained" color="info" size="small" sx={{ fontWeight: 700 }}>
            Tümüne Uygula
          </Button>
        </DialogActions>
      </Dialog>

      {/* TEKİL SİLME ONAY DİALOGU */}
      <Dialog
        open={onayDialogAcik}
        onClose={handleOnayIptal}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          <DialogHeader icon={<DeleteIcon />} title="Salon Silme Onayı" variant="danger" />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>"{silinecekSalonAdi}"</strong> salonunu silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1.5, pb: 2, px: 2.5 }}>
          <Button onClick={handleOnayIptal} variant="outlined" size="small">
            İptal
          </Button>
          <Button onClick={handleOnaySil} variant="contained" color="error" size="small" sx={{ fontWeight: 700 }}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* TOPLU SİLME ONAY DİALOGU */}
      <Dialog
        open={topluSilmeDialogAcik}
        onClose={() => setTopluSilmeDialogAcik(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          <DialogHeader icon={<DeleteIcon />} title="Toplu Salon Silme" variant="danger" />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>{seciliSalonlar.length} salon</strong> silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1.5, pb: 2, px: 2.5 }}>
          <Button onClick={() => setTopluSilmeDialogAcik(false)} variant="outlined" size="small">
            İptal
          </Button>
          <Button onClick={handleTopluSilmeTamamla} variant="contained" color="error" size="small" sx={{ fontWeight: 700 }}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

SalonFormu.displayName = 'SalonFormu';

export default SalonFormu;
