import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { getSalonYerlesenSayisi } from './utils';

const SalonTabs = ({
  tumSalonlar,
  salonlar,
  sortedTumSalonlar,
  sortedSalonlar,
  sinif,
  onSalonDegistir,
  seciliSalonId,
  onSeciliSalonDegistir
}) => {
  if (!((tumSalonlar && tumSalonlar.length > 1) || (salonlar && salonlar.length > 0))) {
    return null;
  }

  return (
    <Paper elevation={0} sx={{ p: { xs: 1, sm: 2 }, mb: 3, border: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'background.default' : 'grey.50', borderRadius: '12px' }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1
        }}
      >
        {/* Yerleştirme planı varken - tumSalonlar kullan */}
        {sortedTumSalonlar && sortedTumSalonlar.length > 0 && sortedTumSalonlar.map((salon) => {
          const isActive = sinif?.salonId === salon.salonId;
          return (
            <Box
              key={salon.salonId}
              onClick={() => {
                if (onSalonDegistir) {
                  onSalonDegistir(salon);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: isActive ? 'primary.main' : 'divider',
                bgcolor: isActive
                  ? (theme) => theme.palette.mode === 'dark' ? 'rgba(79, 70, 229, 0.2)' : '#eff6ff'
                  : 'background.paper',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: isActive
                    ? (theme) => theme.palette.mode === 'dark' ? 'rgba(79, 70, 229, 0.25)' : '#eff6ff'
                    : 'action.hover'
                }
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: isActive ? 'primary.main' : 'text.primary' }}>
                {salon.salonAdi}
              </Typography>
              <Box
                title="Bu salonda yerleşen öğrenci sayısı"
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: '4px',
                  bgcolor: isActive ? 'primary.main' : (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  color: isActive ? 'white' : 'text.secondary',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}
              >
                {getSalonYerlesenSayisi(salon)}
              </Box>
            </Box>
          );
        })}

        {/* Yerleştirme planı yokken - salonlar kullan */}
        {(!tumSalonlar || tumSalonlar.length === 0) && sortedSalonlar && sortedSalonlar.map((salon) => {
          const isActive = seciliSalonId === salon.id;
          return (
            <Box
              key={salon.id}
              onClick={() => onSeciliSalonDegistir && onSeciliSalonDegistir(salon.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: isActive ? 'primary.main' : 'divider',
                bgcolor: isActive
                  ? (theme) => theme.palette.mode === 'dark' ? 'rgba(79, 70, 229, 0.2)' : '#eff6ff'
                  : 'background.paper',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: isActive
                    ? (theme) => theme.palette.mode === 'dark' ? 'rgba(79, 70, 229, 0.25)' : '#eff6ff'
                    : 'action.hover'
                }
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: isActive ? 'primary.main' : 'text.primary' }}>
                {salon.salonAdi}
              </Typography>
              <Box
                title="Salon kapasitesi"
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: '4px',
                  bgcolor: isActive ? 'primary.main' : (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  color: isActive ? 'white' : 'text.secondary',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}
              >
                {salon.kapasite || 0}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default React.memo(SalonTabs);
