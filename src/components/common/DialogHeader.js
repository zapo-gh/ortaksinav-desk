import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Uygulama genelinde tüm modallarda (Dialog) standart başlık görünümü sağlayan bileşen.
 * `<DialogTitle>` içeriği olarak kullanılır. İkon rengi diyalogun anlamsal amacına göre
 * (örn. silme -> error, uyarı -> warning, bilgi -> info, normal işlem -> primary)
 * çağıran taraftan verilir; böylece renk yalnızca gerçek bir durumu ifade eder
 * (Material Design 3 renk-rolü ilkesi), rastgele/dekoratif kullanılmaz.
 *
 * @param {React.ReactNode} icon - Başlığın solunda gösterilecek MUI icon elemanı (rengi çağıran tarafından belirlenir)
 * @param {React.ReactNode} title - Başlık metni
 * @param {React.ReactNode} [subtitle] - Başlığın altında gösterilecek isteğe bağlı kısa açıklama
 * @param {function} [onClose] - Verilirse sağ üstte kapatma (X) butonu gösterilir
 */
const DialogHeader = ({ icon, title, subtitle, onClose }) => {
  const styledIcon = icon
    ? React.cloneElement(icon, {
        sx: { ...(icon.props?.sx || {}), fontSize: 22, flexShrink: 0 }
      })
    : null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, position: 'relative', pr: onClose ? 4 : 0 }}>
      {styledIcon}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3, color: '#0f172a' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {onClose && (
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Kapat"
          sx={{ position: 'absolute', right: -8, top: -8, color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};

export default DialogHeader;
