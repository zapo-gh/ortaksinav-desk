import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination
} from '@mui/material';
import {
  Search as SearchIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import EmptyState from '../common/EmptyState';
import StudentRow from './StudentRow';

const StudentTable = ({
  manualEklemeAcik,
  aramaTerimi,
  setAramaTerimi,
  filtrelenmisOgrenciler,
  ogrenciler,
  page,
  rowsPerPage,
  handleChangePage,
  handleChangeRowsPerPage,
  handleOgrenciSil,
  handleOgrenciGuncelle,
  handleOgrenciDuzenle,
  yerlesimPlaniVarMi,
  readOnly,
  dallarEffective
}) => {
  return (
    <>
      {/* Öğrenci Tablosu - Dialog açıkken render etme (performans optimizasyonu) */}
      {!manualEklemeAcik && (
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead sx={{ '& th': { bgcolor: '#F8FAFC', zIndex: 3, borderBottom: '2px solid', borderColor: 'grey.200' } }}>
              <TableRow>
                <TableCell>Sıra</TableCell>
                <TableCell>Öğrenci No</TableCell>
                <TableCell>Ad Soyad</TableCell>
                <TableCell>Sınıf</TableCell>
                <TableCell>Dal</TableCell>
                <TableCell>Cinsiyet</TableCell>
                <TableCell>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrelenmisOgrenciler
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((ogrenci, index) => (
                  <StudentRow
                    key={ogrenci.id}
                    ogrenci={ogrenci}
                    index={page * rowsPerPage + index}
                    onSil={handleOgrenciSil}
                    onGuncelle={handleOgrenciGuncelle}
                    onDuzenle={handleOgrenciDuzenle}
                    yerlesimPlaniVarMi={yerlesimPlaniVarMi}
                    readOnly={readOnly}
                    dallar={dallarEffective}
                  />
                ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100, 500]}
            component="div"
            count={filtrelenmisOgrenciler.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Sayfa başına satır:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          />
        </TableContainer>
      )}

      {/* Arama sonucu bulunamadığında */}
      {!manualEklemeAcik && aramaTerimi && filtrelenmisOgrenciler.length === 0 && ogrenciler.length > 0 && (
        <EmptyState
          icon={SearchIcon}
          title="Arama sonucu bulunamadı"
          description={`"${aramaTerimi}" için hiçbir öğrenci bulunamadı.`}
          actionLabel={!readOnly ? "Aramayı Temizle" : undefined}
          onAction={!readOnly ? () => setAramaTerimi('') : undefined}
        />
      )}

      {/* Hiç öğrenci yoksa */}
      {ogrenciler.length === 0 && (
        <EmptyState
          icon={PeopleIcon}
          title="Henüz öğrenci bulunmuyor"
          description="CSV veya Excel dosyası yükleyerek veya manuel olarak öğrenci listesini içe aktarın."
        />
      )}
    </>
  );
};

export default StudentTable;
