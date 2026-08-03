import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Button,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, CircularProgress, Alert, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment,
  Tabs, Tab, Accordion, AccordionSummary, AccordionDetails, Divider, Grid
} from '@mui/material';
import {
  Delete as DeleteIcon, CloudDownload as CloudDownloadIcon,
  History as HistoryIcon, Edit as EditIcon,
  Archive as ArchiveIcon, Unarchive as UnarchiveIcon,
  ExpandMore as ExpandMoreIcon, BackupTable as BackupTableIcon,
  Warning as WarningIcon, Backup as BackupIcon, Upload as UploadIcon,
  Search as SearchIcon, People as PeopleIcon,
  MeetingRoom as MeetingRoomIcon, CalendarToday as CalendarTodayIcon,
  FilterList as FilterListIcon,
  Timeline as TimelineIcon, HistoryToggleOff as HistoryToggleOffIcon,
  School as SchoolIcon, EventNote as EventNoteIcon,
  ExpandLess as ExpandLessIcon, UnfoldMore as UnfoldMoreIcon, UnfoldLess as UnfoldLessIcon
} from '@mui/icons-material';
import ArchiveDialog from './ArchiveDialog';
import PageHeader from './common/PageHeader';
import DialogHeader from './common/DialogHeader';
import EmptyState from './common/EmptyState';
import planManager from '../utils/planManager';
import { useNotifications } from './NotificationSystem';
import logger from '../utils/logger';
import { subscribeToAuthChanges, getUserRole } from '../auth/authState';
import { useExam } from '../context/ExamContext';

const KayitliPlanlar = ({ onPlanYukle }) => {
  const { ayarlar } = useExam();
  const [kayitliPlanlar, setKayitliPlanlar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [planToRename, setPlanToRename] = useState(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [planToArchive, setPlanToArchive] = useState(null);
  const { showSuccess, showError } = useNotifications();
  const [dbBackupLoading, setDbBackupLoading] = useState(false);
  const [dbImportLoading, setDbImportLoading] = useState(false);
  const [dbImportDialogOpen, setDbImportDialogOpen] = useState(false);
  const [selectedDbFileName, setSelectedDbFileName] = useState(null);
  const [selectedDbBytes, setSelectedDbBytes] = useState(null);

  // Arşiv Ölçeklendirme State'leri (Akıllı Zaman Tüneli - Konsept 2.1)
  const [archiveSearchText, setArchiveSearchText] = useState('');
  const [selectedArchiveYear, setSelectedArchiveYear] = useState('ALL');
  const [selectedArchiveTerm, setSelectedArchiveTerm] = useState('ALL');
  const [collapsedYears, setCollapsedYears] = useState({}); // Yıl -> boolean (true: kapalı, false/undefined: açık)
  const [termPageLimits, setTermPageLimits] = useState({}); // `${yil}-${donem}` -> gösterilecek sınav sayısı

  const toggleYearCollapse = (yil) => {
    setCollapsedYears(prev => ({
      ...prev,
      [yil]: prev[yil] !== undefined ? !prev[yil] : false // Varsayılan kapalı (true) olduğundan ilk tıklamada açar (false)
    }));
  };

  const handleShowMorePlans = (key, totalLength) => {
    setTermPageLimits(prev => {
      const current = prev[key] || 4;
      return { ...prev, [key]: Math.min(current + 6, totalLength) };
    });
  };

  const handleShowLessPlans = (key) => {
    setTermPageLimits(prev => ({ ...prev, [key]: 4 }));
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      if (user) {
        try {
          const role = await getUserRole();
          setIsAdmin(role === 'admin');
        } catch (err) {
          console.error('Role check error:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const allPlans = await planManager.getAllPlans();
      const filteredPlans = allPlans.filter(plan => {
        if (plan.id === null || plan.id === undefined || plan.id === '') return false;
        const planId = String(plan.id);
        const planName = String(plan.name || '');
        return !planName.includes('Geçici Plan') && !planId.startsWith('temp_');
      });

      const sortedPlans = filteredPlans.sort((a, b) => {
        const hasDateA = a.sinavTarihi && a.sinavTarihi !== '';
        const hasDateB = b.sinavTarihi && b.sinavTarihi !== '';
        if (hasDateA && hasDateB) {
          const dateA = new Date(a.sinavTarihi);
          const dateB = new Date(b.sinavTarihi);
          if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
          return (a.sinavSaati || '00:00').localeCompare(b.sinavSaati || '00:00');
        }
        if (hasDateA) return -1;
        if (hasDateB) return 1;
        return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
      });

      setKayitliPlanlar(sortedPlans);
    } catch (error) {
      logger.error('❌ Planlar yüklenirken hata:', error);
      showError('Planlar yüklenirken hata oluştu!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const handlePlanYukle = async (plan) => {
    try {
      setIsLoading(true);
      if (!plan || typeof plan !== 'object') throw new Error('Plan objesi geçersiz');
      const planId = plan.id ?? null;
      if (planId === null || planId === undefined || planId === '') {
        throw new Error(`Plan ID geçersiz: ${planId} (Plan: ${plan.name || 'İsimsiz'})`);
      }
      if (plan.data) {
        onPlanYukle({
          id: planId,
          name: plan.name || 'İsimsiz Plan',
          date: plan.date || null,
          data: plan.data || plan
        });
        return;
      }
      const loadedPlan = await planManager.loadPlan(planId);
      if (loadedPlan && loadedPlan.data) onPlanYukle(loadedPlan);
      else throw new Error('Plan yüklendi ama veri bulunamadı');
    } catch (error) {
      logger.error('❌ Plan yükleme hatası:', error);
      showError(`Plan yüklenirken hata oluştu: ${error.message || 'Hata!'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSil = async (planId, onCloseCallback) => {
    setDeleteDialogOpen(false);
    setPlanToDelete(null);
    if (onCloseCallback) onCloseCallback();
    try {
      setIsLoading(true);
      if (planId === null || planId === undefined || planId === '') throw new Error('Plan ID geçersiz');
      await planManager.deletePlan(planId);
      showSuccess('Plan başarıyla silindi!');
      await loadPlans();
    } catch (error) {
      logger.error('❌ Plan silme hatası:', error);
      showError(`Plan silinirken hata oluştu: ${error.message || 'Hata!'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (planId) => {
    setPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const handleRenameClick = (plan) => {
    setPlanToRename(plan);
    setNewPlanName(plan.name || '');
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = async () => {
    if (!planToRename || !newPlanName.trim()) {
      showError('Plan adı boş olamaz!');
      return;
    }
    setIsRenaming(true);
    try {
      const planData = await planManager.loadPlan(planToRename.id);
      if (!planData || !planData.data) throw new Error('Plan verisi yüklenemedi');
      await planManager.updatePlan(planToRename.id, newPlanName.trim(), planData.data);
      showSuccess(`"${planToRename.name}" → "${newPlanName.trim()}" olarak güncellendi!`);
      setRenameDialogOpen(false);
      setPlanToRename(null);
      setNewPlanName('');
      await loadPlans();
    } catch (error) {
      logger.error('❌ Plan adı güncelleme hatası:', error);
      showError(`Plan adı güncellenirken hata: ${error.message}`);
    } finally {
      setIsRenaming(false);
    }
  };

  const downloadBlob = (bytes, filename) => {
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    showSuccess(`DB yedeği indirildi: ${filename}`);
    document.body.appendChild(a);
    setTimeout(() => {
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    }, 0);
  };

  const handleDbImportPick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        if (!bytes || bytes.length < 10) {
          showError('Seçilen dosya geçersiz veya çok küçük.');
          return;
        }
        setSelectedDbFileName(file.name);
        setSelectedDbBytes(bytes);
        setDbImportDialogOpen(true);
        } catch (e) {
          showError(`Dosya okunamadı: ${e.message}`);
        }
    };
    input.click();
  };

  const handleDbImportConfirm = async () => {
    if (!selectedDbFileName || !selectedDbBytes) {
      showError('Lütfen bir .db dosyası seçin.');
      return;
    }
    try {
      setDbImportLoading(true);
      try {
        const db = await import('../database/tauriDb');
        await db.default?.closeDbConnection?.();
      } catch (_) {
        // Bağlantı zaten kapalı olabilir veya henüz başlatılmamış olabilir, sessizce geç
      }
      await new Promise(r => setTimeout(r, 500));
      const bytes = selectedDbBytes;
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('import_db_backup', { bytes });
      try {
        const db = await import('../database/tauriDb');
        db.default?.resetDbConnection?.();
      } catch (e) {
        logger.warn('⚠️ SQLite reset edilemedi:', e);
      }
      await new Promise(r => setTimeout(r, 400));
      try {
        const db = await import('../database/tauriDb');
        const students = await db.default.getAllStudents();
        const { useExamStore } = await import('../store/useExamStore');
        useExamStore.getState().setOgrenciler(students);
      } catch (e) {
        logger.warn('⚠️ Öğrenciler güncellenemedi:', e);
      }
      showSuccess(`DB yedeği yüklendi: ${selectedDbFileName}`);
      await loadPlans();
    } catch (error) {
      logger.error('❌ DB yedeği yüklenemedi:', error);
      showError(`DB yedeği yüklenemedi: ${error?.message || error}`);
    } finally {
      setDbImportLoading(false);
      setDbImportDialogOpen(false);
      setSelectedDbFileName(null);
      setSelectedDbBytes(null);
    }
  };

  const handleDbBackup = async () => {
    try {
      setDbBackupLoading(true);
      // Önce WAL'ı DB'ye flush et (tutarlı yedek için)
      try {
        const db = await import('../database/tauriDb');
        await db.default.execute("PRAGMA wal_checkpoint(TRUNCATE)");
      } catch (_) { /* checkpoint hatası kritik değil */ }
      const { invoke } = await import('@tauri-apps/api/core');
      const bytes = await invoke('export_db_backup');
      if (!bytes) throw new Error('export_db_backup boş döndü');
      let normalized;
      if (bytes instanceof Uint8Array) normalized = bytes;
      else if (bytes instanceof ArrayBuffer) normalized = new Uint8Array(bytes);
      else normalized = new Uint8Array(bytes);
      if (!normalized || normalized.length < 10) throw new Error(`Dosya boyutu çok küçük: ${normalized?.length ?? 0}`);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      downloadBlob(normalized, `ortak-sinav-yedek-${ts}.db`);
    } catch (error) {
      logger.error('❌ DB yedeği alınamadı:', error);
      showError(`DB yedeği alınamadı: ${error?.message || error}`);
    } finally {
      setDbBackupLoading(false);
    }
  };

  const handleArchiveClick = (plan) => {
    setPlanToArchive(plan);
    setArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = async (metadata) => {
    if (!planToArchive) return;
    try {
      logger.debug('ğŸ“¦ handleArchiveConfirm - başladı', {
        planId: planToArchive.id,
        planIdType: typeof planToArchive.id,
        metadata,
        metadataType: metadata && typeof metadata
      });
      setIsLoading(true);

      await planManager.archivePlan(planToArchive.id, metadata);

      logger.debug('ğŸ“¦ handleArchiveConfirm - archivePlan success', {
        planId: planToArchive.id
      });

      showSuccess('Plan başarıyla arşivlendi.');
      await loadPlans();

      logger.debug('ğŸ“¦ handleArchiveConfirm - loadPlans success', {
        planId: planToArchive.id
      });
    } catch (error) {
      logger.error('âŒ handleArchiveConfirm - archivePlan hata:', error);
      showError(`Plan arşivlenirken hata oluştu: ${error?.message || 'unknown'}`);
    } finally {
      setIsLoading(false);
      setPlanToArchive(null);
    }
  };

  const handleRestorePlan = async (planId) => {
    try {
      logger.debug('ğŸ” Arşivden çıkarma tetiklendi. planId:', planId, 'type:', typeof planId);
      setIsLoading(true);
      await planManager.restorePlan(planId);
      logger.debug('âœ… restorePlan tamamlandı. planId:', planId, 'type:', typeof planId);
      showSuccess('Plan arşivden çıkarıldı.');
      await loadPlans();
      logger.debug('ğŸ“‹ loadPlans tamamlandı sonrası refresh. planId:', planId);
    } catch (error) {
      logger.error('âŒ restorePlan hata:', error);
      showError(`Plan geri yüklenirken hata oluştu: ${error?.message || 'unknown'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const groupArchivedPlans = (plans) => {
    const grouped = {};
    plans.forEach(plan => {
      const meta = plan.archiveMetadata || { yil: 'Bilinmeyen Yıl', donem: 'Bilinmeyen Dönem', sinavNo: 'Bilinmeyen Sınav' };
      const { yil, donem, sinavNo } = meta;
      if (!grouped[yil]) grouped[yil] = {};
      if (!grouped[yil][donem]) grouped[yil][donem] = {};
      if (!grouped[yil][donem][sinavNo]) grouped[yil][donem][sinavNo] = [];
      grouped[yil][donem][sinavNo].push(plan);
    });
    return grouped;
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateString || 'Tarih bilgisi yok';
    }
  };

  const archivedPlansList = React.useMemo(() => {
    return kayitliPlanlar.filter(p => p.isArchived);
  }, [kayitliPlanlar]);

  const uniqueArchiveYears = React.useMemo(() => {
    const years = new Set();
    archivedPlansList.forEach(plan => {
      const yil = plan.archiveMetadata?.yil || 'Bilinmeyen Yıl';
      years.add(yil);
    });
    return Array.from(years).sort().reverse();
  }, [archivedPlansList]);

  const uniqueArchiveTerms = React.useMemo(() => {
    const terms = new Set();
    archivedPlansList.forEach(plan => {
      const donem = plan.archiveMetadata?.donem || 'Bilinmeyen Dönem';
      terms.add(donem);
    });
    return Array.from(terms).sort();
  }, [archivedPlansList]);

  // Konsept 2.1: Arşiv Zaman Tüneli (Timeline) için Planları Filtrele, Yıl ve Döneme Göre Grupla ve Sırala
  const timelineGroupedPlans = React.useMemo(() => {
    // 1. Yıl, Dönem ve Arama filtrelerini uygula
    const filtered = archivedPlansList.filter(plan => {
      const meta = plan.archiveMetadata || { yil: 'Bilinmeyen Yıl', donem: 'Genel Dönem', sinavNo: '' };
      const yilMatch = selectedArchiveYear === 'ALL' || meta.yil === selectedArchiveYear;
      const termMatch = selectedArchiveTerm === 'ALL' || meta.donem === selectedArchiveTerm;
      const searchMatch = !archiveSearchText.trim() ||
        (plan.name && plan.name.toLowerCase().includes(archiveSearchText.toLowerCase())) ||
        (meta.yil && meta.yil.toLowerCase().includes(archiveSearchText.toLowerCase())) ||
        (meta.donem && meta.donem.toLowerCase().includes(archiveSearchText.toLowerCase())) ||
        (meta.sinavNo && meta.sinavNo.toLowerCase().includes(archiveSearchText.toLowerCase()));
      return yilMatch && termMatch && searchMatch;
    });

    // 2. Yıl -> Dönem -> Plan listesi
    const grouped = {};
    filtered.forEach(plan => {
      const meta = plan.archiveMetadata || { yil: 'Bilinmeyen Yıl', donem: 'Genel Dönem', sinavNo: '' };
      const yil = meta.yil || 'Bilinmeyen Yıl';
      const donem = meta.donem || 'Genel Dönem';
      if (!grouped[yil]) grouped[yil] = {};
      if (!grouped[yil][donem]) grouped[yil][donem] = [];
      grouped[yil][donem].push(plan);
    });

    // Her dönemin planlarını tarihe göre yeniden eskiye sırala
    Object.keys(grouped).forEach(yil => {
      Object.keys(grouped[yil]).forEach(donem => {
        grouped[yil][donem].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      });
    });

    // Yılları azalan sırada (en yeni yıl en üstte) döndür
    const sortedYears = Object.keys(grouped).sort().reverse();
    return sortedYears.map(yil => {
      const donemlerObj = grouped[yil];
      const sortedTerms = Object.keys(donemlerObj).sort();
      return {
        yil,
        donemler: sortedTerms.map(donem => ({
          donem,
          plans: donemlerObj[donem]
        }))
      };
    });
  }, [archivedPlansList, selectedArchiveYear, selectedArchiveTerm, archiveSearchText]);

  return (
    <Box sx={{ width: '100%', mt: 0, mb: 4 }}>
      <PageHeader
        icon={<HistoryIcon sx={{ color: '#4F46E5', fontSize: 24 }} />}
        title="Kayıtlı Planlar"
            actions={
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-end', sm: 'flex-start' } }}>
                <Button
                  variant="contained" color="primary" size="small"
                  onClick={handleDbBackup}
                  startIcon={<BackupIcon />}
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}
                  disabled={isLoading || dbBackupLoading || dbImportLoading}
                >
                  {dbBackupLoading ? 'DB Yedek Alınıyor...' : 'DB Yedeği Al'}
                </Button>
                <Button
                  variant="outlined" color="warning" size="small"
                  onClick={handleDbImportPick}
                  startIcon={<UploadIcon />}
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}
                  disabled={isLoading || dbBackupLoading || dbImportLoading}
                >
                  {dbImportLoading ? 'DB Yükleniyor...' : 'DB Yedeğini Yükle'}
                </Button>
              </Box>
        }
      />
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', mb: 4 }}>
        <CardContent>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} aria-label="plan tabs">
              <Tab label={`AKTİF KAYITLI PLANLAR (${kayitliPlanlar.filter(p => !p.isArchived).length})`} />
              <Tab label={`ARŞİV (${kayitliPlanlar.filter(p => p.isArchived).length})`} />
            </Tabs>
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : isRenaming ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
              <CircularProgress size={40} />
              <Typography variant="body1" color="text.secondary">
                Plan adı güncelleniyor...
              </Typography>
            </Box>
          ) : activeTab === 0 ? (
            kayitliPlanlar.filter(p => !p.isArchived).length === 0 ? (
              <Box sx={{ width: '100%', py: 4 }}>
                <EmptyState 
                  icon={EventNoteIcon} 
                  title="Henüz kayıtlı aktif plan yok" 
                  description="Ortak sınav yerleştirme planı oluşturduğunuzda burada listelenecektir." 
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {kayitliPlanlar.filter(p => !p.isArchived).map((plan) => {
                  const planId = plan.id;
                  const planName = plan.name || 'İsimsiz Plan';
                  if (!planId) return null;
                  return (
                    <Card
                      key={planId}
                      elevation={0}
                      sx={{
                        py: 1.25,
                        px: 2,
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        borderLeft: '4px solid #10b981', // Aktif Plan yeşili accent
                        bgcolor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#cbd5e1',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                          bgcolor: '#f8fafc'
                        }
                      }}
                    >
                      {/* Sol Taraf: Rozet, Başlık ve Tek Satır Kompakt Metrikler */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Chip
                          label="Aktif Plan"
                          size="small"
                          sx={{
                            bgcolor: '#ecfdf5',
                            color: '#047857',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            height: 22,
                            borderRadius: '6px'
                          }}
                        />

                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', mr: 0.5 }}>
                          {planName}
                        </Typography>

                        {/* Tek Satır Kompakt Metrikler */}
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <PeopleIcon sx={{ fontSize: 15, color: '#64748b' }} />
                            <span>{plan.totalStudents || 0} Öğr.</span>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <MeetingRoomIcon sx={{ fontSize: 15, color: '#64748b' }} />
                            <span>{plan.salonCount || 0} Salon</span>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <HistoryIcon sx={{ fontSize: 15, color: '#64748b' }} />
                            <span>Kayıt: {formatDate(plan.date || plan.createdAt)}</span>
                          </Box>
                          {plan.sinavTarihi && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: '#059669' }}>
                              <span>🎯 Uygulama: {new Date(plan.sinavTarihi).toLocaleDateString('tr-TR')} {plan.sinavSaati || ''}</span>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {/* Sağ Taraf: Kart Aksiyon Butonları */}
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<CloudDownloadIcon sx={{ fontSize: 16 }} />}
                          onClick={() => handlePlanYukle({ ...plan, id: planId })}
                          sx={{ height: 32, fontWeight: 700, borderRadius: '8px', textTransform: 'none', px: 1.5, fontSize: '0.78rem' }}
                        >
                          Planı Yükle
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="outlined"
                              color="info"
                              size="small"
                              startIcon={<ArchiveIcon sx={{ fontSize: 16 }} />}
                              onClick={() => handleArchiveClick(plan)}
                              sx={{ height: 32, fontWeight: 700, borderRadius: '8px', textTransform: 'none', px: 1.5, fontSize: '0.78rem' }}
                            >
                              Arşivle
                            </Button>
                            <IconButton
                              color="secondary"
                              size="small"
                              title="Plan Adını Değiştir"
                              onClick={() => handleRenameClick(plan)}
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                '&:hover': { bgcolor: 'secondary.main', color: 'white' }
                              }}
                            >
                              <EditIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                            <IconButton
                              color="error"
                              size="small"
                              title="Planı Sil"
                              onClick={() => handleDeleteClick(planId)}
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                border: '1px solid #fee2e2',
                                '&:hover': { bgcolor: 'error.main', color: 'white' }
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Card>
                  );
                })}
              </Box>
            )
          ) : (
            archivedPlansList.length === 0 ? (
              <Box sx={{ width: '100%', py: 4 }}>
                <EmptyState 
                  icon={ArchiveIcon} 
                  title="Henüz arşivlenmiş plan bulunmuyor" 
                  description="Aktif planlarınızın yanındaki arşiv ikonuna tıklayarak planlarınızı buraya taşıyabilirsiniz." 
                />
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                {/* Konsept 2.1: Üst Bar - Zaman Tüneli Başlığı, Arama Çubuğu ve Hızlı Yıl/Dönem Çipleri */}
                <Box sx={{ mb: 3, p: { xs: 1.5, sm: 2 }, borderRadius: '12px', bgcolor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                  {/* Arşiv Başlık Satırı */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TimelineIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                        Arşivlenmiş Sınavlar
                      </Typography>
                      <Chip size="small" label={`${archivedPlansList.length} plan`} color="primary" variant="outlined" sx={{ fontWeight: 700, ml: 0.5 }} />
                    </Box>

                    {/* Arama Çubuğu */}
                    <TextField
                      size="small"
                      placeholder="Plan veya dönem ara..."
                      value={archiveSearchText}
                      onChange={(e) => setArchiveSearchText(e.target.value)}
                      sx={{ minWidth: { xs: '100%', sm: 240 }, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>

                  {/* Filtre Çipleri */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mr: 0.25 }}>Yıl:</Typography>
                      <Chip
                        label={`Tümü`}
                        size="small"
                        onClick={() => setSelectedArchiveYear('ALL')}
                        color={selectedArchiveYear === 'ALL' ? 'primary' : 'default'}
                        variant={selectedArchiveYear === 'ALL' ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600 }}
                      />
                      {uniqueArchiveYears.map(year => (
                        <Chip
                          key={year}
                          label={year}
                          size="small"
                          onClick={() => setSelectedArchiveYear(year)}
                          color={selectedArchiveYear === year ? 'primary' : 'default'}
                          variant={selectedArchiveYear === year ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 600 }}
                        />
                      ))}
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', ml: 1, mr: 0.25 }}>Dönem:</Typography>
                      <Chip
                        label="Tümü"
                        size="small"
                        onClick={() => setSelectedArchiveTerm('ALL')}
                        color={selectedArchiveTerm === 'ALL' ? 'primary' : 'default'}
                        variant={selectedArchiveTerm === 'ALL' ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600 }}
                      />
                      {uniqueArchiveTerms.map(term => (
                        <Chip
                          key={term}
                          label={term}
                          size="small"
                          onClick={() => setSelectedArchiveTerm(term)}
                          color={selectedArchiveTerm === term ? 'primary' : 'default'}
                          variant={selectedArchiveTerm === term ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 600 }}
                        />
                      ))}
                    </Box>

                    <Chip
                      icon={uniqueArchiveYears.some(y => (collapsedYears[y] !== undefined ? collapsedYears[y] : true)) ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
                      label={uniqueArchiveYears.some(y => (collapsedYears[y] !== undefined ? collapsedYears[y] : true)) ? "Tümünü Genişlet" : "Tümünü Daralt"}
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const isAnyYearCollapsed = uniqueArchiveYears.some(y => (collapsedYears[y] !== undefined ? collapsedYears[y] : true));
                        const newObj = {};
                        uniqueArchiveYears.forEach(y => { newObj[y] = !isAnyYearCollapsed; });
                        setCollapsedYears(newObj);
                      }}
                      sx={{ fontWeight: 600, cursor: 'pointer' }}
                    />
                  </Box>
                </Box>

                {/* Zaman Tüneli (Timeline) Akış Listesi */}
                {timelineGroupedPlans.length === 0 ? (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Arama veya filtre kriterlerinize uyan arşivlenmiş plan bulunamadı. Lütfen aramanızı temizleyin.
                  </Alert>
                ) : (
                  <Box sx={{ position: 'relative', pl: { xs: 1, sm: 2 } }}>
                    {timelineGroupedPlans.map(({ yil, donemler }, yearIndex) => {
                      // Arama varsa veya spesifik yıl seçildiyse yıl otomatik geniş açık olur
                      const forceExpand = archiveSearchText.trim() !== '' || selectedArchiveYear !== 'ALL';
                      // Varsayılan olarak tüm yıllar kapalıdır; kullanıcı tıkladıysa state geçerlidir
                      const isYearCollapsed = forceExpand ? false : (collapsedYears[yil] !== undefined ? collapsedYears[yil] : true);
                      const totalExamsInYear = donemler.reduce((acc, d) => acc + d.plans.length, 0);

                      return (
                        <Box key={yil} sx={{ mb: 4 }}>
                          {/* Yıl Kilometre Taşı (Year Milestone Banner - Tıklanabilir Akıllı Başlık) */}
                          <Box
                            onClick={() => toggleYearCollapse(yil)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1.5,
                              mb: isYearCollapsed ? 1.5 : 2,
                              cursor: 'pointer',
                              py: 1,
                              px: 0,
                              borderBottom: '1.5px solid',
                              borderColor: 'divider',
                              transition: 'all 0.15s ease',
                              '&:hover': { borderColor: 'primary.main' }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SchoolIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.95rem' }}>
                                {yil}
                              </Typography>
                              <Chip
                                size="small"
                                label={`${totalExamsInYear} sınav`}
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                              <Typography variant="caption" sx={{ fontWeight: 500, display: { xs: 'none', sm: 'inline' } }}>
                                {isYearCollapsed ? 'Genişlet' : 'Daralt'}
                              </Typography>
                              {isYearCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
                            </Box>
                          </Box>

                          {/* Dönemler ve Sınav Planları Akışı (Yıl Daraltılmadıysa Gösterilir) */}
                          {!isYearCollapsed && (
                            <Box sx={{
                              position: 'relative',
                              ml: 2,
                              pl: { xs: 3, sm: 4 },
                              borderLeft: '2px dashed #93c5fd',
                              pb: 1
                            }}>
                              {donemler.map(({ donem, plans }) => {
                                const termKey = `${yil}-${donem}`;
                                const limit = termPageLimits[termKey] || 4;
                                const visiblePlans = plans.slice(0, limit);
                                const hasMore = plans.length > limit;

                                return (
                                  <Box key={donem} sx={{ mb: 4 }}>
                                    {/* Dönem Alt Başlığı */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, ml: -0.5 }}>
                                      <EventNoteIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>
                                        {donem} ({plans.length} Sınav)
                                      </Typography>
                                    </Box>

                                    {/* O Dönemin Plan Kartları (Akıllı Sayfalama ile Gösterilenler) */}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                      {visiblePlans.map(plan => {
                                        const meta = plan.archiveMetadata || { sinavNo: '' };
                                        return (
                                          <Box key={plan.id} sx={{ position: 'relative' }}>
                                            {/* Zaman Tüneli Noktası (Timeline Node Dot) */}
                                            <Box sx={{
                                              position: 'absolute',
                                              left: { xs: -31, sm: -39 },
                                              top: 20,
                                              width: 14,
                                              height: 14,
                                              borderRadius: '50%',
                                              bgcolor: '#ffffff',
                                              border: '3px solid #2563eb',
                                              boxShadow: '0 0 0 3px rgba(37,99,235,0.15)',
                                              zIndex: 2
                                            }} />

                                            {/* Sınav Plan Kartı */}
                                            <Card
                                              elevation={0}
                                              sx={{
                                                py: 1.25,
                                                px: 2,
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                borderLeft: '4px solid #2563eb',
                                                bgcolor: '#ffffff',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                  borderColor: '#cbd5e1',
                                                  bgcolor: '#f8fafc',
                                                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                                                }
                                              }}
                                            >
                                              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5 }}>
                                                {/* Sol Başlık & Kısa İnce Metrikler */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                                  {meta.sinavNo && (
                                                    <Chip
                                                      size="small"
                                                      label={meta.sinavNo}
                                                      sx={{ height: 22, bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 800, borderRadius: '6px', fontSize: '0.72rem' }}
                                                    />
                                                  )}
                                                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', mr: 0.5 }}>
                                                    {plan.name || 'İsimsiz Plan'}
                                                  </Typography>

                                                  {/* Tek Satır Kompakt Metrikler */}
                                                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                                      <PeopleIcon sx={{ fontSize: 15, color: '#64748b' }} />
                                                      <span>{plan.totalStudents || 0} Öğr.</span>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                                      <MeetingRoomIcon sx={{ fontSize: 15, color: '#64748b' }} />
                                                      <span>{plan.salonCount || 0} Salon</span>
                                                    </Box>
                                                    {plan.sinavTarihi && (
                                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: '#2563eb' }}>
                                                        <span>🎯 Uygulama: {new Date(plan.sinavTarihi).toLocaleDateString('tr-TR')} {plan.sinavSaati || ''}</span>
                                                      </Box>
                                                    )}
                                                  </Box>
                                                </Box>

                                                {/* Kart Aksiyon Butonları (Kompakt ve Sağda) */}
                                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                                                  <Button
                                                    variant="contained"
                                                    color="primary"
                                                    size="small"
                                                    startIcon={<CloudDownloadIcon sx={{ fontSize: 16 }} />}
                                                    onClick={() => handlePlanYukle(plan)}
                                                    sx={{ height: 32, fontWeight: 700, borderRadius: '8px', textTransform: 'none', px: 1.5, fontSize: '0.78rem' }}
                                                  >
                                                    İncele / Yükle
                                                  </Button>
                                                  {isAdmin && (
                                                    <>
                                                      <Button
                                                        variant="outlined"
                                                        color="warning"
                                                        size="small"
                                                        startIcon={<UnarchiveIcon sx={{ fontSize: 16 }} />}
                                                        onClick={() => handleRestorePlan(plan.id)}
                                                        sx={{ height: 32, fontWeight: 700, borderRadius: '8px', textTransform: 'none', fontSize: '0.78rem' }}
                                                      >
                                                        Arşivden Çıkar
                                                      </Button>
                                                      <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteClick(plan.id)}
                                                        title="Planı Sil"
                                                        sx={{ p: 0.75, borderRadius: '8px', '&:hover': { bgcolor: 'error.main', color: '#ffffff' } }}
                                                      >
                                                        <DeleteIcon sx={{ fontSize: 16 }} />
                                                      </IconButton>
                                                    </>
                                                  )}
                                                </Box>
                                              </Box>
                                            </Card>
                                          </Box>
                                        );
                                      })}
                                    </Box>

                                    {/* Dönem İçi "Daha Fazla Göster" / "Daralt" Butonları (Ölçeklendirme Sayfalaması) */}
                                    {(hasMore || limit > 4) && (
                                      <Box sx={{ pt: 2, pl: 1, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                        {hasMore && (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleShowMorePlans(termKey, plans.length)}
                                            sx={{
                                              borderRadius: '10px',
                                              textTransform: 'none',
                                              fontWeight: 700,
                                              borderStyle: 'dashed',
                                              bgcolor: '#ffffff',
                                              '&:hover': { bgcolor: '#eff6ff', borderColor: '#2563eb' }
                                            }}
                                          >
                                            + {plans.length - limit} Eski Sınavı Daha Göster
                                          </Button>
                                        )}
                                        {limit > 4 && (
                                          <Button
                                            size="small"
                                            variant="text"
                                            onClick={() => handleShowLessPlans(termKey)}
                                            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}
                                          >
                                            Dönemi Daralt
                                          </Button>
                                        )}
                                      </Box>
                                    )}
                                  </Box>
                                );
                              })}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )
          )}
        </CardContent>
      </Card>

      <ArchiveDialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        onConfirm={handleArchiveConfirm}
        planName={planToArchive?.name}
        defaultYear={ayarlar?.egitimYili}
        defaultTerm={ayarlar?.donem}
      />

      {/* DB Yükleme Onay Dialog */}
      <Dialog
        open={dbImportDialogOpen}
        onClose={() => {
          if (!dbImportLoading) {
            setDbImportDialogOpen(false);
            setSelectedDbFileName(null);
          }
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <DialogHeader icon={<WarningIcon />} title="DB Yedeğini Yükle" variant="warning" />
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography>
            Bu işlem mevcut <strong>veritabanı</strong> dosyasını seçtiğiniz yedek ile <strong>tamamen</strong> değiştirecektir.
          </Typography>
          {selectedDbFileName && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Seçilen dosya: <strong>{selectedDbFileName}</strong>
            </Alert>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            Yükleme sonrası sayfa otomatik yenilenecektir.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => {
              setDbImportDialogOpen(false);
              setSelectedDbFileName(null);
            }}
            variant="outlined"
            disabled={dbImportLoading}
          >
            İptal
          </Button>
          <Button
            onClick={handleDbImportConfirm}
            color="warning" variant="contained"
            startIcon={<UploadIcon />}
            disabled={dbImportLoading}
          >
            {dbImportLoading ? 'Yükleniyor...' : 'Üzerine Yaz ve Yükle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Silme Onay Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPlanToDelete(null);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <DialogHeader icon={<WarningIcon />} title="Planı Sil" variant="danger" />
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography>
            Bu planı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => {
            setDeleteDialogOpen(false);
            setPlanToDelete(null);
          }}>
            İptal
          </Button>
          <Button
            onClick={async () => {
              const closeDialog = () => {
                setDeleteDialogOpen(false);
                setPlanToDelete(null);
              };
              try {
                await handlePlanSil(planToDelete, closeDialog);
              } catch (error) {
                closeDialog();
              }
            }}
            color="error" variant="contained"
            startIcon={<DeleteIcon />}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* İsim Değiştirme Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => {
          if (!isRenaming) {
            setRenameDialogOpen(false);
            setPlanToRename(null);
            setNewPlanName('');
          }
        }}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={isRenaming}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <DialogHeader
            icon={<EditIcon color="primary" />}
            title={isRenaming ? 'Plan Adı Güncelleniyor' : 'Plan Adını Değiştir'}
          />
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {isRenaming ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 2 }}>
              <CircularProgress size={40} />
              <Typography variant="body1" color="text.secondary">
                Plan adı güncelleniyor, lütfen bekleyin...
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {planToRename?.name} planının yeni adını girin:
              </Typography>
              <TextField
                autoFocus fullWidth
                label="Yeni Plan Adı"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRenaming) handleRenameConfirm();
                }}
                variant="outlined"
                sx={{ mt: 1 }}
                disabled={isRenaming}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EditIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setRenameDialogOpen(false);
              setPlanToRename(null);
              setNewPlanName('');
            }}
            disabled={isRenaming}
          >
            İptal
          </Button>
          {!isRenaming && (
            <Button
              onClick={handleRenameConfirm}
              color="primary" variant="contained"
              disabled={!newPlanName.trim() || isRenaming}
            >
              Kaydet
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KayitliPlanlar;