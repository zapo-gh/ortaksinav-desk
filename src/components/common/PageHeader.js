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
        sx: { ...(icon.props?.sx || {}), fontSize: 24, color: '#64748b' }
      })
    : null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        mb: 3,
        pb: 2,
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        flexWrap: 'wrap',
        ...sx
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {styledIcon}
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontSize: { xs: '1.15rem', sm: '1.35rem' },
              color: '#0f172a',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1.2
            }}
          >
            {title}
          </Typography>
          {titleExtra}
        </Box>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;
