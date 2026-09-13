import React, { memo, useState, useCallback, useMemo } from 'react';
import { Box, Paper, Typography, Avatar, IconButton, Tooltip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Chair as ChairIcon, Person as PersonIcon, Info as InfoIcon } from '@mui/icons-material';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import TransferButton from '../TransferButton';

export const getStudentGenderColor = (ogrenci) => {
  if (!ogrenci || !ogrenci.cinsiyet) return 'male';
  const cinsiyet = ogrenci.cinsiyet.toString().toLowerCase().trim();
  return ['kız', 'kadin', 'k', 'kadın', 'f', 'bayan', 'female'].includes(cinsiyet) ? 'female' : 'male';
};

export const isStudentGirl = (ogrenci) => {
  return getStudentGenderColor(ogrenci) === 'female';
};

export const DroppableSeat = memo(({ masa, onStudentMove, children, readOnly = false }) => {
  const theme = useTheme();
  const { setNodeRef, isOver } = useDroppable({
    id: `masa-${masa.id}`,
    disabled: readOnly,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        width: '100%',
        opacity: isOver ? 0.8 : 1,
        backgroundColor: isOver ? alpha(theme.palette.success.main, 0.1) : 'transparent',
        border: isOver ? `2px dashed ${theme.palette.success.main}` : '2px solid transparent',
        borderRadius: 1,
        transition: 'opacity 0.1s ease, background-color 0.1s ease'
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

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `student-${masa.id}`,
    data: {
      masaId: masa.id,
      ogrenci: masa.ogrenci
    },
    disabled: !masa.ogrenci || readOnly,
  });

  const [dragArming, setDragArming] = useState(false);
  const dragDisabled = !dragArming || !masa?.ogrenci || readOnly;

  const dragArmingTimerRef = React.useRef(null);

  const armDrag = useCallback(() => {
    if (!masa?.ogrenci || readOnly) return;
    if (dragArmingTimerRef.current) clearTimeout(dragArmingTimerRef.current);
    setDragArming(false);
    dragArmingTimerRef.current = setTimeout(() => {
      setDragArming(true);
    }, 180);
  }, [masa?.ogrenci, readOnly]);

  const cancelArmDrag = useCallback(() => {
    if (dragArmingTimerRef.current) clearTimeout(dragArmingTimerRef.current);
    dragArmingTimerRef.current = null;
    setDragArming(false);
  }, []);

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

  return (
    <Box
      sx={{
        cursor: masa.ogrenci ? 'default' : 'default',
        width: '100%',
        opacity: isDragging ? 0.5 : 1,
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : 'none',
        transition: 'opacity 0.1s ease, background-color 0.1s ease',
        position: 'relative'
      }}
    >
      <Paper
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        elevation={masa.ogrenci ? (isSecili ? 6 : 3) : 1}
        onMouseEnter={() => masa.ogrenci && onStudentHover(masa.ogrenci)}
        onMouseLeave={onStudentLeave}
        onClick={() => {
          if (readOnly) return;
          if (dndJustEnded) return;
          if (isDragging) return;

          onMasaClick(masa, masa.ogrenci);
        }}
        sx={{
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'geometricPrecision',
          fontFamily: `'Noto Sans', sans-serif !important`,
          '& *': {
            fontFamily: `'Noto Sans', sans-serif !important`,
          },
          p: { xs: 0.5, sm: 1 },
          borderRadius: '6px',
          minHeight: { xs: 60, sm: 80 },
          maxHeight: { xs: 60, sm: 80 },
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: masa.ogrenci
            ? (conflictStyle ? conflictStyle.bgcolor : `${getGenderColor(masa.ogrenci)}.50`)
            : 'grey.100',
          border: masa.ogrenci ? (conflictStyle ? '2px solid' : '2px solid') : '1px solid',
          borderColor: masa.ogrenci
            ? (conflictStyle ? conflictStyle.borderColor : `${getGenderColor(masa.ogrenci)}.main`)
            : 'grey.300',
          position: 'relative',
          cursor: 'pointer',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          transform: isSecili ? 'scale(1.05)' : 'scale(1)',
          boxShadow: isSecili
            ? 6
            : (conflictStyle ? `0 0 8px ${conflictStyle.glowColor}80` : (masa.ogrenci ? 3 : 1)),
          zIndex: isSecili ? 10 : 1,
          ...(conflictStyle && {
            animation: 'pulse-border 2s infinite',
            '@keyframes pulse-border': {
              '0%': { boxShadow: `0 0 0 0 ${conflictStyle.glowColor}40` },
              '70%': { boxShadow: `0 0 0 4px rgba(0,0,0,0)` },
              '100%': { boxShadow: `0 0 0 0 rgba(0,0,0,0)` }
            }
          }),
          '&:hover': {
            transform: isSecili ? 'scale(1.05)' : 'scale(1.02)',
            boxShadow: isSecili ? 8 : (conflictStyle ? `0 0 12px ${conflictStyle.glowColor}` : 4),
            bgcolor: masa.ogrenci
              ? (conflictStyle ? conflictStyle.bgcolor : `${getGenderColor(masa.ogrenci)}.100`)
              : 'grey.200',
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
        {conflict && (conflict.gender || conflict.classSideBySide || conflict.classBackToBack) && getConstraintConflictInfo && plan2D && (() => {
          const info = getConstraintConflictInfo(masa, plan2D);
          if (!info.hasConflict) return null;

          return (
            <Tooltip title={info.message} placement="top" arrow>
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
          );
        })()}

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
          <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
            <ChairIcon sx={{ fontSize: { xs: 12, sm: 16 }, mb: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: { xs: '0.5rem', sm: '0.6rem' } }}>Boş</Typography>
          </Box>
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
