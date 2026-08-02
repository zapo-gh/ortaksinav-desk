import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  SwapHoriz as SwapIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';
import { useNotifications } from './NotificationSystem';
import DialogHeader from './common/DialogHeader';

const InterSalonTransfer = ({ 
  open, 
  onClose, 
  student, 
  currentSalon, 
  allSalons, 
  onTransfer,
  onCancel 
}) => {
  const { showSuccess, showError, showWarning } = useNotifications();
  const theme = useTheme();
  const [selectedTargetSalon, setSelectedTargetSalon] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferMode] = useState('move'); // Sadece 'move' modu


  // Cinsiyet bazlı renk fonksiyonu
  const getGenderColor = (ogrenci) => {
    if (!ogrenci || !ogrenci.cinsiyet) return 'primary';
    
    const cinsiyet = ogrenci.cinsiyet.toString().toLowerCase().trim();
    return cinsiyet === 'kız' || cinsiyet === 'kadin' || cinsiyet === 'k' ? 'secondary' : 'primary';
  };

  // Hedef salonları filtrele (mevcut salon hariç)
  const availableSalons = useMemo(() => {
    const filtered = allSalons.filter(salon => 
      salon.id !== currentSalon?.id && 
      (salon.durum === 'aktif' || salon.durum === undefined) // Allow undefined durum
    );
    
    
    return filtered;
  }, [allSalons, currentSalon]);

  // Salon kapasitesi kontrolü
  const getSalonCapacity = useCallback((salon) => {
    // Salon kapasitesini daha esnek hesapla - masalar.length'i öncelikle kullan
    let totalCapacity = 0;
    
    // Önce masalar array'ini kontrol et (en güvenilir)
    if (salon.masalar && Array.isArray(salon.masalar) && salon.masalar.length > 0) {
      totalCapacity = salon.masalar.length;
    }
    // Sonra kapasite property'sini kontrol et
    else if (salon.kapasite && typeof salon.kapasite === 'number' && salon.kapasite > 0) {
      totalCapacity = salon.kapasite;
    }
    // Son olarak siraDizilimi'nden hesapla
    else if (salon.siraDizilimi) {
      totalCapacity = (salon.siraDizilimi.satir || 0) * (salon.siraDizilimi.sutun || 0);
    }
    
    // Mevcut öğrenci sayısını hesapla - masalardaki öğrencileri say
    let currentStudents = 0;
    if (salon.masalar && Array.isArray(salon.masalar)) {
      currentStudents = salon.masalar.filter(masa => masa.ogrenci).length;
    } else if (salon.ogrenciler && Array.isArray(salon.ogrenciler)) {
      currentStudents = salon.ogrenciler.length;
    }
    
    return {
      total: totalCapacity,
      used: currentStudents,
      available: totalCapacity - currentStudents
    };
  }, []);

  // Transfer validasyonu
  const validateTransfer = useCallback((targetSalon) => {
    if (!targetSalon) {
      showError('Lütfen hedef salon seçin!');
      return false;
    }

    const capacity = getSalonCapacity(targetSalon);
    if (capacity.available <= 0) {
      showError(`${targetSalon.salonAdi} salonu dolu!`);
      return false;
    }

    // Aynı sınıf seviyesi kontrolü
    const studentClass = student?.sinif;
    const targetSalonStudents = targetSalon.ogrenciler || [];
    const hasSameClass = targetSalonStudents.some(s => s.sinif === studentClass);
    
    if (!hasSameClass) {
      showWarning(`Uyarı: ${targetSalon.salonAdi} salonunda ${studentClass} sınıfından öğrenci yok!`);
    }

    return true;
  }, [student, getSalonCapacity, showError, showWarning]);

  // Modal kapatma
  const handleClose = useCallback(() => {
    setSelectedTargetSalon(null);
    onClose();
  }, [onClose]);

  // Transfer işlemi
  const handleTransfer = useCallback(async () => {
    if (!validateTransfer(selectedTargetSalon)) return;

    setIsTransferring(true);
    try {
      await onTransfer({
        student,
        fromSalon: currentSalon,
        toSalon: selectedTargetSalon,
        mode: transferMode
      });
      
      // Bildirim AnaSayfa'da gönderiliyor, burada tekrar göndermeye gerek yok
      handleClose();
    } catch (error) {
      showError('Transfer işlemi başarısız: ' + error.message);
    } finally {
      setIsTransferring(false);
    }
  }, [student, currentSalon, selectedTargetSalon, transferMode, onTransfer, showError, validateTransfer, handleClose]);

  if (!student || !currentSalon) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>
        <DialogHeader icon={<SwapIcon color="primary" />} title="Transfer" />
      </DialogTitle>

      <DialogContent sx={{ px: 2, pt: 1.5, pb: 1 }}>
        {/* Öğrenci Bilgileri (minimal) */}
        <Paper
          variant="outlined"
          sx={{
            mb: 2,
            p: 1.5,
            bgcolor:
              getGenderColor(student) === 'secondary'
                ? alpha(theme.palette.secondary.main, 0.06)
                : alpha(theme.palette.primary.main, 0.06),
            borderColor:
              getGenderColor(student) === 'secondary'
                ? alpha(theme.palette.secondary.main, 0.6)
                : alpha(theme.palette.primary.main, 0.6)
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: getGenderColor(student) === 'secondary' ? 'secondary.main' : 'primary.main',
                width: 34,
                height: 34
              }}
            >
              <PersonIcon sx={{ fontSize: 18 }} />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                noWrap
                sx={{
                  color: getGenderColor(student) === 'secondary' ? 'secondary.dark' : 'primary.dark',
                  fontWeight: 800,
                  fontSize: '0.95rem'
                }}
              >
                {student.ad} {student.soyad}
              </Typography>

              <Typography variant="body2" color="text.secondary" noWrap>
                {student.sinif} • {student.numara}
              </Typography>

              <Typography variant="caption" color="text.secondary" noWrap>
                Mevcut: {currentSalon.salonAdi}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Hedef Salon Seçimi */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Hedef
        </Typography>

        {availableSalons.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 1 }}>
            Aktif salon bulunmuyor.
          </Alert>
        ) : (
          <Grid container spacing={1}>
            {availableSalons.map((salon) => {
              const capacity = getSalonCapacity(salon);
              const isSelected = selectedTargetSalon?.id === salon.id;
              const isFull = capacity.available <= 0;

              return (
                <Grid item xs={12} sm={6} key={salon.id}>
                  <Paper
                    variant="outlined"
                    onClick={() => !isFull && setSelectedTargetSalon(salon)}
                    sx={{
                      cursor: isFull ? 'not-allowed' : 'pointer',
                      opacity: isFull ? 0.6 : 1,
                      p: 1,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      '&:hover': !isFull ? { borderColor: 'primary.main' } : undefined
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <SchoolIcon color="primary" sx={{ fontSize: 18 }} />
                        <Typography
                          variant="subtitle2"
                          noWrap
                          sx={{ fontWeight: 800, fontSize: '0.9rem' }}
                        >
                          {salon.salonAdi}
                        </Typography>
                      </Box>
                      {isSelected && <CheckIcon color="primary" sx={{ fontSize: 18 }} />}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.8, mt: 1, flexWrap: 'wrap' }}>
                      <Chip label={`${capacity.used}/${capacity.total}`} size="small" />
                      <Chip
                        label={`${capacity.available} boş`}
                        size="small"
                        color={capacity.available > 0 ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Seçilen Hedef Salon (tek satır özet) */}
        {selectedTargetSalon && (
          <Paper
            variant="outlined"
            sx={{
              mt: 2,
              p: 1,
              bgcolor:
                getGenderColor(student) === 'secondary'
                  ? alpha(theme.palette.secondary.main, 0.04)
                  : alpha(theme.palette.primary.main, 0.04)
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArrowIcon sx={{ color: getGenderColor(student) === 'secondary' ? 'secondary.main' : 'primary.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {student.ad} {student.soyad} → {selectedTargetSalon.salonAdi}
              </Typography>
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={isTransferring} variant="outlined">
          İptal
        </Button>
        <Button
          onClick={handleTransfer}
          variant="contained"
          disabled={!selectedTargetSalon || isTransferring}
          startIcon={isTransferring ? <CircularProgress size={16} /> : <SwapIcon />}
        >
          {isTransferring ? 'Transfer...' : 'Transfer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InterSalonTransfer;
