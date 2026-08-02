import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Uygulama genelinde sekme (tab) başlıklarında kullanılan standart üst başlık bileşeni.
 * Kurumsal yazılımlarda (Atlassian, GitHub, Linear vb.) yaygın olan sade "başlık + ince
 * alt ayraç" örüntüsünü izler: ikon nötr/gri tonda (Material Design 3 "on-surface-variant"
 * rolüne uygun, sadece etkileşimli öğelerde marka rengi kullanılır), başlığın altında
 * gerçek bir ayırıcı (border-bottom) bulunur — salt dekoratif öğe yoktur.
 * Tüm sekmelerde (Öğrenciler, Salonlar, Planlama, Salon Planı, Ayarlar, Sabit Atamalar,
 * Kayıtlı Planlar) tutarlı bir görünüm sağlar.
 *
 * @param {React.ReactNode} icon - Başlığın solunda gösterilecek MUI icon elemanı (renk/boyut burada standartlaştırılır)
 * @param {React.ReactNode} title - Başlık metni
 * @param {React.ReactNode} [titleExtra] - Başlık satırının sonuna eklenecek isteğe bağlı ek eleman (örn. istatistik chip'leri)
 * @param {React.ReactNode} [subtitle] - Başlığın altında gösterilecek isteğe bağlı alt metin
 * @param {React.ReactNode} [actions] - Başlığın sağında gösterilecek isteğe bağlı aksiyon alanı (buton vb.)
 * @param {object} [sx] - Dış kapsayıcı Box için ek stil
 */
const PageHeader = ({ icon, title, titleExtra, subtitle, actions, sx }) => {
  const styledIcon = icon
    ? React.cloneElement(icon, {
        sx: { ...(icon.props?.sx || {}), fontSize: 24, color: 'white' }
      })
    : null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: 'background.paper',
        borderRadius: '12px',
        py: 1.5,
        px: 2.5,
        mb: 3,
        border: '1px solid #e2e8f0',
        boxShadow: (theme) => theme.palette.mode === 'light' ? '0 2px 4px rgba(0, 0, 0, 0.02)' : 'none',
        flexWrap: 'wrap',
        gap: 1.5,
        ...sx
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flex: 1 }}>
        {icon && (
          <Box sx={{ 
            bgcolor: '#2563eb',
            color: 'white',
            borderRadius: '10px',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)',
            flexShrink: 0
          }}>
            {styledIcon}
          </Box>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, flex: 1, minWidth: 200 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.35rem' },
                fontWeight: 700, 
                color: (theme) => theme.palette.mode === 'light' ? '#0f172a' : '#f8fafc', 
                letterSpacing: '-0.01em', 
                m: 0
              }}
            >
              {title}
            </Typography>
            {titleExtra}
          </Box>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {actions && (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;
