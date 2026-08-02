import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Premium modal başlık bileşeni.
 *
 * Çalışma prensibi:
 *   - DialogTitle'ın global padding'i 0 yapıldı (ThemeContext).
 *   - Bu bileşen kendi içinde stripe + padding'li içerik alanını yönetir.
 *   - Stripe kesinlikle kesilmez, overflow sorununa gerek kalmaz.
 *
 * variant: 'danger' | 'warning' | 'info' | 'success' | 'neutral'
 */
const VARIANT_STYLES = {
  danger: {
    gradient: 'linear-gradient(90deg, #b91c1c, #dc2626, #ef4444)',
    iconBg: '#fef2f2',
    iconBorder: '#fecaca',
    iconColor: '#dc2626',
    titleColor: '#991b1b',
  },
  warning: {
    gradient: 'linear-gradient(90deg, #b45309, #d97706, #f59e0b)',
    iconBg: '#fffbeb',
    iconBorder: '#fde68a',
    iconColor: '#d97706',
    titleColor: '#78350f',
  },
  info: {
    gradient: 'linear-gradient(90deg, #1d4ed8, #2563eb, #3b82f6)',
    iconBg: '#eff6ff',
    iconBorder: '#bfdbfe',
    iconColor: '#2563eb',
    titleColor: '#1e3a8a',
  },
  success: {
    gradient: 'linear-gradient(90deg, #047857, #059669, #10b981)',
    iconBg: '#ecfdf5',
    iconBorder: '#a7f3d0',
    iconColor: '#059669',
    titleColor: '#064e3b',
  },
  neutral: {
    gradient: 'linear-gradient(90deg, #1e293b, #334155, #475569)',
    iconBg: '#f8fafc',
    iconBorder: '#e2e8f0',
    iconColor: '#475569',
    titleColor: '#0f172a',
  },
};

const DialogHeader = ({ icon, title, subtitle, variant = 'neutral', onClose }) => {
  const s = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;

  const styledIcon = icon
    ? React.cloneElement(icon, {
        sx: { ...(icon.props?.sx || {}), fontSize: 20, color: s.iconColor, flexShrink: 0 }
      })
    : null;

  return (
    <Box>
      {/* ══ Renkli üst şerit — DialogTitle padding=0 ile tam genişlikte görünür ══ */}
      <Box
        sx={{
          height: 5,
          background: s.gradient,
          width: '100%',
          display: 'block',
        }}
      />

      {/* ══ İçerik alanı — kendi padding'iyle ══ */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          px: 3,
          pt: 2.5,
          pb: 2,
          position: 'relative',
          pr: onClose ? 6 : 3,
        }}
      >
        {styledIcon && (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: s.iconBg,
              border: `1px solid ${s.iconBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {styledIcon}
          </Box>
        )}

        <Box sx={{ minWidth: 0, flex: 1, pt: 0.5 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3, color: s.titleColor }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mt: 0.25, fontSize: '0.78rem' }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {onClose && (
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Kapat"
            sx={{
              position: 'absolute',
              right: 16,
              top: 16,
              color: 'text.secondary',
              width: 32,
              height: 32,
              bgcolor: 'rgba(0,0,0,0.04)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.09)', color: 'text.primary' },
              transition: 'all 0.18s ease',
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default DialogHeader;
