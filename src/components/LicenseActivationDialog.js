import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  DialogContentText, TextField, Button, Alert, Box,
  Typography, Chip, CircularProgress, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
  VpnKey as KeyIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Computer as ComputerIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { validateLicenseKey, storeLicense, getMachineId } from '../services/licenseService';

/**
 * Lisans aktivasyon ekranı.
 * Geçerli bir lisans anahtarı girilene kadar kapatılamaz.
 */
const LicenseActivationDialog = ({ onActivated, expiredInfo = null, onClose }) => {
  const [keyInput, setKeyInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [machineId, setMachineId] = React.useState('');
  const [machineIdCopied, setMachineIdCopied] = React.useState(false);

  React.useEffect(() => {
    getMachineId().then(setMachineId).catch(() => setMachineId(''));
  }, []);

  const handleCopyMachineId = () => {
    if (!machineId) return;
    navigator.clipboard.writeText(machineId).then(() => {
      setMachineIdCopied(true);
      setTimeout(() => setMachineIdCopied(false), 2000);
    });
  };

  // Tire ekleyerek formatla (her 4 karakterde bir)
  const handleKeyInput = (e) => {
    const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const formatted = raw.match(/.{1,4}/g)?.join('-') || raw;
    setKeyInput(formatted);
    setError(null);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setLoading(true);
    setError(null);

    const result = await validateLicenseKey(keyInput);
    setLoading(false);

    if (result.valid) {
      await storeLicense(keyInput, result);
      onActivated(result);
    } else {
      setError(result.error || 'Lisans anahtarı geçersiz.');
    }
  };

  return (
    <Dialog
      open
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* Başlık */}
      <DialogTitle sx={{ pb: 0, pt: 3, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 64, height: 64, borderRadius: '50%',
              bgcolor: expiredInfo ? 'warning.light' : 'primary.light',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {expiredInfo
              ? <WarningIcon sx={{ fontSize: 36, color: 'warning.dark' }} />
              : <KeyIcon sx={{ fontSize: 36, color: 'primary.dark' }} />
            }
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Ortak Sınav Yerleşim Programı
          </Typography>
          <Chip
            label={expiredInfo ? 'Lisans Süresi Doldu' : 'Lisans Aktivasyonu'}
            color={expiredInfo ? 'warning' : 'primary'}
            variant="outlined"
            size="small"
          />
        </Box>
      </DialogTitle>

      <Divider sx={{ mt: 2 }} />

      <form onSubmit={handleActivate}>
        <DialogContent sx={{ pt: 3 }}>
          {expiredInfo && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>{expiredInfo.schoolNote && `${expiredInfo.schoolNote} — `}</strong>
              Lisansınızın süresi {new Date(expiredInfo.expiryDate).toLocaleDateString('tr-TR')} tarihinde dolmuştur.
              Yenileme için aşağıdaki Makine ID'yi yazılım sağlayıcınıza gönderin.
            </Alert>
          )}

          {!expiredInfo && (
            <DialogContentText sx={{ mb: 2, textAlign: 'center' }}>
              Bu yazılımı kullanmak için lisans anahtarı gereklidir.
              Önce aşağıdaki Makine ID'yi yazılım sağlayıcınıza gönderin, ardından aldığınız anahtarı girin.
            </DialogContentText>
          )}

          <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: '#f3e5f5', border: '1px solid #ce93d8' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <ComputerIcon sx={{ fontSize: 18, color: '#7b1fa2' }} />
              <Typography variant="body2" fontWeight={700} color="#7b1fa2">
                Bu Makinenin ID'si
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  letterSpacing: '0.04em',
                  color: '#4a148c',
                  bgcolor: 'white',
                  px: 1.5, py: 0.75,
                  borderRadius: 1,
                  border: '1px solid #ce93d8',
                  flex: 1,
                  wordBreak: 'break-all',
                  userSelect: 'all',
                }}
              >
                {machineId || '(alınıyor...)'}
              </Typography>
              <Tooltip title={machineIdCopied ? 'Kopyalandı!' : 'Kopyala'}>
                <IconButton
                  size="small"
                  color={machineIdCopied ? 'success' : 'default'}
                  onClick={handleCopyMachineId}
                  disabled={!machineId}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Lisans anahtarı almak için bu ID'yi yazılım sağlayıcınıza iletin.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            label="Lisans Anahtarı"
            value={keyInput}
            onChange={handleKeyInput}
            fullWidth
            required
            size="medium"
            autoFocus
            autoComplete="off"
            inputProps={{ style: { fontFamily: 'monospace', letterSpacing: '0.1em', fontSize: '1.05rem' } }}
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-..."
            helperText="Lisans anahtarını tirelerle veya bitişik yazabilirsiniz."
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', gap: 1 }}>
          <Button
            onClick={() => onClose?.()}
            variant="outlined"
            color="inherit"
            fullWidth
            size="large"
          >
            Kapat / Geri dön
          </Button>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading || !keyInput.trim()}
            startIcon={loading ? undefined : <CheckIcon />}
          >
            {loading
              ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} thickness={5} />
                  Doğrulanıyor...
                </Box>
              : 'Lisansı Etkinleştir'
            }
          </Button>

          <Typography variant="caption" color="text.secondary" textAlign="center">
            Yazılım lisanslaması hakkında bilgi için iletişime geçin.
          </Typography>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LicenseActivationDialog;
