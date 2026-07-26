import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  VpnKey as KeyIcon,
  Computer as ComputerIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { getMachineId, getStoredLicense, getLicenseDaysLeft, parseExpiryDateLocal } from '../services/licenseService';

const LicenseInfoDialog = ({ open, onClose }) => {
  const [machineId, setMachineId] = React.useState('');
  const [machineIdCopied, setMachineIdCopied] = React.useState(false);
  const [licenseInfo, setLicenseInfo] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      getMachineId().then(setMachineId).catch(() => setMachineId(''));
      getStoredLicense().then(setLicenseInfo).catch(() => setLicenseInfo(null));
    }
  }, [open]);

  const handleCopyMachineId = () => {
    if (!machineId) return;
    navigator.clipboard.writeText(machineId).then(() => {
      setMachineIdCopied(true);
      setTimeout(() => setMachineIdCopied(false), 2000);
    });
  };

  const licenseDaysLeft = licenseInfo?.expiryDate ? getLicenseDaysLeft(licenseInfo.expiryDate) : null;
  const licenseValid = licenseDaysLeft !== null && licenseDaysLeft >= 0;
  const licenseExpiry = licenseInfo?.expiryDate ? parseExpiryDateLocal(licenseInfo.expiryDate) : null;

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <KeyIcon color="secondary" />
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          Lisans Bilgileri
        </Typography>
        <IconButton size="small" onClick={handleClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        {/* Makine ID */}
        <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, bgcolor: '#f3e5f5', border: '1px solid #ce93d8' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
              <IconButton size="small" color={machineIdCopied ? 'success' : 'default'} onClick={handleCopyMachineId} disabled={!machineId}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Lisans almak için bu ID'yi yazılım sağlayıcınıza gönderin.
          </Typography>
        </Box>

        {/* Lisans Durumu */}
        <Box sx={{
          p: 2, borderRadius: 2,
          bgcolor: licenseInfo ? (licenseValid ? '#e8f5e9' : '#ffebee') : '#f5f5f5',
          border: '1px solid',
          borderColor: licenseInfo ? (licenseValid ? '#a5d6a7' : '#ef9a9a') : '#e0e0e0',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {licenseInfo
              ? licenseValid
                ? <CheckCircleIcon color="success" fontSize="small" />
                : <CancelIcon color="error" fontSize="small" />
              : <CancelIcon color="disabled" fontSize="small" />
            }
            <Typography variant="body2" fontWeight={700}>
              {licenseInfo
                ? licenseValid
                  ? `Aktif Lisans — ${licenseDaysLeft} gün kaldı`
                  : 'Lisans Süresi Dolmuş'
                : 'Lisans bulunamadı'
              }
            </Typography>
            {licenseInfo?.machineId && (
              <Chip label="🔒 Cihaza Özel" size="small" color="secondary" variant="outlined" sx={{ ml: 'auto' }} />
            )}
          </Box>
          {licenseInfo && (
            <Typography variant="caption" color="text.secondary">
              {licenseInfo.schoolNote && `${licenseInfo.schoolNote} — `}
              Son kullanma: {licenseExpiry?.toLocaleDateString('tr-TR')}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} color="inherit">Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LicenseInfoDialog;
