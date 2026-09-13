import React from 'react';
import { Box, Chip } from '@mui/material';

const SalonStatsChips = React.memo(({ mode, toplam, yerlesen, yerlesmeyen }) => {
  if (mode === 'plan' || mode === 'list') {
    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, sm: 1 },
        ml: { xs: 0, sm: 2 },
        flexWrap: 'wrap',
        justifyContent: { xs: 'center', sm: 'flex-start' }
      }}>
        <Chip label={`Toplam: ${toplam}`} color="primary" variant="outlined" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
        <Chip label={`Yerleşen: ${yerlesen}`} color="success" variant="outlined" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
        <Chip label={`Yerleşmeyen: ${yerlesmeyen}`} color="warning" variant="outlined" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
      </Box>
    );
  }

  return null;
});

export default SalonStatsChips;
