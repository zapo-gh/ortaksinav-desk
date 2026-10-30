import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import DialogHeader from './DialogHeader';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], label: 'Hızlı Öğrenci & Koltuk Arama', desc: 'Herhangi bir ekranda öğrenci adı veya numarasıyla arama yapar' },
  { keys: ['Ctrl', 'Z'], label: 'Son İşlemi Geri Al', desc: 'Salon planında yapılan son öğrenci taşıma/değişiklik işlemini geri alır' },
  { keys: ['Ctrl', 'Y'], label: 'İşlemi İleri Al', desc: 'Geri alınan öğrenci yerleşim işlemini tekrar uygular' },
  { keys: ['Ctrl', 'S'], label: 'Sınav Planını Kaydet', desc: 'Oluşturulan aktif sınav oturma planını veritabanına kaydeder' },
  { keys: ['Ctrl', 'P'], label: 'Yazdırma Menüsü', desc: 'Salon oturma planı, öğrenci listesi ve yoklama tutanağı yazdırma seçeneklerini açar' },
  { keys: ['Alt', '1...8'], label: 'Menüler Arası Hızlı Geçiş', desc: 'Sınav Ayarları, Öğrenciler, Dersler, Salonlar ve diğer sekmeler arasında geçiş' },
  { keys: ['F1', '?'], label: 'Klavye Kısayolları', desc: 'Bu kısayol rehberi penceresini açar' },
];

const KeyboardShortcutsDialog = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <DialogHeader
          icon={<KeyboardIcon />}
          title="Klavye Kısayolları"
          variant="info"
          onClose={onClose}
        />
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ortak Sınav uygulamasında işlerinizi hızlandırmak için aşağıdaki klavye kısayollarını kullanabilirsiniz:
        </Typography>

        <List disablePadding>
          {SHORTCUTS.map((sc, index) => (
            <React.Fragment key={sc.label}>
              <ListItem
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1.25,
                  px: 1.5,
                  borderRadius: '10px',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                  mb: 1
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {sc.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {sc.desc}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  {sc.keys.map((k) => (
                    <Chip
                      key={k}
                      label={k}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        fontFamily: 'monospace',
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(79, 70, 229, 0.25)' : '#e2e8f0',
                        color: (theme) => theme.palette.mode === 'dark' ? '#c7d2fe' : '#1e293b',
                        border: '1px solid',
                        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(79, 70, 229, 0.4)' : '#cbd5e1',
                        borderRadius: '6px',
                        px: 0.5
                      }}
                    />
                  ))}
                </Box>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ fontWeight: 700, borderRadius: '8px' }}>
          Anladım
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;

