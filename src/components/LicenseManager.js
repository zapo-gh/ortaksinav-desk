import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert, Box, Typography,
  Divider, Chip, CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import {
  VpnKey as KeyIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { generateLicenseKey, getStoredLicense, clearLicense, getLicenseDaysLeft, parseExpiryDateLocal } from '../services/licenseService';

/**
 * Süper admin için lisans anahtarı üretme paneli.
 * Yalnızca zaferkulte@gmail.com ile giriş yapıldığında görünür.
 */
const LicenseManager = ({ open, onClose }) => {
  const [schoolNote, setSchoolNote] = React.useState('');
  const [machineIdInput, setMachineIdInput] = React.useState('');
  const [expiryDate, setExpiryDate] = React.useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = React.useState(false);
  const [generatedKey, setGeneratedKey] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState('');

  // Mevcut lisans durumu
  const [storedLicense, setStoredLicense] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      getStoredLicense().then(setStoredLicense).catch(() => setStoredLicense(null));
    }
  }, [open]);

  const handleClearLicense = async () => {
    await clearLicense();
    setStoredLicense(null);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!expiryDate) { setError('Son kullanma tarihi seçiniz.'); return; }
    setError('');
    setLoading(true);
    try {
      const key = await generateLicenseKey(expiryDate, schoolNote.trim(), machineIdInput.trim());
      setGeneratedKey(key);
    } catch (err) {
      setError(err.message || 'Anahtar üretilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClose = () => {
    setGeneratedKey('');
    setCopied(false);
    setError('');
    onClose();
  };

  const daysLeft = expiryDate ? getLicenseDaysLeft(expiryDate) : null;

  // Mevcut lisans bilgileri
  const storedDaysLeft = storedLicense?.expiryDate ? getLicenseDaysLeft(storedLicense.expiryDate) : null;
  const storedValid = storedDaysLeft !== null && storedDaysLeft >= 0;
  const storedExpiry = storedLicense?.expiryDate ? parseExpiryDateLocal(storedLicense.expiryDate) : null;

  const isMachineSpecific = machineIdInput.trim().length > 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <KeyIcon color="primary" />
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          Lisans Anahtarı Üretici
        </Typography>
        <IconButton size="small" onClick={handleClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />

      <form onSubmit={handleGenerate}>
        <DialogContent sx={{ pt: 2.5 }}>
          {/* Mevcut Lisans Durumu */}
          <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: storedLicense ? (storedValid ? '#e8f5e9' : '#ffebee') : '#f5f5f5', border: '1px solid', borderColor: storedLicense ? (storedValid ? '#a5d6a7' : '#ef9a9a') : '#e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {storedLicense
                  ? storedValid
                    ? <CheckIcon color="success" fontSize="small" />
                    : <CancelIcon color="error" fontSize="small" />
                  : <CancelIcon color="disabled" fontSize="small" />
                }
                <Typography variant="body2" fontWeight={600}>
                  {storedLicense
                    ? storedValid
                      ? `Aktif Lisans — ${storedDaysLeft} gün kaldı`
                      : 'Lisans Süresi Dolmuş'
                    : 'Bu makinede lisans yok'
                  }
                </Typography>
              </Box>
              {storedLicense && (
                <Tooltip title="Lisansı bu makineden kaldır">
                  <IconButton size="small" color="error" onClick={handleClearLicense}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            {storedLicense && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {storedLicense.schoolNote && `${storedLicense.schoolNote} — `}
                Son kullanma: {storedExpiry?.toLocaleDateString('tr-TR')}
                {storedLicense.activatedAt && ` · Etkinleştirme: ${new Date(storedLicense.activatedAt).toLocaleDateString('tr-TR')}`}
                {storedLicense.machineId && ` · 🔒 Cihaza özel`}
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Yeni Anahtar Üret
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Müşteri, kendi bilgisayarında lisans aktivasyon ekranındaki Makine ID'yi size gönderir.
            Okul adı, müşterinin Makine ID'si ve son kullanma tarihini girerek anahtar üretin.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            label="Okul / Kurum Adı (opsiyonel)"
            value={schoolNote}
            onChange={e => setSchoolNote(e.target.value)}
            fullWidth
            size="small"
            margin="dense"
            inputProps={{ maxLength: 60 }}
            placeholder="Örn: Akhisar Farabi MTAL"
            helperText="Anahtarın içine gömülür, doğrulama sırasında görünür."
          />

          <TextField
            label="Müşterinin Makine ID'si (opsiyonel — boş bırakılırsa evrensel)"
            value={machineIdInput}
            onChange={e => setMachineIdInput(e.target.value)}
            fullWidth
            size="small"
            margin="dense"
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            placeholder="Müşterinin lisans ekranından kopyaladığı Makine ID"
            helperText={
              isMachineSpecific
                ? '🔒 Bu anahtar yalnızca müşterinin bilgisayarında çalışacak.'
                : '🌐 Boş bırakılırsa tüm makinelerde geçerli evrensel lisans üretilir.'
            }
            FormHelperTextProps={{ sx: { color: isMachineSpecific ? 'success.main' : 'text.secondary' } }}
          />

          <TextField
            label="Son Kullanma Tarihi"
            type="date"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            fullWidth
            required
            size="small"
            margin="dense"
            InputLabelProps={{ shrink: true }}
            helperText={
              daysLeft !== null
                ? daysLeft > 0
                  ? `Bu tarihten itibaren ${daysLeft} gün geçerli.`
                  : 'Seçilen tarih geçmişte!'
                : ''
            }
          />

          {/* Üretilen anahtar */}
          {generatedKey && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1 }}>
                Üretilen Lisans Anahtarı
              </Typography>
              <Box
                sx={{
                  background: '#f0f7ff',
                  border: '1.5px solid #90caf9',
                  borderRadius: 2,
                  p: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.92rem',
                  letterSpacing: '0.06em',
                  color: '#0d47a1',
                  wordBreak: 'break-all',
                  userSelect: 'all',
                }}
              >
                {generatedKey}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Tooltip title={copied ? 'Kopyalandı!' : 'Panoya kopyala'}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CopyIcon />}
                    onClick={handleCopy}
                    color={copied ? 'success' : 'primary'}
                  >
                    {copied ? 'Kopyalandı!' : 'Kopyala'}
                  </Button>
                </Tooltip>
                {schoolNote && (
                  <Chip label={schoolNote} size="small" variant="outlined" />
                )}
                {expiryDate && (
                  <Chip
                    label={`Son: ${new Date(expiryDate).toLocaleDateString('tr-TR')}`}
                    size="small"
                    color={daysLeft > 0 ? 'success' : 'error'}
                    variant="outlined"
                  />
                )}
                {isMachineSpecific && (
                  <Chip label="🔒 Cihaza Özel" size="small" color="secondary" variant="outlined" />
                )}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} color="inherit">Kapat</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? undefined : <KeyIcon />}
          >
            {loading
              ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} thickness={5} />Üretiliyor...
                </Box>
              : 'Anahtar Üret'
            }
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LicenseManager;
