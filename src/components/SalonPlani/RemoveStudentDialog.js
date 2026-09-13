import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import DialogHeader from '../common/DialogHeader';

const RemoveStudentDialog = ({
  open,
  onClose,
  onConfirm,
  student
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        <DialogHeader icon={<WarningIcon />} title="Öğrenciyi Çıkar" variant="warning" onClose={onClose} />
      </DialogTitle>
      <DialogContent>
        <Typography>
          <strong>{student?.ad} {student?.soyad}</strong> isimli öğrenciyi bu salondan çıkarmak istediğinize emin misiniz?
          <br /><br />
          Bu işlem öğrenciyi "Yerleşmeyen Öğrenciler" listesine geri gönderecektir.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          İptal
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
          Çıkar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RemoveStudentDialog;
