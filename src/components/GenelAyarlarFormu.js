import React, { useState, memo } from 'react';
import deepEqual from '../utils/deepEqual';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  School as SchoolIcon,
  Book as BookIcon,
  ReportProblem as AlertIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import PageHeader from './common/PageHeader';
import DialogHeader from './common/DialogHeader';
import { sanitizeText } from '../utils/sanitizer';
import { useExamStore } from '../store/useExamStore';
import { useNotifications } from './NotificationSystem';

const defaultGeneralSettings = {
  okulAdi: '',
  egitimYili: '',
  donem: '1',
  sinavDonemi: '1',
  sinavTarihi: '',
  sinavSaati: '',
  kisitlar: {
    cinsiyetKisiti: true,
    sinifSeviyesiKisiti: true,
    arkaArkaSinifKisiti: true
  }
};

const normalizeGeneralSettings = (ayarlar) => {
  const normalized = {
    ...defaultGeneralSettings,
    ...(ayarlar || {}),
    kisitlar: {
      ...defaultGeneralSettings.kisitlar,
      ...(ayarlar?.kisitlar || {})
    }
  };
  normalized.okulAdi = sanitizeText(normalized.okulAdi || '', { trim: false });
  normalized.egitimYili = sanitizeText(normalized.egitimYili || '', { trim: false });
  normalized.donem = sanitizeText(normalized.donem || '1');
  normalized.sinavDonemi = sanitizeText(normalized.sinavDonemi || '1');
  normalized.sinavTarihi = sanitizeText(normalized.sinavTarihi || '');
  normalized.sinavSaati = sanitizeText(normalized.sinavSaati || '');
  return normalized;
};

const validateGeneralSettings = (settings) => {
  const validationErrors = {};
  if (!sanitizeText(settings.okulAdi || '').trim()) {
    validationErrors.okulAdi = 'Okul adı zorunludur.';
  }
  if (!sanitizeText(settings.egitimYili || '').trim()) {
    validationErrors.egitimYili = 'Eğitim öğretim yılı zorunludur.';
  }
  if (!sanitizeText(settings.sinavTarihi || '').trim()) {
    validationErrors.sinavTarihi = 'Sınav tarihi seçilmelidir.';
  }

  const timeVal = sanitizeText(settings.sinavSaati || '', { trim: false });
  if (!timeVal.trim()) {
    validationErrors.sinavSaati = 'Sınav saati seçilmelidir.';
  } else if (!/^\d{2}:\d{2}$/.test(timeVal) || (() => {
    const [hh, mm] = timeVal.split(':').map(Number);
    return Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59;
  })()) {
    validationErrors.sinavSaati = 'Saat formatı geçersiz. Örn: 08:03';
  }

  return validationErrors;
};

const normalizeTimeInput = (raw) => {
  const cleaned = sanitizeText(raw || '', { trim: false }).replace(/[^\d:]/g, '');
  if (!cleaned) return { normalized: '', valid: false };

  const parts = cleaned.split(':');
  if (parts.length !== 2) return { normalized: cleaned, valid: false };

  let [hh, mm] = parts;

  if (hh.length === 0 || mm.length === 0) return { normalized: cleaned, valid: false };

  if (hh.length === 1) hh = `0${hh}`;
  if (mm.length === 1) mm = `0${mm}`;

  const normalized = `${hh.slice(0, 2)}:${mm.slice(0, 2)}`;

  const [H, M] = normalized.split(':').map(Number);
  const valid = !Number.isNaN(H) && !Number.isNaN(M) && H >= 0 && H <= 23 && M >= 0 && M <= 59;

  return { normalized: valid ? normalized : normalized, valid };
};

const areGeneralSettingsEqual = (prev, next) => {
  try {
    return deepEqual(prev, next);
  } catch (error) {
    console.warn('Genel ayarlar karşılaştırması yapılamadı:', error);
    return false;
  }
};

const GenelAyarlarFormu = memo(({ ayarlar, onAyarlarDegistir, readOnly: readOnlyProp = null }) => {
  const role = useExamStore(s => s.role);
  const setAktifTab = useExamStore(s => s.setAktifTab);
  const { showSuccess } = useNotifications();
  const isWriteAllowed = role === 'admin';
  const readOnly = readOnlyProp !== null ? readOnlyProp : !isWriteAllowed;
  const [formData, setFormData] = useState(() => normalizeGeneralSettings(ayarlar));
  const [errors, setErrors] = useState(() => validateGeneralSettings(normalizeGeneralSettings(ayarlar)));
  const [kurumModalOpen, setKurumModalOpen] = useState(false);
  const [tempOkulAdi, setTempOkulAdi] = useState('');

  React.useEffect(() => {
    const normalized = normalizeGeneralSettings(ayarlar);
    setFormData(prev => {
      if (areGeneralSettingsEqual(prev, normalized)) {
        return prev;
      }
      return normalized;
    });
    setErrors(validateGeneralSettings(normalized));
  }, [ayarlar]);

  const handleChange = (e) => {
    if (readOnly) {
      return;
    }
    const { name, value } = e.target;
    const sanitizedValue = sanitizeText(value, { trim: false });
    const yeniFormData = {
      ...formData,
      [name]: sanitizedValue
    };

    setFormData(yeniFormData);
    setErrors(validateGeneralSettings(yeniFormData));
    // Anında kaydet
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
  };


  const handleTimeTextChange = (rawInput) => {
    if (readOnly) return;

    const { normalized } = normalizeTimeInput(rawInput);

    const yeniFormData = {
      ...formData,
      sinavSaati: normalized
    };

    setFormData(yeniFormData);
    setErrors(validateGeneralSettings(yeniFormData));
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
  };

  const handleKisitToggle = (key) => {
    if (readOnly) return;

    const yeniFormData = {
      ...formData,
      kisitlar: {
        ...formData.kisitlar,
        [key]: !formData.kisitlar?.[key]
      }
    };

    setFormData(yeniFormData);
    // Genel validasyon hatalarını etkilemez; yine de consistent kalsın
    setErrors(validateGeneralSettings(yeniFormData));
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
  };

  return (
    <Box sx={{ width: '100%', mt: 0, mb: 4 }}>
      <PageHeader
        icon={<SettingsIcon />}
        title="Sınav Ayarları"
        titleExtra={
          <Box sx={{
            bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(79, 70, 229, 0.08)' : 'rgba(129, 140, 248, 0.15)',
            color: 'primary.main',
            px: 1.5,
            py: 0.5,
            borderRadius: '24px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            Temel Yapılandırma
          </Box>
        }
        actions={
          <Button
            variant="contained"
            onClick={() => {
              setTempOkulAdi(formData.okulAdi || '');
              setKurumModalOpen(true);
            }}
            startIcon={<SchoolIcon />}
            sx={{
              fontWeight: 600,
              borderRadius: '10px',
              textTransform: 'none',
              px: 2.5,
              py: 1,
              boxShadow: 'none'
            }}
          >
            Kurum Bilgileri
          </Button>
        }
      />

      {readOnly && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Bu alanı sadece görüntüleyebilirsiniz. Değişiklik yapmak için yönetici olarak giriş yapın.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3, mb: 4, alignItems: 'stretch' }}>
        {/* Sınav ve Dönem Bilgileri */}
        <Card elevation={0} sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: '16px', bgcolor: 'background.paper' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BookIcon color="action" sx={{ fontSize: 22 }} />
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' }, letterSpacing: '-0.01em' }}>
                  Sınav ve Dönem Bilgileri
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Eğitim Yılı ve Dönem */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <TextField
                    label="Eğitim Öğretim Yılı"
                    name="egitimYili"
                    value={formData.egitimYili}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    error={Boolean(errors.egitimYili)}
                    helperText={errors.egitimYili || ''}
                    disabled={readOnly}
                  />
                  <FormControl fullWidth variant="outlined" error={Boolean(errors.donem)} disabled={readOnly}>
                    <InputLabel>Dönem</InputLabel>
                    <Select
                      name="donem"
                      value={formData.donem}
                      onChange={handleChange}
                      label="Dönem"
                      disabled={readOnly}
                    >
                      <MenuItem value="1">1. Dönem</MenuItem>
                      <MenuItem value="2">2. Dönem</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Sınav Dönemi, Tarih, Saat */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                  <FormControl fullWidth variant="outlined" error={Boolean(errors.sinavDonemi)} disabled={readOnly}>
                    <InputLabel>Sınav Dönemi</InputLabel>
                    <Select
                      name="sinavDonemi"
                      value={formData.sinavDonemi}
                      onChange={handleChange}
                      label="Sınav Dönemi"
                      disabled={readOnly}
                    >
                      <MenuItem value="1">1. Ortak Sınav</MenuItem>
                      <MenuItem value="2">2. Ortak Sınav</MenuItem>
                      <MenuItem value="3">3. Ortak Sınav</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Sınav Tarihi"
                    name="sinavTarihi"
                    type="date"
                    value={formData.sinavTarihi}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    error={Boolean(errors.sinavTarihi)}
                    helperText={errors.sinavTarihi || ''}
                    disabled={readOnly}
                  />

                  <TextField
                    label="Sınav Saati"
                    name="sinavSaati"
                    type="time"
                    value={formData.sinavSaati}
                    onChange={(e) => {
                      if (readOnly) return;
                      const { normalized } = normalizeTimeInput(e.target.value);
                      const yeniFormData = { ...formData, sinavSaati: normalized };
                      setFormData(yeniFormData);
                      setErrors(validateGeneralSettings(yeniFormData));
                      if (onAyarlarDegistir) onAyarlarDegistir(yeniFormData);
                    }}
                    fullWidth
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    error={Boolean(errors.sinavSaati)}
                    helperText={errors.sinavSaati || ''}
                    disabled={readOnly}
                  />
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Algoritma Kısıtlamaları */}
        <Card elevation={0} sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: '16px', bgcolor: 'background.paper' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AlertIcon color="action" sx={{ fontSize: 20 }} />
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.2rem' }, letterSpacing: '-0.01em' }}>
                  Algoritma Kısıtlamaları
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: (theme) => theme.palette.mode === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Cinsiyet Kısıtı</Typography>
                    <Typography variant="caption" color="text.secondary">Kız-Erkek yan yana oturmasın</Typography>
                  </Box>
                  <Switch checked={Boolean(formData.kisitlar?.cinsiyetKisiti)} onChange={() => handleKisitToggle('cinsiyetKisiti')} disabled={readOnly} color="primary" />
                </Box>

                <Box sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: (theme) => theme.palette.mode === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Sınıf Seviyesi Kısıtı</Typography>
                    <Typography variant="caption" color="text.secondary">Aynı sınıf seviyesindeki öğrenciler yan yana oturmasın</Typography>
                  </Box>
                  <Switch checked={Boolean(formData.kisitlar?.sinifSeviyesiKisiti)} onChange={() => handleKisitToggle('sinifSeviyesiKisiti')} disabled={readOnly} color="primary" />
                </Box>

                <Box sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: (theme) => theme.palette.mode === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Arka Arkaya Sınıf Kısıtı</Typography>
                    <Typography variant="caption" color="text.secondary">Aynı seviyedeki öğrenciler arka arkaya oturmasın</Typography>
                  </Box>
                  <Switch checked={Boolean(formData.kisitlar?.arkaArkaSinifKisiti)} onChange={() => handleKisitToggle('arkaArkaSinifKisiti')} disabled={readOnly} color="primary" />
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* İlerleme / Sonraki Adım Aksiyon Çubuğu */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={() => setAktifTab('ogrenciler')}
          sx={{
            px: 3.5,
            py: 1.25,
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.95rem',
            boxShadow: (theme) => theme.palette.mode === 'dark' ? 'none' : 2
          }}
        >
          Sonraki Adım: Öğrenciler Listesi ➜
        </Button>
      </Box>

      {/* Kurum Bilgileri Modalı */}
      <Dialog open={kurumModalOpen} onClose={() => setKurumModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle><DialogHeader icon={<SchoolIcon />} title="Kurum Bilgileri" variant="info" onClose={() => setKurumModalOpen(false)} /></DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1 }}>
            <TextField
              label="Okul Adı"
              name="okulAdi"
              value={tempOkulAdi}
              onChange={(e) => setTempOkulAdi(e.target.value)}
              fullWidth
              variant="outlined"
              error={Boolean(errors.okulAdi && !tempOkulAdi.trim())}
              helperText={errors.okulAdi || 'Örn: Atatürk Anadolu Lisesi'}
              disabled={readOnly}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => setKurumModalOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>İptal</Button>
          <Button onClick={() => {
            const sanitizedOkulAdi = sanitizeText(tempOkulAdi, { trim: false });
            const yeniFormData = {
              ...formData,
              okulAdi: sanitizedOkulAdi
            };
            setFormData(yeniFormData);
            setErrors(validateGeneralSettings(yeniFormData));
            if (onAyarlarDegistir) {
              onAyarlarDegistir(yeniFormData);
            }
            setKurumModalOpen(false);
            showSuccess('Kurum bilgileri başarıyla kaydedildi.');
          }} variant="contained" color="primary" sx={{ fontWeight: 600 }} disabled={readOnly}>Kaydet</Button>
        </DialogActions>
      </Dialog >
    </Box >
  );
});

GenelAyarlarFormu.displayName = 'GenelAyarlarFormu';

export default GenelAyarlarFormu;
