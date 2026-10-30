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
  dallarEffective,
  onManuelEkle
}) => {
  return (
    <>
      {/* Öğrenci Tablosu - Öğrenciler varsa ve Dialog açık değilken göster */}
      {!manualEklemeAcik && ogrenciler.length > 0 && (
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead sx={{ '& th': { bgcolor: (theme) => theme.palette.mode === 'light' ? '#F8FAFC' : '#1e293b', zIndex: 3, borderBottom: '2px solid', borderColor: 'divider' } }}>
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
          description="Yukarıdaki 'Excel Yükle' butonuyla e-Okul listesini aktarabilir veya manuel öğrenci ekleyebilirsiniz."
          actionLabel={!readOnly ? "Manuel Öğrenci Ekle" : undefined}
          onAction={!readOnly ? onManuelEkle : undefined}
        />
      )}
    </>
  );
};

export default StudentTable;
