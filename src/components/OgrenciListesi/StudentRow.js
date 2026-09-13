import React, { memo } from 'react';
import { TableRow, TableCell, Typography, Chip, FormControl, Select, MenuItem, IconButton } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

const StudentRow = memo(({ ogrenci, index, onSil, onGuncelle, onDuzenle, yerlesimPlaniVarMi, readOnly, dallar }) => {
  const dalOptions = Array.isArray(dallar) && dallar.length > 0 ? dallar : [];

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {index + 1}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {ogrenci.numara}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography
          variant="body2"
          sx={{
            cursor: !yerlesimPlaniVarMi ? 'pointer' : 'default',
            display: 'inline-block',
            padding: '4px 8px',
            borderRadius: 1.5,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: !yerlesimPlaniVarMi ? 'action.hover' : 'transparent',
              color: !yerlesimPlaniVarMi ? 'primary.dark' : 'inherit',
              transform: !yerlesimPlaniVarMi ? 'translateX(4px)' : 'none',
              textDecoration: 'none'
            }
          }}
          onClick={!yerlesimPlaniVarMi ? () => onDuzenle(ogrenci) : undefined}
        >
          {ogrenci.ad} {ogrenci.soyad}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={ogrenci.sinif}
          size="small"
          color="primary"
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <FormControl fullWidth size="small" variant="outlined" sx={{ minWidth: 150 }}>
          <Select
            value={ogrenci.dal || ''}
            onChange={(e) => onGuncelle(ogrenci.id, 'dal', e.target.value)}
            displayEmpty
            disabled={readOnly}
            sx={{
              height: 32,
              fontSize: '0.875rem',
              '& .MuiSelect-select': { py: 0.5 }
            }}
          >
            <MenuItem value="">
              <Typography component="em" sx={{ color: 'text.disabled' }}>Seçiniz</Typography>
            </MenuItem>

            {dalOptions.map((dal) => (
              <MenuItem key={dal} value={dal}>
                {dal}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell>
        <Chip
          label={ogrenci.cinsiyet || 'Belirtilmemiş'}
          size="small"
          color={ogrenci.cinsiyet === 'K' ? 'secondary' : ogrenci.cinsiyet === 'E' ? 'primary' : 'default'}
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      </TableCell>
      <TableCell>
        <IconButton
          size="small"
          color="error"
          onClick={() => onSil(ogrenci.id)}
          title="Öğrenciyi Sil"
          disabled={readOnly}
        >
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.ogrenci === nextProps.ogrenci &&
    prevProps.index === nextProps.index &&
    prevProps.yerlesimPlaniVarMi === nextProps.yerlesimPlaniVarMi &&
    prevProps.readOnly === nextProps.readOnly &&
    prevProps.dallar === nextProps.dallar
  );
});

export default StudentRow;
