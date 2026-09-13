import React, { memo } from 'react';
import { Box, Button } from '@mui/material';
import { People as PeopleIcon, Upload as UploadIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import PageHeader from '../common/PageHeader';

const OgrenciListesiHeader = memo(({
  readOnly,
  isWriteAllowed,
  ogrencilerCount,
  yerlesimPlaniVarMi,
  handleExcelUpload,
  setManualEklemeAcik,
  handleTumOgrencileriSil,
  setDallarDialogAcik,
  showError
}) => {
  return (
    <PageHeader
      icon={<PeopleIcon sx={{ color: '#4F46E5', fontSize: 24 }} />}
      title="Öğrenci Listesi ve Seçimi"
      actions={
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            component="label"
            size="small"
            disabled={readOnly}
          >
            Excel Yükle
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleExcelUpload}
            />
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            onClick={() => setManualEklemeAcik(true)}
            disabled={readOnly}
          >
            Öğrenci Ekle
          </Button>

          {ogrencilerCount > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={handleTumOgrencileriSil}
              disabled={readOnly}
            >
              Tümünü Sil
            </Button>
          )}

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              if (!isWriteAllowed) return;
              if (yerlesimPlaniVarMi) {
                showError('Mevcut bir yerleştirme planı bulunduğu için dal listesi değiştirilemez.');
                return;
              }
              setDallarDialogAcik(true);
            }}
            disabled={!isWriteAllowed}
          >
            Dalları Düzenle
          </Button>
        </Box>
      }
    />
  );
});

OgrenciListesiHeader.displayName = 'OgrenciListesiHeader';
export default OgrenciListesiHeader;
