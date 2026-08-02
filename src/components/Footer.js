import React, { memo } from 'react';
import {
  Box,
  Typography,
  Container,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Chip
} from '@mui/material';
import {
  School as SchoolIcon,
  Email as EmailIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useExamStore } from '../store/useExamStore';
import ContactFormDialog from './ContactFormDialog';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const okulAdi = useExamStore(s => s.ayarlar?.okulAdi || '');
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false);

  return (
    <Box
      component="footer"
      className="app-footer"
      sx={{
        py: { xs: 1.75, sm: 2.25 },
        px: { xs: 1.5, sm: 2 },
        backgroundColor: 'grey.50',
        borderTop: '1px solid',
        borderColor: 'grey.200',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Dekoratif arka plan */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 50%, ${theme.palette.primary.main} 100%)`,
          opacity: 0.6
        }}
      />
      
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 2, sm: 2.5 }} className="footer-icerik">
          {/* Ana içerik */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2
            }}
          >
            {/* Sol taraf - Okul bilgisi */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SchoolIcon 
                sx={{ 
                  color: 'primary.main',
                  fontSize: 28
                }} 
              />
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.primary',
                    fontSize: '1.1rem'
                  }}
                >
                  {okulAdi || 'Ortak Sınav Sistemi'}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: { xs: '0.82rem', sm: '0.86rem' }
                  }}
                >
                  Ortak Sınav Yerleştirme Sistemi
                </Typography>
              </Box>
            </Box>

            {/* Sağ taraf - Versiyon ve linkler */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="v2.0"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
              <Divider orientation="vertical" flexItem />
             
              <Tooltip title="İletişim">
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => setContactDialogOpen(true)}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' }
                  }}
                >
                  <EmailIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Alt bilgi */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              pt: 1
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                fontSize: { xs: '0.82rem', sm: '0.86rem' },
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <InfoIcon fontSize="small" />
              © {currentYear} Tüm hakları saklıdır.
            </Typography>
          </Box>
        </Stack>
      </Container>
      <ContactFormDialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} />
    </Box>
  );
};

export default memo(Footer);
