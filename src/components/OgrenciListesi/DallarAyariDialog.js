import React, { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Chip,
  IconButton
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import DialogHeader from '../common/DialogHeader';

const DallarAyariDialog = memo(({
  open,
  onClose,
  dallarEffective,
  yeniDalAdi,
  setYeniDalAdi,
  handleDalEkle,
  handleDalSil,
  yerlesimPlaniVarMi
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogHeader
        title="Dalları Düzenle (12. Sınıflar İçin)"
        onClose={onClose}
      />
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sisteme tanımlı olan dalları buradan yönetebilirsiniz. 12. sınıf öğrencilerinin
            hangi dallarda okuduğunu belirlemek için kullanılır.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              size="small"
              fullWidth
              label="Yeni Dal Adı"
              value={yeniDalAdi}
              onChange={(e) => setYeniDalAdi(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleDalEkle();
              }}
              disabled={yerlesimPlaniVarMi}
              placeholder="Örn: Hemşire Yardımcılığı"
            />
            <Button
              variant="contained"
              onClick={handleDalEkle}
              disabled={!yeniDalAdi.trim() || yerlesimPlaniVarMi}
              sx={{ minWidth: '100px' }}
              startIcon={<AddIcon />}
            >
              Ekle
            </Button>
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Mevcut Dallar ({Array.isArray(dallarEffective) ? dallarEffective.length : 0})
          </Typography>

          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            p: 2,
            bgcolor: 'background.default',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            minHeight: '100px'
          }}>
            {Array.isArray(dallarEffective) && dallarEffective.length > 0 ? (
              dallarEffective.map((dal, index) => (
                <Chip
                  key={index}
                  label={dal}
                  onDelete={!yerlesimPlaniVarMi ? () => handleDalSil(dal) : undefined}
                  color="primary"
                  variant="outlined"
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ width: '100%', textAlign: 'center', py: 2 }}>
                Henüz kayıtlı dal bulunmuyor.
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
});

DallarAyariDialog.displayName = 'DallarAyariDialog';
export default DallarAyariDialog;
