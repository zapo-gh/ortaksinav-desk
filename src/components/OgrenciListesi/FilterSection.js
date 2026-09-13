import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  People as PeopleIcon
} from '@mui/icons-material';

const FilterSection = ({
  aramaTerimi,
  setAramaTerimi,
  seciliSinifFiltre,
  setSeciliSinifFiltre,
  mevcutSiniflar,
  filtrelenmisOgrencilerLength,
  ogrencilerLength
}) => {
  return (
    <Box sx={{
      display: 'flex',
      gap: 2,
      mb: 3,
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%'
    }}>
      {/* Sol: Arama inputu (2. görseldeki gibi) */}
      <TextField
        size="small"
        placeholder="Ad, numara, sınıf, TC..."
        value={aramaTerimi}
        onChange={(e) => setAramaTerimi(e.target.value)}
        autoComplete="off"
        sx={{
          width: { xs: '100%', sm: 360, md: 420 },
          '& .MuiOutlinedInput-root': {
            height: 42,
            borderRadius: 2.5,
            bgcolor: 'white',
            '& fieldset': {
              borderColor: 'grey.300',
            },
            '&:hover fieldset': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
              borderWidth: 2,
            },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
          endAdornment: aramaTerimi ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => setAramaTerimi('')}
                edge="end"
                sx={{
                  '&:hover': {
                    bgcolor: 'error.50',
                    color: 'error.main'
                  }
                }}
              >
                ✕
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {/* Sağ: Sınıf Filtresi (Tüm Öğrenciler) ve Toplam Öğrenci Chip'i */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', ml: 'auto', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 180, bgcolor: 'white' }}>
          <Select
            value={seciliSinifFiltre}
            onChange={(e) => setSeciliSinifFiltre(e.target.value)}
            displayEmpty
            sx={{
              borderRadius: 2,
              height: 40,
              fontWeight: 500,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'grey.300',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            }}
          >
            <MenuItem value="Tümü">Tüm Öğrenciler</MenuItem>
            {mevcutSiniflar.map((sinif) => (
              <MenuItem key={sinif} value={sinif}>
                {sinif}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Chip
          icon={<PeopleIcon />}
          label={`Toplam: ${seciliSinifFiltre !== 'Tümü' || aramaTerimi ? filtrelenmisOgrencilerLength : ogrencilerLength} öğrenci`}
          color="primary"
          variant="outlined"
          sx={{
            height: 40,
            px: 1.5,
            borderRadius: 2,
            fontWeight: 600,
            bgcolor: 'primary.50',
            borderColor: 'primary.200',
            fontSize: '0.875rem'
          }}
        />
      </Box>
    </Box>
  );
};

export default FilterSection;
