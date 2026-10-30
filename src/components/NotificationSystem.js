import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { toast, Toaster as SonnerToaster } from 'sonner';
import DialogHeader from './common/DialogHeader';
import { useThemeMode } from '../context/ThemeContext';
import { useExamStore } from '../store/useExamStore';

// Notification Context
const NotificationContext = createContext();

// Notification Provider
export const NotificationProvider = ({ children }) => {
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [promptDialog, setPromptDialog] = useState(null);

  // Toast notification (general)
  const showToast = useCallback((message, type = 'info', optionsOrDuration = 4000) => {
    const options = typeof optionsOrDuration === 'number'
      ? { duration: optionsOrDuration }
      : { duration: 4000, ...optionsOrDuration };
    return toast(message, options);
  }, []);

  // Success notification
  const showSuccess = useCallback((message, optionsOrDuration = 4000) => {
    const options = typeof optionsOrDuration === 'number'
      ? { duration: optionsOrDuration }
      : { duration: 4000, ...optionsOrDuration };
    return toast.success(message, options);
  }, []);

  // Error notification
  const showError = useCallback((message, optionsOrDuration = 6000) => {
    const options = typeof optionsOrDuration === 'number'
      ? { duration: optionsOrDuration }
      : { duration: 6000, ...optionsOrDuration };
    return toast.error(message, options);
  }, []);

  // Warning notification
  const showWarning = useCallback((message, optionsOrDuration = 5000) => {
    const options = typeof optionsOrDuration === 'number'
      ? { duration: optionsOrDuration }
      : { duration: 5000, ...optionsOrDuration };
    return toast.warning(message, options);
  }, []);

  // Info notification
  const showInfo = useCallback((message, optionsOrDuration = 4000) => {
    const options = typeof optionsOrDuration === 'number'
      ? { duration: optionsOrDuration }
      : { duration: 4000, ...optionsOrDuration };
    return toast.info(message, options);
  }, []);

  // Confirm dialog
  const showConfirm = useCallback((message, title = 'Onay', confirmText = 'Evet', cancelText = 'İptal') => {
    return new Promise((resolve) => {
      setConfirmDialog({
        open: true,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        }
      });
    });
  }, []);

  // Prompt dialog
  const showPrompt = useCallback((message, title = 'Giriş', placeholder = '', defaultValue = '') => {
    return new Promise((resolve) => {
      setPromptDialog({
        open: true,
        title,
        message,
        placeholder,
        defaultValue,
        onConfirm: (value) => {
          setPromptDialog(null);
          resolve(value);
        },
        onCancel: () => {
          setPromptDialog(null);
          resolve(null);
        }
      });
    });
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    toast.dismiss(id);
  }, []);

  const value = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showPrompt,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}


      {/* Confirm Dialog */}
      {confirmDialog && (
        <Dialog
          open={confirmDialog.open}
          onClose={confirmDialog.onCancel}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle>
            <DialogHeader icon={<WarningIcon />} title={confirmDialog.title} variant="warning" />
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1">{confirmDialog.message}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={confirmDialog.onCancel} variant="outlined">
              {confirmDialog.cancelText}
            </Button>
            <Button onClick={confirmDialog.onConfirm} variant="contained" color="error">
              {confirmDialog.confirmText}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Prompt Dialog */}
      {promptDialog && (
        <PromptDialog
          open={promptDialog.open}
          title={promptDialog.title}
          message={promptDialog.message}
          placeholder={promptDialog.placeholder}
          defaultValue={promptDialog.defaultValue}
          onConfirm={promptDialog.onConfirm}
          onCancel={promptDialog.onCancel}
        />
      )}
    </NotificationContext.Provider>
  );
};

// Prompt Dialog Component
const PromptDialog = ({ open, title, message, placeholder, defaultValue, onConfirm, onCancel }) => {
  const [value, setValue] = useState(defaultValue);

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>
        <DialogHeader icon={<InfoIcon />} title={title} variant="info" />
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>{message}</Typography>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} variant="outlined">
          İptal
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Tamam
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Custom Toaster that respects ThemeContext and Desktop UX
export const AppToaster = () => {
  const { mode } = useThemeMode();

  let hasFloatingDock = false;
  try {
    const yerlestirmeSonucu = useExamStore((s) => s.yerlestirmeSonucu);
    const aktifTab = useExamStore((s) => s.aktifTab);
    hasFloatingDock = Boolean(yerlestirmeSonucu) || aktifTab === 'salon-plani';
  } catch (_) {
    hasFloatingDock = false;
  }

  const offset = hasFloatingDock ? { bottom: 84, right: 28 } : { bottom: 24, right: 28 };
  const mobileOffset = hasFloatingDock ? { bottom: 80, right: 16 } : { bottom: 16, right: 16 };

  return (
    <SonnerToaster 
      position="bottom-right"
      offset={offset}
      mobileOffset={mobileOffset}
      richColors 
      closeButton 
      theme={mode}
      gap={8}
      visibleToasts={4}
      toastOptions={{
        style: {
          background: mode === 'light' ? '#FFFFFF' : '#1E293B',
          border: `1px solid ${mode === 'light' ? 'rgba(226,232,240,0.9)' : 'rgba(51,65,85,0.9)'}`,
          boxShadow: mode === 'light' 
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)' 
            : '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        }
      }}
    />
  );
};

export default NotificationProvider;




