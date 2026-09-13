import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Avatar, Chip, Tooltip, Button } from '@mui/material';
import { Person as PersonIcon, School as SchoolIcon, MeetingRoom as MeetingRoomIcon, AutoStories as AutoStoriesIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { isStudentGirl, getStudentGenderColor } from './SeatItem';
import { getOgrenciDersleri } from '../../algorithms/gelismisYerlestirmeAlgoritmasi';

const StudentDetailModal = ({
  open,
  onClose,
  seciliOgrenci,
  seciliMasa,
  getGenderColor,
  calculateDeskNumberForMasa,
  readOnly,
  handleRemoveStudentClick,
  ayarlar
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{
        bgcolor: seciliOgrenci ? `${getGenderColor(seciliOgrenci)}.main` : 'primary.main',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between', px: 3, py: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon sx={{ color: 'white' }} />
          <Typography variant="h6" sx={{ color: 'white' }}>
            {seciliOgrenci ? 'Öğrenci Detayları' : 'Masa Bilgileri'}
          </Typography>
        </Box>
        {seciliOgrenci && (
          <Chip
            label={isStudentGirl(seciliOgrenci) ? 'Kız' : 'Erkek'}
            size="small"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontWeight: 700
            }}
          />
        )}
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {seciliOgrenci ? (
          <Box>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 2,
              p: 1.5,
              bgcolor: `${getGenderColor(seciliOgrenci)}.50`,
              borderRadius: 2,
              border: '1px solid',
              borderColor: `${getGenderColor(seciliOgrenci)}.200`
            }}>
              <Avatar sx={{
                width: 56,
                height: 56,
                bgcolor: `${getGenderColor(seciliOgrenci)}.main`,
                fontSize: 28,
                mb: 1.5
              }}>
                {seciliOgrenci.ad ? seciliOgrenci.ad.charAt(0) : ''}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, color: `${getGenderColor(seciliOgrenci)}.main` }}>
                {seciliOgrenci.ad} {seciliOgrenci.soyad}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                {seciliOgrenci.sinif || seciliOgrenci.sube} - {seciliOgrenci.numara}
              </Typography>
            </Box>

            <Box sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'nowrap',
              alignItems: 'stretch',
              overflowX: 'auto',
              pb: 0.5
            }}>
              {/* Öğrenci No */}
              <Box sx={{
                flex: '1 1 auto',
                minWidth: '86px',
                p: 1,
                bgcolor: 'grey.50',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Box sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  bgcolor: 'primary.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main',
                  flexShrink: 0
                }}>
                  <SchoolIcon fontSize="small" />
                </Box>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1 }}>
                    Numara
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" noWrap>
                    {seciliOgrenci.numara}
                  </Typography>
                </Box>
              </Box>

              {/* Sınıf */}
              <Box sx={{
                flex: '1 1 auto',
                minWidth: '86px',
                p: 1,
                bgcolor: 'grey.50',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Box sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  bgcolor: 'secondary.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'secondary.main',
                  flexShrink: 0
                }}>
                  <MeetingRoomIcon fontSize="small" />
                </Box>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1 }}>
                    Sınıf
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" noWrap>
                    {seciliOgrenci.sinif || seciliOgrenci.sube}
                  </Typography>
                </Box>
              </Box>

              {/* Dersler */}
              <Box sx={{
                flex: '2 1 auto',
                minWidth: '122px',
                p: 1,
                bgcolor: 'grey.50',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Box sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  bgcolor: 'success.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'success.main',
                  flexShrink: 0
                }}>
                  <AutoStoriesIcon fontSize="small" />
                </Box>
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1 }}>
                    Sınav
                  </Typography>
                  <Tooltip title={(() => {
                    const ogrenciDersleri = getOgrenciDersleri(seciliOgrenci, ayarlar);
                    if (seciliOgrenci.dersler && seciliOgrenci.dersler.length > 0) return seciliOgrenci.dersler.join(', ');
                    if (seciliOgrenci.sinavDersleri && seciliOgrenci.sinavDersleri.length > 0) return seciliOgrenci.sinavDersleri.join(', ');
                    if (seciliOgrenci.ders && seciliOgrenci.ders.length > 0) return seciliOgrenci.ders.join(', ');
                    if (ogrenciDersleri && ogrenciDersleri.length > 0) return ogrenciDersleri.join(', ');
                    return 'Ders bilgisi bulunmuyor';
                  })()}>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {(() => {
                        const ogrenciDersleri = getOgrenciDersleri(seciliOgrenci, ayarlar);
                        const dersList =
                          (seciliOgrenci.dersler && seciliOgrenci.dersler.length > 0) ? seciliOgrenci.dersler :
                          (seciliOgrenci.sinavDersleri && seciliOgrenci.sinavDersleri.length > 0) ? seciliOgrenci.sinavDersleri :
                          (seciliOgrenci.ders && seciliOgrenci.ders.length > 0) ? seciliOgrenci.ders :
                          (ogrenciDersleri && ogrenciDersleri.length > 0) ? ogrenciDersleri :
                          null;

                        if (!dersList || dersList.length === 0) return 'Ders bilgisi yok';
                        const firstTwo = dersList.slice(0, 2).join(', ');
                        return dersList.length > 2 ? `${firstTwo}, ...` : firstTwo;
                      })()}
                    </Typography>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Boş Masa
            </Typography>
            {seciliMasa && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Masa Konumu:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Masa: ${seciliMasa.masaNumarasi || calculateDeskNumberForMasa(seciliMasa)}`}
                    variant="outlined"
                    size="small"
                    color="primary"
                  />
                  <Chip
                    label={`Satır: ${seciliMasa.satir + 1}`}
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`Sütun: ${seciliMasa.sutun + 1}`}
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`Pozisyon: ${seciliMasa.pozisyon}`}
                    color={seciliMasa.pozisyon === 'merkez' ? 'primary' : 'secondary'}
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        {seciliOgrenci && !readOnly ? (
          <Button
            onClick={handleRemoveStudentClick}
            color="error"
            variant="outlined"
            startIcon={<DeleteIcon />}
            size="small"
          >
            Listeden Çıkar
          </Button>
        ) : <Box />}
        <Button onClick={onClose} color="primary" variant="contained">
          Kapat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudentDetailModal;
