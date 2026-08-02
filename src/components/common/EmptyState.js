import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

const EmptyState = ({ 
  icon: Icon, 
  title = 'Veri Bulunamadı', 
  description = 'Burada gösterilecek bir veri henüz eklenmemiş.', 
  actionLabel, 
  onAction 
}) => {
  const theme = useTheme();

  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
        textAlign: 'center',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 4,
        boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.1)',
        minHeight: '40vh'
      }}
    >
      {Icon && (
        <Box
          component={motion.div}
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 15,
          }}
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(37, 99, 235, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3
          }}
        >
          <Icon sx={{ fontSize: 40, color: 'primary.main' }} />
        </Box>
      )}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 400, mb: 4 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button
          variant="contained"
          color="primary"
          onClick={onAction}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 4px 14px 0 rgba(96, 165, 250, 0.39)' 
              : '0 4px 14px 0 rgba(37, 99, 235, 0.39)'
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
