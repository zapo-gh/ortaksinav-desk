import React from 'react';
import emailjs from '@emailjs/browser';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import DialogHeader from './common/DialogHeader';

// EmailJS Configuration
// Bu değerleri https://www.emailjs.com/ sitesinden alabilirsiniz
// 1. EmailJS hesabı oluşturun
// 2. Email Service ekleyin (Gmail, Outlook vb.)
// 3. Email Template oluşturun
// 4. Aşağıdaki değerleri güncelleyin:
const EMAILJS_PUBLIC_KEY = 'j7i_9F9gsg31rMisi'; // EmailJS Public Key
const EMAILJS_SERVICE_ID = 'service_woau3w5'; // EmailJS Service ID
const EMAILJS_TEMPLATE_ID = 'template_xfkh3so'; // EmailJS Template ID

const ContactFormDialog = ({ open, onClose }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = React.useState({});
  const [sending, setSending] = React.useState(false);
  const [sendStatus, setSendStatus] = React.useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = React.useState('');


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setSendStatus(null);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Adınız gereklidir';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'E-posta adresi gereklidir';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'Konu gereklidir';
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Mesajınız gereklidir';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSending(true);
    setSendStatus(null);

    try {
      const templateParams = {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        to_email: 'zaferkulte@gmail.com',
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      console.log('EmailJS response:', response);
      setSendStatus('success');
      setErrorMessage('');
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      console.error('Email gönderme hatası:', error);
      setSendStatus('error');
      setErrorMessage(error.text || error.message || 'Bilinmeyen bir hata oluştu');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
    });
    setErrors({});
    setSendStatus(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <DialogHeader icon={<EmailIcon color="primary" />} title="İletişim Formu" onClose={handleClose} />
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2.5 }}>
          {sendStatus === 'success' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Mesajınız başarıyla gönderildi!
            </Alert>
          )}

          {sendStatus === 'error' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Mesaj gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
              {errorMessage && (
                <Box component="span" sx={{ display: 'block', mt: 1, fontSize: '0.85rem' }}>
                  Hata: {errorMessage}
                </Box>
              )}
            </Alert>
          )}

          <TextField
            label="Adınız"
            name="name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            margin="dense"
            error={Boolean(errors.name)}
            helperText={errors.name}
            disabled={sending}
            required
          />

          <TextField
            label="E-posta Adresiniz"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            fullWidth
            margin="dense"
            error={Boolean(errors.email)}
            helperText={errors.email}
            disabled={sending}
            required
          />

          <TextField
            label="Konu"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            fullWidth
            margin="dense"
            error={Boolean(errors.subject)}
            helperText={errors.subject}
            disabled={sending}
            required
          />

          <TextField
            label="Mesajınız"
            name="message"
            value={formData.message}
            onChange={handleChange}
            fullWidth
            margin="dense"
            multiline
            rows={4}
            error={Boolean(errors.message)}
            helperText={errors.message}
            disabled={sending}
            required
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} variant="outlined" disabled={sending}>
            İptal
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={sending}
            startIcon={sending ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {sending ? 'Gönderiliyor...' : 'Gönder'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ContactFormDialog;
