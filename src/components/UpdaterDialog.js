import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Typography, CircularProgress, Box 
} from '@mui/material';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import logger from '../utils/logger';

export default function UpdaterDialog() {
  const [update, setUpdate] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleManualCheck = () => {
      checkForUpdates(true);
    };
    window.addEventListener('check-for-updates', handleManualCheck);

    // Sadece Tauri içinde çalışıyorsa güncellemeleri kontrol et
    if (window.__TAURI_INTERNALS__) {
      checkForUpdates(false);
    }

    return () => {
      window.removeEventListener('check-for-updates', handleManualCheck);
    };
  }, []);

  const checkForUpdates = async (isManual = false) => {
    try {
      const updateResult = await check();
      if (updateResult) {
        logger.info(`Yeni güncelleme bulundu: ${updateResult.version}`);
        setUpdate(updateResult);
        setOpen(true);
      } else if (isManual) {
        // Güncelleme yoksa ve kullanıcı manuel olarak tetiklediyse bildir
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Uygulamanız güncel.', severity: 'success' } }));
      }
    } catch (err) {
      logger.error('Güncelleme kontrolü başarısız:', err);
      if (isManual) {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Güncelleme kontrol edilemedi.', severity: 'error' } }));
      }
    }
  };

  const handleUpdate = async () => {
    if (!update) return;
    
    setIsUpdating(true);
    setError(null);

    try {
      let downloaded = 0;
      let contentLength = 0;
      
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength;
            logger.info(`Güncelleme indiriliyor: ${contentLength} byte`);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            break;
          case 'Finished':
            logger.info('İndirme tamamlandı');
            break;
          default:
            break;
        }
      });

      logger.info('Güncelleme kuruldu, uygulama yeniden başlatılıyor...');
      await relaunch();
    } catch (err) {
      logger.error('Güncelleme yüklenirken hata oluştu:', err);
      setError('Güncelleme yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      setIsUpdating(false);
    }
  };

  if (!update) return null;

  return (
    <Dialog open={open} onClose={() => !isUpdating && setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Yeni Güncelleme Mevcut</DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Typography color="error">{error}</Typography>
        ) : isUpdating ? (
          <Box display="flex" flexDirection="column" alignItems="center" my={3}>
            <CircularProgress />
            <Typography mt={2}>Güncelleme indiriliyor ve kuruluyor. Lütfen bekleyin...</Typography>
          </Box>
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Versiyon <strong>{update.version}</strong> indirilebilir!
            </Typography>
            <Typography variant="body2" color="text.secondary" style={{ whiteSpace: 'pre-line', marginTop: 16 }}>
              {update.body || 'Hata düzeltmeleri ve performans iyileştirmeleri içerir.'}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)} disabled={isUpdating} color="inherit">
          Daha Sonra
        </Button>
        <Button onClick={handleUpdate} disabled={isUpdating} variant="contained" color="primary">
          {isUpdating ? 'Yükleniyor...' : 'Güncelle ve Yeniden Başlat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
