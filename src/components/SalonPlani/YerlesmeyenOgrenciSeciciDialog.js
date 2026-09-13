import React, { memo, useState, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, ListItem, ListItemText, Typography, Button } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import DialogHeader from '../common/DialogHeader';
import { getStudentGenderColor, isStudentGirl } from './SeatItem';

const YerlesmeyenOgrenciSeciciDialog = memo(({ open, onClose, unplacedStudents, onSelect, masaNo }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return unplacedStudents;
    return unplacedStudents.filter(s =>
      `${s.ad} ${s.soyad}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.numara?.toString().includes(searchTerm) ||
      s.sinif?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unplacedStudents, searchTerm]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <DialogHeader icon={<PersonIcon />} title={`Öğrenci Yerleştir (Masa ${masaNo})`} variant="info" onClose={onClose} />
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="İsim, numara veya sınıf ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {filteredStudents.length > 0 ? (
            filteredStudents.map((ogrenci) => {
              const genderColor = getStudentGenderColor(ogrenci);
              const isGirl = isStudentGirl(ogrenci);

              return (
                <ListItem
                  button
                  key={ogrenci.id}
                  onClick={() => onSelect(ogrenci)}
                  sx={{
                    border: '1px solid',
                    borderColor: `${genderColor}.main`,
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: `${genderColor}.50`,
                    '&:hover': { bgcolor: `${genderColor}.100` }
                  }}
                >
                  <ListItemText
                    primary={`${ogrenci.ad} ${ogrenci.soyad}`}
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {ogrenci.sinif} - No: {ogrenci.numara}
                        <Box component="span" sx={{ color: `${genderColor}.main`, fontWeight: 700, ml: 1 }}>
                          ({isGirl ? 'Kız' : 'Erkek'})
                        </Box>
                      </Typography>
                    }
                  />
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      bgcolor: `${genderColor}.main`,
                      color: 'white',
                      '&:hover': {
                        bgcolor: `${genderColor}.dark`
                      }
                    }}
                  >
                    Seç
                  </Button>
                </ListItem>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary" align="center">
              Öğrenci bulunamadı.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
      </DialogActions>
    </Dialog>
  );
});

export default YerlesmeyenOgrenciSeciciDialog;
