import React, { memo } from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import {
  People as PeopleIcon,
  UploadFile as UploadFileIcon,
  PersonAdd as PersonAddIcon,
  DeleteOutline as DeleteOutlineIcon,
  Tune as TuneIcon
} from '@mui/icons-material';
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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip title="Excel tablosundan (.xlsx, .xls) toplu öğrenci aktar" arrow>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<UploadFileIcon sx={{ fontSize: '1.15rem' }} />}
              component="label"
              size="small"
              disabled={readOnly}
              sx={{ height: 36, fontWeight: 600, borderRadius: '10px' }}
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
          </Tooltip>

          <Tooltip title="Manuel olarak tek bir öğrenci ekle" arrow>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAddIcon sx={{ fontSize: '1.15rem' }} />}
              size="small"
              onClick={() => setManualEklemeAcik(true)}
              disabled={readOnly}
              sx={{ height: 36, fontWeight: 700, borderRadius: '10px' }}
            >
              Öğrenci Ekle
            </Button>
          </Tooltip>

          <Tooltip title="Alan ve dal tanımlamalarını düzenle" arrow>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<TuneIcon sx={{ fontSize: '1.1rem' }} />}
              onClick={() => {
                if (!isWriteAllowed) return;
                if (yerlesimPlaniVarMi) {
                  showError('Mevcut bir yerleştirme planı bulunduğu için dal listesi değiştirilemez.');
                  return;
                }
                setDallarDialogAcik(true);
              }}
              disabled={!isWriteAllowed}
              sx={{ height: 36, fontWeight: 600, borderRadius: '10px' }}
            >
              Dalları Düzenle
            </Button>
          </Tooltip>

          {ogrencilerCount > 0 && (
            <Tooltip title="Listedeki tüm öğrencileri sil" arrow>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteOutlineIcon sx={{ fontSize: '1.15rem' }} />}
                onClick={handleTumOgrencileriSil}
                disabled={readOnly}
                sx={{ height: 36, fontWeight: 600, borderRadius: '10px' }}
              >
                Tümünü Sil
              </Button>
            </Tooltip>
          )}
        </Box>
      }
    />
  );
});

OgrenciListesiHeader.displayName = 'OgrenciListesiHeader';
export default OgrenciListesiHeader;
