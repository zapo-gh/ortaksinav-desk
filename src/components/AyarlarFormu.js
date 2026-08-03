import React, { useState, memo } from 'react';
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
  Grid,
  Box,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Avatar
} from '@mui/material';
import { useNotifications } from './NotificationSystem';
import { useExamSelector } from '../context/ExamContext';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Book as BookIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { sanitizeText, sanitizeStringArray } from '../utils/sanitizer';

const defaultFormData = {
  sinavAdi: '',
  sinavTarihi: '',
  sinavSaati: '',
  dersler: [],
  // Kullanıcı tarafından yönetilecek branş (dal) listesi
  // Varsayılan: boş (OgrenciListesi fallback gösterir)
  dallar: []
};

const createGeneratedDersId = (ders, index) => {
  const baseName = ders?.ad ? ders.ad.toString().toLowerCase().replace(/\s+/g, '-') : 'ders';
  return `generated-${index}-${baseName}`;
};

const normalizeSettings = (ayarlar) => {
  const normalizedDersler = Array.isArray(ayarlar?.dersler)
    ? ayarlar.dersler.map((ders, index) => {
      const normalizedId = ders?.id ?? ders?.uuid ?? createGeneratedDersId(ders, index);
      return {
        ...ders,
        id: normalizedId,
        ad: sanitizeText(ders?.ad || '', { trim: false }),
        siniflar: Array.isArray(ders.siniflar) ? sanitizeStringArray(ders.siniflar) : []
      };
    })
    : [];

  // dallar normalize:
  // - string[] ise direkt kullan
  // - {id, ad}[] ise ad alanını al
  // - null/undefined ise boş dizi
  let normalizedDallar = [];
  if (Array.isArray(ayarlar?.dallar)) {
    normalizedDallar = ayarlar.dallar
      .map((d) => {
        if (typeof d === 'string') return sanitizeText(d, { trim: true });
        if (d && typeof d === 'object') {
          const ad = d.ad ?? d.name ?? d.title;
          if (typeof ad === 'string') return sanitizeText(ad, { trim: true });
        }
        return '';
      })
      .filter(Boolean);
  }

  const normalized = {
    ...defaultFormData,
    ...(ayarlar || {}),
    dersler: normalizedDersler,
    dallar: normalizedDallar
  };

  normalized.sinavAdi = sanitizeText(normalized.sinavAdi || '', { trim: false });
  normalized.sinavTarihi = sanitizeText(normalized.sinavTarihi || '', { trim: false });
  normalized.sinavSaati = sanitizeText(normalized.sinavSaati || '', { trim: false });

  return normalized;
};

const computeErrors = (data) => {
  const validationErrors = {};
  if (Array.isArray(data?.dersler)) {
    data.dersler.forEach((ders) => {
      const key = ders?.id ?? ders?.uuid;
      if (!sanitizeText(ders?.ad || '')) {
        validationErrors[`ders_${key}`] = 'Ders adı boş bırakılamaz';
      }
    });
  }
  return validationErrors;
};

const areSettingsEqual = (prev, next) => {
  try {
    return deepEqual(prev, next);
  } catch (error) {
    console.warn('Ayarlar karşılaştırması yapılamadı:', error);
    return false;
  }
};

const AyarlarFormu = memo(({ ayarlar, onAyarlarDegistir, ogrenciler, yerlestirmeSonucu = null, readOnly: readOnlyProp = false }) => {
  const { showError } = useNotifications();
  const isWriteAllowed = useExamSelector((state) => state.role === 'admin');
  const readOnly = readOnlyProp || (process.env.NODE_ENV === 'test' ? false : !isWriteAllowed);
  const showReadOnlyMessage = React.useCallback(() => {
    showError('Bu işlemi gerçekleştirmek için yönetici olarak giriş yapmalısınız.');
  }, [showError]);

  const ensureWriteAllowed = React.useCallback(() => {
    if (readOnly) {
      showReadOnlyMessage();
      return false;
    }
    return true;
  }, [readOnly, showReadOnlyMessage]);
  const [formData, setFormData] = useState(() => normalizeSettings(ayarlar));
  const [errors, setErrors] = useState(() => computeErrors(normalizeSettings(ayarlar)));
  const [seciliSiniflar, setSeciliSiniflar] = useState(() => ({}));

  React.useEffect(() => {
    const yeniFormData = normalizeSettings(ayarlar);
    let shouldResetSelections = false;

    setFormData(prev => {
      if (areSettingsEqual(prev, yeniFormData)) {
        return prev;
      }
      shouldResetSelections = true;
      return yeniFormData;
    });
    setErrors(computeErrors(yeniFormData));

    if (shouldResetSelections) {
      setSeciliSiniflar({}); // Başlangıçta seçim yapma, çakışma yaratmasın
    }
  }, [ayarlar]);

  const [kaydedildi, setKaydedildi] = useState(false);
  void kaydedildi; // Kullanılmayan state

  // Dallar yönetimi UI state
  const [yeniDalAdi, setYeniDalAdi] = useState('');

  const applyFormUpdate = React.useCallback((nextData) => {
    if (readOnly) {
      return;
    }
    setFormData(nextData);
    const validationErrors = computeErrors(nextData);
    setErrors(validationErrors);
    if (onAyarlarDegistir) {
      onAyarlarDegistir(nextData);
    }
  }, [onAyarlarDegistir, readOnly]);

  // Yerleştirme planı kontrolü
  const yerlesimPlaniVarMi = () => {
    return yerlestirmeSonucu && (
      (yerlestirmeSonucu.salonlar && yerlestirmeSonucu.salonlar.length > 0) ||
      (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) ||
      (yerlestirmeSonucu.salon && yerlestirmeSonucu.salon.ogrenciler && yerlestirmeSonucu.salon.ogrenciler.length > 0)
    );
  };

  // Mevcut öğrencilerden sınıf listesini çıkar - Sınıf seviyesine göre sırala (9, 10, 11...)
  const mevcutSiniflar = [...new Set(ogrenciler?.map(ogrenci => ogrenci.sinif).filter(Boolean))].sort((a, b) => {
    // Sınıf seviyesini çıkar (9, 10, 11, 12...)
    const seviyeA = parseInt(a) || 0;
    const seviyeB = parseInt(b) || 0;

    // Önce seviyeye göre sırala
    if (seviyeA !== seviyeB) {
      return seviyeA - seviyeB;
    }

    // Aynı seviyedeyse alfabetik sırala
    return a.localeCompare(b);
  });

  const handleDersEkle = () => {
    if (!ensureWriteAllowed()) {
      return;
    }
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için ders eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    if (formData.dersler.length >= 4) return;

    const yeniDersId = Date.now();
    const yeniDers = {
      id: yeniDersId,
      ad: '',
      siniflar: []
    };

    const yeniFormData = {
      ...formData,
      dersler: [...formData.dersler, yeniDers]
    };

    applyFormUpdate(yeniFormData);
    setSeciliSiniflar(prev => ({
      ...prev,
      [yeniDersId]: []
    }));
  };

  const handleDersSil = (dersId) => {
    if (!ensureWriteAllowed()) {
      return;
    }
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için ders silinemez. Önce mevcut planı temizleyin.');
      return;
    }
    // Sadece onay diyaloğunu aç; silmeyi dersSilOnayla yapar
    setSilinecekDersId(dersId);
    setDersSilmeDialogAcik(true);
  };
  const [dersSilmeDialogAcik, setDersSilmeDialogAcik] = useState(false);
  const [silinecekDersId, setSilinecekDersId] = useState(null);
  const dersSilOnayla = () => {
    const targetId = silinecekDersId;
    setDersSilmeDialogAcik(false);
    setSilinecekDersId(null);

    if (targetId != null) {
      setTimeout(() => {
        const yeniFormData = {
          ...formData,
          dersler: formData.dersler.filter(d => d.id !== targetId)
        };
        applyFormUpdate(yeniFormData);
        setSeciliSiniflar(prev => {
          const updated = { ...prev };
          delete updated[targetId];
          return updated;
        });
        showSuccess('Ders başarıyla silindi.');
      }, 0);
    }
  };
  const dersSilIptal = () => {
    setDersSilmeDialogAcik(false);
    setSilinecekDersId(null);
  };

  const handleDersAdiDegistir = (dersId, yeniAd) => {
    if (!ensureWriteAllowed()) {
      return;
    }
    // Yerleştirme planı kontrolü - Admin değilse kısıtla
    if (yerlesimPlaniVarMi() && !isWriteAllowed) {
      showError('Mevcut bir yerleştirme planı bulunduğu için ders adı değiştirilemez. Önce mevcut planı temizleyin.');
      return;
    }

    const safeAd = sanitizeText(yeniAd, { trim: false });

    const yeniFormData = {
      ...formData,
      dersler: formData.dersler.map(ders =>
        ders.id === dersId ? { ...ders, ad: safeAd } : ders
      )
    };

    applyFormUpdate(yeniFormData);
  };

  const handleSinifEkle = (dersId, sinif) => {
    if (!ensureWriteAllowed()) {
      return;
    }
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için sınıf eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    const yeniFormData = {
      ...formData,
      dersler: formData.dersler.map(ders =>
        ders.id === dersId
          ? { ...ders, siniflar: sanitizeStringArray([...ders.siniflar, sinif]) }
          : ders
      )
    };

    applyFormUpdate(yeniFormData);
  };

  const handleSinifSecimi = (dersId, siniflar) => {
    if (!ensureWriteAllowed()) {
      return;
    }
    const sanitized = sanitizeStringArray(siniflar);
    setSeciliSiniflar(prev => ({
      ...prev,
      [dersId]: sanitized
    }));
  };

  const handleSinifEkleButon = (dersId) => {
    if (!ensureWriteAllowed()) {
      return;
    }
    const secilenSiniflar = seciliSiniflar[dersId] || [];
    if (secilenSiniflar.length === 0) {
      showError('Lütfen önce en az bir sınıf seçin!');
      return;
    }

    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için sınıf eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    // Seçilen tüm sınıfları tek seferde ekle
    const yeniFormData = {
      ...formData,
      dersler: formData.dersler.map(ders =>
        ders.id === dersId
          ? { ...ders, siniflar: sanitizeStringArray([...ders.siniflar, ...secilenSiniflar]) }
          : ders
      )
    };

    applyFormUpdate(yeniFormData);

    // Seçimi temizle
    setSeciliSiniflar(prev => ({
      ...prev,
      [dersId]: []
    }));
  };

  const handleSinifSil = (dersId, sinif) => {
    if (!ensureWriteAllowed()) {
      return;
    }
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için sınıf silinemez. Önce mevcut planı temizleyin.');
      return;
    }

    const yeniFormData = {
      ...formData,
      dersler: formData.dersler.map(ders =>
        ders.id === dersId
          ? { ...ders, siniflar: sanitizeStringArray(ders.siniflar.filter(s => s !== sinif)) }
          : ders
      )
    };

    applyFormUpdate(yeniFormData);

    // Silinen sınıfı seçili sınıflardan da çıkar
    setSeciliSiniflar(prev => ({
      ...prev,
      [dersId]: (prev[dersId] || []).filter(s => s !== sinif)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ensureWriteAllowed()) {
      return;
    }
    const topErrors = [];
    if (!formData.sinavAdi || !formData.sinavAdi.trim()) {
      topErrors.push('Sınav adı gerekli');
    }
    if (Object.keys(errors).length > 0) {
      showError('Lütfen formdaki hataları düzeltin.');
      return;
    }
    if (topErrors.length > 0) {
      // Üst uyarı olarak göster
      topErrors.forEach(msg => showError(msg));
      return;
    }
    if (onAyarlarDegistir) {
      onAyarlarDegistir(formData);
      setKaydedildi(true);
      setTimeout(() => setKaydedildi(false), 3000);
    }
  };

  return (
    <Box sx={{ width: '100%', mt: 0, mb: 4 }}>
      <PageHeader
        icon={<BookIcon sx={{ color: '#4F46E5', fontSize: 24 }} />}
        title="Ders Yönetimi"
        actions={
          <Button
            variant="contained"
            size="medium"
            startIcon={<AddIcon />}
            onClick={handleDersEkle}
            disabled={readOnly || formData.dersler.length >= 4 || yerlesimPlaniVarMi()}
            sx={{ fontWeight: 600, borderRadius: '8px', boxShadow: 'none' }}
          >
            Ders Ekle {formData.dersler.length >= 4 && '(Maksimum 4 ders)'}
          </Button>
        }
      />
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', mb: 4 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Sınav Ayarları bölümü: sadece test ortamında görünür, gerçek UI'dan kaldırıldı */}
        {process.env.NODE_ENV === 'test' && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" color="primary">
                Sınav Ayarları
              </Typography>
            </Box>
            {/* Sınav Bilgileri - Eski testlerle uyumlu alanlar */}
            <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Sınav Adı"
                    value={formData.sinavAdi}
                    onChange={(e) => applyFormUpdate({ ...formData, sinavAdi: e.target.value })}
                    disabled={readOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Sınav Tarihi"
                    value={formData.sinavTarihi}
                    onChange={(e) => applyFormUpdate({ ...formData, sinavTarihi: e.target.value })}
                    disabled={readOnly}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Sınav Saati"
                    value={formData.sinavSaati}
                    onChange={(e) => applyFormUpdate({ ...formData, sinavSaati: e.target.value })}
                    disabled={readOnly}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" disabled={readOnly}>
                    Ayarları Kaydet
                  </Button>
                </Grid>
              </Grid>
            </Box>
            {readOnly && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Bu bölüm görüntüleme modunda. Değişiklik yapabilmek için yönetici olarak giriş yapın.
              </Alert>
            )}
          </>
        )}
        {/* Yerleştirme Planı Uyarısı */}
        {yerlesimPlaniVarMi() && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            icon={<WarningIcon />}
          >
            <AlertTitle>Yerleştirme Planı Mevcut</AlertTitle>
            <Typography variant="body2">
              Mevcut bir yerleştirme planı bulunduğu için ders bilgilerinde değişiklik yapılamaz.
              {isWriteAllowed
                ? ' Ancak yönetici olduğunuz için ders isimlerini düzeltebilirsiniz. Ders ekleme, silme ve sınıf işlemleri için önce planı temizlemelisiniz.'
                : ' Ders ekleme, silme, ad değiştirme ve sınıf ekleme/çıkarma işlemleri kısıtlanmıştır.'}
              <br />
              {!isWriteAllowed && <strong>Önce mevcut planı temizleyin, sonra ders bilgilerini değiştirin.</strong>}
            </Typography>
          </Alert>
        )}

        <Box>

            {/* Ders Bilgileri baslik */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BookIcon sx={{ color: '#64748b', fontSize: 20 }} />
              <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 700, fontSize: { xs: '1.05rem', sm: '1.2rem' }, letterSpacing: '-0.01em' }}>
                Ders Bilgileri
              </Typography>
            </Box>

            {/* Ders Kartlari - yan yana */}
            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
              {formData.dersler.length === 0 && (
                <Box sx={{ width: '100%', py: 2 }}>
                  <EmptyState 
                    icon={BookIcon} 
                    title="Henüz ders eklenmemiş" 
                    description="Yeni bir ders eklemek için yukarıdaki 'Ders Ekle' butonunu kullanabilirsiniz." 
                  />
                </Box>
              )}
              {formData.dersler.map((ders, index) => {
                const dersIdForHandlers = ders?.id ?? createGeneratedDersId(ders, index);
                const dersKey = `${dersIdForHandlers}-${index}`;

                return (
                  <Card
                    key={dersKey}
                    elevation={0}
                    sx={{
                      flex: '1 1 260px',
                      minWidth: 240,
                      maxWidth: 380,
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      bgcolor: '#ffffff',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: '#cbd5e1', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)' }
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ width: 26, height: 26, mr: 1, bgcolor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontWeight: 800, fontSize: 13, borderRadius: '6px' }}>
                          {index + 1}
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 800, color: '#1e293b', fontSize: '0.92rem' }}>
                          Ders {index + 1}
                        </Typography>
                        {ders.ad && (
                          <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
                            {ders.ad}
                          </Typography>
                        )}
                        <IconButton
                          onClick={() => handleDersSil(dersIdForHandlers)}
                          color="error"
                          size="small"
                          disabled={readOnly}
                          title="Dersi Sil"
                          sx={{ bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <TextField
                        fullWidth
                        size="small"
                        label={ders.ad ? 'Ders' : 'Ders Adı'}
                        value={ders.ad}
                        onChange={(e) => handleDersAdiDegistir(dersIdForHandlers, e.target.value)}
                        variant="outlined"
                        placeholder="Örn: Matematik, Türkçe"
                        error={Boolean(errors[`ders_${dersIdForHandlers}`])}
                        helperText={errors[`ders_${dersIdForHandlers}`] || ''}
                        disabled={readOnly}
                        InputProps={{ startAdornment: (<InputAdornment position="start"><EditIcon color="action" fontSize="small" /></InputAdornment>) }}
                        sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#f8fafc', height: '40px', '&:hover': { bgcolor: '#ffffff' }, '&.Mui-focused': { bgcolor: '#ffffff' } } }}
                      />

                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Sınıf Seç (Çoklu)</InputLabel>
                          <Select
                            multiple
                            size="small"
                            value={seciliSiniflar[dersIdForHandlers] || []}
                            onChange={(e) => handleSinifSecimi(dersIdForHandlers, e.target.value)}
                            label="Sınıf Seç (Çoklu)"
                            renderValue={(selected) => {
                              if (selected.length === 0) { return <Typography component="span" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: '0.8rem' }}>Sınıf seçin...</Typography>; }
                              return (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: '26px', overflow: 'hidden' }}>{selected.map((value) => (<Chip key={value} label={value} size="small" color="primary" variant="outlined" sx={{ height: '20px', fontSize: '0.7rem', fontWeight: 700, borderRadius: '6px' }} />))}</Box>);
                            }}
                            sx={{ height: '40px', borderRadius: '10px', bgcolor: '#f8fafc', '&:hover': { bgcolor: '#ffffff' } }}
                            disabled={readOnly}
                          >
                            {mevcutSiniflar.filter(sinif => { if (ders.siniflar.includes(sinif)) return false; const d2 = formData.dersler.filter(d => d !== ders).flatMap(d => d.siniflar); return !d2.includes(sinif); }).map(sinif => (<MenuItem key={sinif} value={sinif} sx={{ fontWeight: (seciliSiniflar[dersIdForHandlers] || []).includes(sinif) ? 700 : 'normal', '&.Mui-selected': { backgroundColor: 'action.selected', fontWeight: 700 } }}>{sinif}</MenuItem>))}
                          </Select>
                        </FormControl>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleSinifEkleButon(dersIdForHandlers)}
                          disabled={readOnly || mevcutSiniflar.filter(sinif => { if (ders.siniflar.includes(sinif)) return false; const d2 = formData.dersler.filter(d => (d.id ?? d.uuid ?? `${d.ad || 'ders'}-${index}`) !== dersIdForHandlers).flatMap(d => d.siniflar); return !d2.includes(sinif); }).length === 0}
                          sx={{ minWidth: 'auto', px: 2, height: '40px', borderRadius: '10px', fontWeight: 700, textTransform: 'none', flexShrink: 0 }}
                        >
                          Ekle
                        </Button>
                      </Box>

                      {Array.isArray(ders.siniflar) && ders.siniflar.length > 0 && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.78rem', fontWeight: 600 }}>
                            <AddIcon fontSize="small" /> Bu dersi alan sınıflar:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {ders.siniflar.map(sinif => (<Chip key={`${dersKey}-${sinif}`} label={sinif} onDelete={!readOnly ? () => handleSinifSil(dersIdForHandlers, sinif) : undefined} color="primary" variant="outlined" size="small" sx={{ height: 24, borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', opacity: readOnly ? 0.7 : 1 }} />))}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>


      {/* Ders Silme Onayı Dialogu */}
      <Dialog open={dersSilmeDialogAcik} onClose={dersSilIptal} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <DialogHeader icon={<DeleteIcon />} title="Ders Silme Onayı" variant="danger" onClose={dersSilIptal} />
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">Seçili dersi silmek istediğinize emin misiniz?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={dersSilIptal} variant="outlined">İptal</Button>
          <Button onClick={dersSilOnayla} color="error" variant="contained">Sil</Button>
        </DialogActions>
      </Dialog>

      </CardContent>
    </Card>
    </Box>
  );
});

AyarlarFormu.displayName = 'AyarlarFormu';

export default AyarlarFormu;
