
import SaveIcon from '@mui/icons-material/Save';
import DialogHeader from './common/DialogHeader';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button
} from '@mui/material';
import { useNotifications } from './NotificationSystem';
import planManager from '../utils/planManager';
import logger from '../utils/logger';

// Tamamen izole SaveDialog component - IndexedDB ile
const SaveDialog = memo(({ 
  open, 
  onClose, 
  onSave, 
  yerlestirmeSonucu,
  memoizedPlanData,
  memoizedToplamOgrenci
}) => {
  // TextField state tamamen izole - AnaSayfa hiç etkilenmez
  const [textValue, setTextValue] = useState('');
  const { showSuccess, showError } = useNotifications();
  
  // Dialog açıldığında state'i temizle
  React.useEffect(() => {
    if (open) {
      setTextValue('');
    }
  }, [open]);
  
  // Kaydetme fonksiyonu - IndexedDB ile
  const handleSave = useCallback(async () => {
    logger.debug('🔍 SaveDialog handleSave başlıyor (IndexedDB)...');
    logger.debug('📋 Props kontrolü:', {
      textValue: textValue,
      memoizedPlanData: memoizedPlanData,
      yerlestirmeSonucu: yerlestirmeSonucu,
      memoizedToplamOgrenci: memoizedToplamOgrenci
    });

    if (!textValue.trim()) {
      logger.debug('❌ Text value boş');
      showError('Lütfen plan adı giriniz.');
      return;
    }

    if (!memoizedPlanData) {
      logger.error('❌ memoizedPlanData null:', { 
        memoizedPlanData, 
        yerlestirmeSonucu,
        yerlestirmeSonucuType: typeof yerlestirmeSonucu,
        yerlestirmeSonucuKeys: yerlestirmeSonucu ? Object.keys(yerlestirmeSonucu) : 'null'
      });
      showError('Kaydedilecek plan bulunamadı. Lütfen önce yerleştirme yapın.');
      return;
    }

    try {
      // Yeni plan manager ile kaydet
      const planId = await planManager.savePlan(textValue.trim(), memoizedPlanData);
      logger.info('✅ Plan kaydedildi:', planId);
      
      showSuccess('Plan başarıyla kaydedildi!');
      onClose();
      
      // Custom event dispatch et (plan listesini güncellemek için)
      window.dispatchEvent(new CustomEvent('planSaved', {
        detail: { planId: planId, planName: textValue.trim() }
      }));
      
    } catch (error) {
      logger.error('❌ Plan kaydetme hatası:', error);
      logger.error('❌ Hata detayları:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      showError(`Plan kaydedilirken hata oluştu: ${error.message}`);
    }
  }, [textValue, memoizedPlanData, memoizedToplamOgrenci, yerlestirmeSonucu, onClose, showError, showSuccess]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={false}
      disableBackdropClick={false}
      transitionDuration={0}
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle><DialogHeader icon={<SaveIcon />} title="Planı Kaydet" variant="success" /></DialogTitle>
      <DialogContent sx={{ py: 2 }}>
        <TextField
          autoFocus
          margin="dense"
          label="Plan Adı"
          fullWidth
          variant="outlined"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Örn: 2025-2026 1. Dönem Sınav Planı"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '14px'
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose}
          color="inherit"
        >
          İptal
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!textValue.trim()}
        >
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
});

SaveDialog.displayName = 'SaveDialog';

export default SaveDialog;