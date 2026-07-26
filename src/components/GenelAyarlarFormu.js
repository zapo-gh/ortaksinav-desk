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
} from '@mui/material';
import {
  School as SchoolIcon,
  Book as BookIcon,
  ReportProblem as AlertIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { sanitizeText } from '../utils/sanitizer';
import { useExamStore } from '../store/useExamStore';

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
  // Kullanıcı "08:3" yazabilir -> "08:03"
  // Hedef: sadece rakam ve ":" üzerinden normalize
  const cleaned = sanitizeText(raw || '', { trim: false }).replace(/[^\d:]/g, '');
  if (!cleaned) return { normalized: '', valid: false };

  // Birden fazla ":" varsa tutarsız kabul et
  const parts = cleaned.split(':');
  if (parts.length !== 2) return { normalized: cleaned, valid: false };

  let [hh, mm] = parts;

  // boş/eksikse bir şey yapma (validasyon da error verir)
  if (hh.length === 0 || mm.length === 0) return { normalized: cleaned, valid: false };

  // saat/ dakika tek haneyse başına 0 ekle
  if (hh.length === 1) hh = `0${hh}`;
  if (mm.length === 1) mm = `0${mm}`;

  const normalized = `${hh.slice(0, 2)}:${mm.slice(0, 2)}`;

  // validate HH:mm aralığı
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
  const isWriteAllowed = role === 'admin';
  const readOnly = readOnlyProp !== null ? readOnlyProp : !isWriteAllowed;
  const [formData, setFormData] = useState(() => normalizeGeneralSettings(ayarlar));
  const [errors, setErrors] = useState(() => validateGeneralSettings(normalizeGeneralSettings(ayarlar)));

  // Ayarlar prop'u değiştiğinde formData'yı güncelle (özellikle plan yükleme sonrası)
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
    <Card sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      <CardContent>
        {readOnly && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Bu alanı sadece görüntüleyebilirsiniz. Değişiklik yapmak için yönetici olarak giriş yapın.
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Okul Bilgileri */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SchoolIcon sx={{ color: '#2563eb', fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' }, letterSpacing: '-0.015em' }}>
                Okul Bilgileri
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </Box>

          <Box>
            <TextField
              label="Okul Adı"
              name="okulAdi"
              value={formData.okulAdi}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              error={Boolean(errors.okulAdi)}
              helperText={errors.okulAdi || ''}
              disabled={readOnly}
            />
          </Box>

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

          {/* Sınav Bilgileri */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookIcon sx={{ color: '#2563eb', fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' }, letterSpacing: '-0.015em' }}>
                Sınav Bilgileri
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </Box>

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
              InputProps={{
                startAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, pr: 0.5 }}>
                    <CalendarIcon fontSize="small" color={errors.sinavTarihi ? 'error' : 'action'} />
                  </Box>
                ),
              }}
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
                if (onAyarlarDegistir) {
                  onAyarlarDegistir(yeniFormData);
                }
              }}
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              error={Boolean(errors.sinavSaati)}
              helperText={errors.sinavSaati || ''}
              disabled={readOnly}
              InputProps={{
                startAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, pr: 0.5 }}>
                    <TimeIcon fontSize="small" color={errors.sinavSaati ? 'error' : 'action'} />
                  </Box>
                ),
              }}
            />
          </Box>

          {/* Algoritma Kısıtlamaları */}
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertIcon sx={{ color: '#2563eb', fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' }, letterSpacing: '-0.015em' }}>
                Algoritma Kısıtlamaları
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 220px', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Cinsiyet Kısıtı</Typography>
                <Typography variant="caption" color="text.secondary">(Kız-Erkek yan yana)</Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(formData.kisitlar?.cinsiyetKisiti)}
                      onChange={() => handleKisitToggle('cinsiyetKisiti')}
                      disabled={readOnly}
                      color="primary"
                    />
                  }
                  label={formData.kisitlar?.cinsiyetKisiti ? 'Aktif' : 'Pasif'}
                />
              </Box>

              <Box sx={{ flex: '1 1 220px', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Sınıf Seviyesi Kısıtı</Typography>
                <Typography variant="caption" color="text.secondary">(Aynı seviye yan yana)</Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(formData.kisitlar?.sinifSeviyesiKisiti)}
                      onChange={() => handleKisitToggle('sinifSeviyesiKisiti')}
                      disabled={readOnly}
                      color="primary"
                    />
                  }
                  label={formData.kisitlar?.sinifSeviyesiKisiti ? 'Aktif' : 'Pasif'}
                />
              </Box>

              <Box sx={{ flex: '1 1 220px', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Arka Arkaya Sınıf Kısıtı</Typography>
                <Typography variant="caption" color="text.secondary">(Üst-alt aynı seviye)</Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(formData.kisitlar?.arkaArkaSinifKisiti)}
                      onChange={() => handleKisitToggle('arkaArkaSinifKisiti')}
                      disabled={readOnly}
                      color="primary"
                    />
                  }
                  label={formData.kisitlar?.arkaArkaSinifKisiti ? 'Aktif' : 'Pasif'}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});

GenelAyarlarFormu.displayName = 'GenelAyarlarFormu';

export default GenelAyarlarFormu;
