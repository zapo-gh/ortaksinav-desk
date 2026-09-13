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
    <Paper elevation={1} sx={{ p: { xs: 1, sm: 2 }, mb: 3, bgcolor: 'grey.50' }}>
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
                borderColor: isActive ? 'primary.main' : '#e2e8f0',
                bgcolor: isActive ? '#eff6ff' : '#ffffff',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: isActive ? '#eff6ff' : '#f8fafc'
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
                  bgcolor: isActive ? 'primary.main' : '#f1f5f9',
                  color: isActive ? 'white' : '#64748b',
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
                borderColor: isActive ? 'primary.main' : '#e2e8f0',
                bgcolor: isActive ? '#eff6ff' : '#ffffff',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: isActive ? '#eff6ff' : '#f8fafc'
                }
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: isActive ? 'primary.main' : 'text.primary' }}>
                {salon.ad || salon.salonAdi || `Salon ${salon.id}`}
              </Typography>
              <Box
                title="Bu salonda yerleşen öğrenci sayısı"
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: '4px',
                  bgcolor: isActive ? 'primary.main' : '#f1f5f9',
                  color: isActive ? 'white' : '#64748b',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}
              >
                {getSalonYerlesenSayisi(salon)}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default SalonTabs;
