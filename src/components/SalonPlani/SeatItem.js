import React, { memo, useState, useCallback, useMemo } from 'react';
import { Box, Paper, Typography, Avatar, IconButton, Tooltip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Chair as ChairIcon, Person as PersonIcon, Info as InfoIcon } from '@mui/icons-material';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import TransferButton from '../TransferButton';
import { isStudentFemale } from '../../utils/turkishUtils';

export const getStudentGenderColor = (ogrenci) => {
  return isStudentFemale(ogrenci) ? 'female' : 'male';
};

export const isStudentGirl = (ogrenci) => {
  return isStudentFemale(ogrenci);
};

export const StudentCardPreview = memo(({ ogrenci }) => {
  if (!ogrenci) return null;
  const isGirl = isStudentGirl(ogrenci);
  const genderColor = isGirl ? '#ec4899' : '#3b82f6';
  const bgColor = isGirl ? '#fdf2f8' : '#eff6ff';

  return (
    <Paper
      elevation={12}
      sx={{
        backdropFilter: 'none',
        p: { xs: 0.5, sm: 1 },
        borderRadius: '8px',
        minHeight: { xs: 68, sm: 84 },
        maxHeight: { xs: 68, sm: 84 },
        width: { xs: 100, sm: 120 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: bgColor,
        border: '2px solid',
        borderColor: genderColor,
        boxShadow: '0 12px 28px rgba(0,0,0,0.3)',
        transform: 'scale(1.05)',
        cursor: 'grabbing',
        pointerEvents: 'none',
        willChange: 'transform'
      }}
    >
      <Avatar sx={{ width: { xs: 16, sm: 20 }, height: { xs: 16, sm: 20 }, mx: 'auto', mb: 0.5, bgcolor: genderColor }}>
        <PersonIcon sx={{ fontSize: { xs: 10, sm: 12 } }} />
      </Avatar>
      <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, fontSize: { xs: '0.6rem', sm: '0.7rem' }, lineHeight: 1.1, textAlign: 'center', color: '#0f172a' }}>
        {ogrenci.ad} {ogrenci.soyad}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontSize: { xs: '0.5rem', sm: '0.6rem' }, color: '#475569' }}>
        {ogrenci.numara}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontSize: { xs: '0.5rem', sm: '0.6rem' }, color: '#0f172a', fontWeight: 700 }}>
        {ogrenci.sinif || ogrenci.sube}
      </Typography>
    </Paper>
  );
});
StudentCardPreview.displayName = 'StudentCardPreview';

export const DroppableSeat = memo(({ masa, onStudentMove, children, readOnly = false }) => {
  const theme = useTheme();
  const { setNodeRef, isOver } = useDroppable({
    id: `masa-${masa.id}`,
    disabled: readOnly,
  });

  const isOccupied = Boolean(masa?.ogrenci);
  const activeColor = isOccupied ? theme.palette.warning.main : theme.palette.success.main;

  return (
    <Box
      ref={setNodeRef}
      sx={{
        width: '100%',
        opacity: isOver ? 0.85 : 1,
        backgroundColor: isOver ? alpha(activeColor, 0.15) : 'transparent',
        border: isOver ? `2px dashed ${activeColor}` : '2px solid transparent',
        borderRadius: 1
      }}
    >
      {children}
    </Box>
  );
});

export const DraggableStudent = memo(({
  masa,
  getGenderColor,
  onMasaClick,
  onStudentHover,
  onStudentLeave,
  isSecili,
  isHovered,
  onStudentMove,
  onTransferClick,
  currentSalon,
  allSalons,
  readOnly = false,
  sinifDuzeni,
  getConstraintConflictInfo,
  calculateDeskNumberForMasa,
  plan2D,
  conflict,
  dndJustEnded = false
}) => {
  const theme = useTheme();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `student-${masa.id}`,
    data: {
      masaId: masa.id,
      ogrenci: masa.ogrenci
    },
    disabled: !masa.ogrenci || readOnly,
  });

  const conflictStyle = useMemo(() => {
    if (!conflict) return null;
    if (conflict.classSideBySide || conflict.classBackToBack) return {
      borderColor: 'error.main',
      bgcolor: 'error.50',
      glowColor: theme.palette.error.main
    };
    if (conflict.gender) return {
      borderColor: 'warning.main',
      bgcolor: 'warning.50',
      glowColor: theme.palette.warning.main
    };
    return null;
  }, [conflict, theme]);

  const conflictInfo = useMemo(() => {
    if (conflict && (conflict.gender || conflict.classSideBySide || conflict.classBackToBack) && getConstraintConflictInfo && plan2D) {
      const res = getConstraintConflictInfo(masa, plan2D);
      return res?.hasConflict ? res : null;
    }
    return null;
  }, [conflict, getConstraintConflictInfo, masa, plan2D]);

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        cursor: masa.ogrenci && !readOnly ? 'grab' : 'default',
        width: '100%',
        opacity: isDragging ? 0.3 : 1,
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none'
      }}
    >
      <Paper
        elevation={masa.ogrenci ? (isSecili ? 6 : 3) : 1}
        onMouseEnter={(e) => {
          if (e.buttons > 0) return; // Fare tuşuna basılıyken (sürükleme esnasında) hover tetikleme
          if (masa.ogrenci) onStudentHover(masa.ogrenci);
        }}
        onMouseLeave={(e) => {
          if (e.buttons > 0) return;
          onStudentLeave();
        }}
        onClick={() => {
          if (readOnly) return;
          if (dndJustEnded) return;
          if (isDragging) return;

          onMasaClick(masa, masa.ogrenci);
        }}
        sx={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'geometricPrecision',
          backdropFilter: 'none',
          p: { xs: 0.5, sm: 1 },
          borderRadius: '8px',
          minHeight: { xs: 68, sm: 84 },
          maxHeight: { xs: 68, sm: 84 },
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: masa.ogrenci
            ? (conflictStyle ? conflictStyle.bgcolor : `${getGenderColor(masa.ogrenci)}.50`)
            : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc'),
          border: masa.ogrenci ? '2px solid' : '1px solid',
          borderColor: masa.ogrenci
            ? (conflictStyle ? conflictStyle.borderColor : `${getGenderColor(masa.ogrenci)}.main`)
            : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'grey.300'),
          position: 'relative',
          cursor: masa.ogrenci && !readOnly ? 'grab' : 'pointer',
          transition: 'box-shadow 0.15s ease, transform 0.15s ease',
          transform: isSecili ? 'scale(1.04)' : 'scale(1)',
          boxShadow: isSecili
            ? 6
            : (conflictStyle ? `0 0 6px ${conflictStyle.glowColor}60` : (masa.ogrenci ? 2 : 1)),
          zIndex: isSecili ? 10 : 1,
          '&:hover': {
            transform: isSecili ? 'scale(1.04)' : 'scale(1.02)',
            boxShadow: isSecili ? 8 : (conflictStyle ? `0 0 10px ${conflictStyle.glowColor}` : 3),
            bgcolor: masa.ogrenci
              ? (conflictStyle ? conflictStyle.bgcolor : `${getGenderColor(masa.ogrenci)}.100`)
              : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'grey.200'),
            borderColor: !masa.ogrenci
              ? (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'grey.400')
              : undefined,
            zIndex: 10
          },
          ...(isSecili && {
            bgcolor: 'warning.100',
            borderColor: 'warning.main',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              border: '3px solid',
              borderColor: 'warning.main',
              borderRadius: 'inherit',
              animation: 'pulse 2s infinite'
            }
          })
        }}
      >
        {conflictInfo && (
          <Tooltip title={conflictInfo.message} placement="top" arrow>
            <Box
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                display: 'flex',
                gap: 0.5,
                zIndex: 20,
                flexDirection: 'row-reverse'
              }}
            >
              {(conflict.classSideBySide || conflict.classBackToBack) && (
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'error.main',
                    borderRadius: '50%',
                    boxShadow: 2,
                    border: '2px solid white'
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '12px', lineHeight: 1 }}>
                    !
                  </Typography>
                </Box>
              )}
              {conflict.gender && (
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'warning.main',
                    borderRadius: '50%',
                    boxShadow: 2,
                    border: '2px solid white'
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '11px', lineHeight: 1 }}>
                    C
                  </Typography>
                </Box>
              )}
            </Box>
          </Tooltip>
        )}

        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: { xs: 0.5, sm: 1 },
            left: { xs: 1, sm: 2 },
            fontWeight: 700,
            color: 'text.secondary',
            fontSize: { xs: '0.5rem', sm: '0.6rem' },
            cursor: 'default'
          }}
        >
          {masa.masaNumarasi || (calculateDeskNumberForMasa && calculateDeskNumberForMasa(masa))}
        </Typography>

        {masa.ogrenci ? (
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Avatar sx={{ width: { xs: 16, sm: 20 }, height: { xs: 16, sm: 20 }, mx: 'auto', mb: 0.5, bgcolor: `${getGenderColor(masa.ogrenci)}.main` }}>
              <PersonIcon sx={{ fontSize: { xs: 10, sm: 12 } }} />
            </Avatar>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, fontSize: { xs: '0.55rem', sm: '0.65rem' }, lineHeight: 1 }}>
              {masa.ogrenci.ad} {masa.ogrenci.soyad}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontSize: { xs: '0.5rem', sm: '0.6rem' }, color: 'text.secondary' }}>
              {masa.ogrenci.numara}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontSize: { xs: '0.45rem', sm: '0.55rem' }, color: 'text.primary', fontWeight: 700 }}>
              {masa.ogrenci.sinif || masa.ogrenci.sube}
            </Typography>
            <Box
              sx={{ position: 'absolute', bottom: 6, right: 6, opacity: isHovered ? 1 : 0.7, zIndex: 20, '&:hover': { opacity: 1 } }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <TransferButton
                student={masa.ogrenci}
                currentSalon={currentSalon}
                allSalons={allSalons}
                onTransferClick={onTransferClick}
                disabled={isDragging}
              />
            </Box>

            {!readOnly && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  zIndex: 20,
                  opacity: isHovered ? 1 : 0.7,
                  '&:hover': { opacity: 1 }
                }}
              >
                <IconButton
                  size="small"
                  aria-label="Öğrenci bilgileri"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (readOnly) return;
                    onMasaClick(masa, masa.ogrenci);
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  sx={{
                    color: `${getGenderColor(masa.ogrenci)}.main`,
                    padding: '4px',
                    '&:hover': {
                      backgroundColor: `${getGenderColor(masa.ogrenci)}.100`,
                      transform: 'scale(1.1)',
                      boxShadow: 1
                    }
                  }}
                >
                  <InfoIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            )}
          </Box>
        ) : (
          <Tooltip title={!readOnly ? "Boş Masa: Öğrenci yerleştirmek için tıklayın" : "Boş Masa"} arrow enterDelay={400}>
            <Box sx={{ textAlign: 'center', color: 'text.disabled', width: '100%', py: 0.5 }}>
              <ChairIcon sx={{ fontSize: { xs: 12, sm: 16 }, mb: 0.5 }} />
              <Typography variant="caption" sx={{ fontSize: { xs: '0.5rem', sm: '0.6rem' }, display: 'block' }}>Boş</Typography>
            </Box>
          </Tooltip>
        )}
      </Paper>
    </Box>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.masa === nextProps.masa &&
    prevProps.masa?.ogrenci === nextProps.masa?.ogrenci &&
    prevProps.isSecili === nextProps.isSecili &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.readOnly === nextProps.readOnly &&
    prevProps.dndJustEnded === nextProps.dndJustEnded &&
    prevProps.conflict === nextProps.conflict &&
    prevProps.currentSalon === nextProps.currentSalon
  );
});
