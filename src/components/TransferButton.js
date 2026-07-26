import React, { memo } from 'react';
import logger from '../utils/logger';
import {
  IconButton,
  Tooltip
} from '@mui/material';
import {
  SwapHoriz as TransferIcon
} from '@mui/icons-material';

const getGenderColor = (ogrenci) => {
  if (!ogrenci || !ogrenci.cinsiyet) return 'primary';
  const cinsiyet = ogrenci.cinsiyet.toString().toLowerCase().trim();
  return cinsiyet === 'kız' || cinsiyet === 'kadin' || cinsiyet === 'k' ? 'secondary' : 'primary';
};

const TransferButton = ({
  student,
  currentSalon,
  allSalons,
  onTransferClick,
  disabled = false
}) => {
  const genderColor = getGenderColor(student);

  const handleClick = (event) => {
    if (disabled) return;
    logger.debug('TransferButton clicked', student?.id, { currentSalon, disabled });
    event.stopPropagation(); // Event bubbling'i durdur
    // Doğrudan transfer modalını aç
    onTransferClick(student, currentSalon, null);
  };

  return (
    <Tooltip title="Salonlar Arası Transfer">
      <IconButton
        onClick={handleClick}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        disabled={disabled}
        size="small"
        sx={{
          color: `${genderColor}.main`,
          padding: '4px',
          '&:hover': {
            backgroundColor: `${genderColor}.100`,
            transform: 'scale(1.1)',
            boxShadow: 1
          }
        }}
      >
        <TransferIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  );
};

export default memo(TransferButton);
