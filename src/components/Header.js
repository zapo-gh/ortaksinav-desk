import React, { memo } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AccountCircle,
  ExitToApp,
  Login,
  Search as SearchIcon,
  School as SchoolIcon,
  VpnKey as KeyIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';

import QuickSearchModal from './QuickSearchModal';
import LoginDialog from './auth/LoginDialog';
import LicenseManager from './LicenseManager';
import LicenseInfoDialog from './LicenseInfoDialog';
import { useExam } from '../context/ExamContext';
import { isSuperAdmin, getCurrentSession } from '../services/localAuth';

const Header = ({ baslik, kullanici, onHomeClick, onTestDashboardClick, showNav = true }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [showTestDashboard, setShowTestDashboard] = React.useState(false);
  const [lastKeyPress, setLastKeyPress] = React.useState(0);
  const [lastKeyCode, setLastKeyCode] = React.useState(null);
  const [openSearch, setOpenSearch] = React.useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = React.useState(false);
  const [licenseManagerOpen, setLicenseManagerOpen] = React.useState(false);
  const [licenseInfoOpen, setLicenseInfoOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const superAdmin = isSuperAdmin(getCurrentSession());

  // Tam ekran geçiş fonksiyonu
  const toggleFullscreen = async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = await getCurrentWindow();
        const currentFullscreen = await appWindow.isFullscreen();
        
        if (currentFullscreen) {
          await appWindow.setFullscreen(false);
          setIsFullscreen(false);
        } else {
          await appWindow.setFullscreen(true);
          setIsFullscreen(true);
        }
      } else {
        // Fallback for browser
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (error) {
      console.error('Tam ekran geçişi hatası:', error);
    }
  };

  let examContext = null;
  try {
    examContext = useExam();
  } catch (error) {
    examContext = null;
  }
  const contextUser = examContext?.authUser || null;
  const role = examContext?.role || kullanici?.role || 'public';
  const isWriteAllowed = examContext?.isWriteAllowed ?? (role === 'admin');
  const handleLogoutContext = examContext?.logout;
  const canAuth = Boolean(examContext?.login);
  const currentUser = kullanici || contextUser;
  const displayName =
    currentUser?.displayName ||
    currentUser?.ad ||
    currentUser?.email ||
    (role === 'admin' ? 'Yönetici' : 'Misafir');
  const roleLabel = role === 'admin' ? 'Admin' : 'Misafir';

  // Test Dashboard görünürlüğünü kontrol et
  React.useEffect(() => {
    // Log kaldırıldı - gereksiz console spam'i önlemek için

    const checkTestDashboardVisibility = () => {
      // URL parametresi kontrolü - basit ?test
      const urlParams = new URLSearchParams(window.location.search);
      const showFromUrl = urlParams.has('test') || urlParams.get('showTestDashboard') === 'true';

      // KRİTİK DÜZELTME: Sadece URL parametresi varsa göster
      // URL parametresi yoksa localStorage'ı temizle ve gizle
      if (showFromUrl) {
        // URL'de ?test varsa localStorage'a kaydet ve göster
        localStorage.setItem('show_test_dashboard', 'true');
        setShowTestDashboard(true);
        // Log kaldırıldı - gereksiz console spam'i önlemek için
      } else {
        // URL'de ?test yoksa localStorage'ı temizle ve gizle
        localStorage.removeItem('show_test_dashboard');
        setShowTestDashboard(false);
        // Log kaldırıldı - gereksiz console spam'i önlemek için
      }
    };

    checkTestDashboardVisibility();

    // URL değişikliklerini dinle (popstate ve hashchange)
    const handleUrlChange = () => {
      checkTestDashboardVisibility();
    };

    window.addEventListener('popstate', handleUrlChange);

    // URL parametrelerini düzenli kontrol et - sadece değişiklik olduğunda kontrol et
    let lastUrlState = window.location.search;
    const urlCheckInterval = setInterval(() => {
      const currentUrlState = window.location.search;
      if (currentUrlState !== lastUrlState) {
        lastUrlState = currentUrlState;
        checkTestDashboardVisibility();
      }
    }, 500);

    // Space tuşunu globalde (form alanları hariç) engelle
    const preventSpaceToggle = (e) => {
      const isEditable = (el) => {
        if (!el) return false;
        const tag = (el.tagName || '').toLowerCase();
        const editableTags = ['input', 'textarea', 'select'];
        const isContentEditable = el.isContentEditable === true;
        return editableTags.includes(tag) || isContentEditable;
      };
      if ((e.key === ' ' || e.code === 'Space' || e.keyCode === 32) && !isEditable(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Klavye kısayolu handler - debounced
    const handleKeyDown = (e) => {
      const now = Date.now();
      // Space tuşunu tamamen görmezden gel
      if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
        return;
      }

      // Debounce: 1000ms içinde aynı tuş basılırsa ignore et
      if (now - lastKeyPress < 1000 && e.keyCode === lastKeyCode) {
        console.log('⏰ Debounce: Aynı tuş çok yakın zamanda basıldı, ignore ediliyor', e.keyCode);
        return;
      }

      // Test Dashboard toggle fonksiyonu - SADECE URL PARAMETRESİ İLE ÇALIŞIR
      const toggleTestDashboard = (keyName) => {
        console.log(`✅ ${keyName} algılandı! (Debounce geçildi)`);
        setLastKeyPress(now);
        setLastKeyCode(e.keyCode);

        // URL parametresini ekle/kaldır
        const urlParams = new URLSearchParams(window.location.search);
        const hasTestParam = urlParams.has('test') || urlParams.get('showTestDashboard') === 'true';

        if (hasTestParam) {
          // URL'den ?test parametresini kaldır
          urlParams.delete('test');
          urlParams.delete('showTestDashboard');
          const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
          window.history.pushState({}, '', newUrl);
          setShowTestDashboard(false);
          localStorage.removeItem('show_test_dashboard');
          console.log(`🧪 ${keyName} - Test Dashboard: KAPALI (URL parametresi kaldırıldı)`);
        } else {
          // URL'ye ?test parametresi ekle
          urlParams.set('test', '1');
          const newUrl = window.location.pathname + '?' + urlParams.toString();
          window.history.pushState({}, '', newUrl);
          setShowTestDashboard(true);
          localStorage.setItem('show_test_dashboard', 'true');
          console.log(`🧪 ${keyName} - Test Dashboard: AÇIK (URL parametresi eklendi)`);
        }
      };

      // Ctrl+K: Hızlı arama aç
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpenSearch(true);
        return;
      }

      // Sadece Ctrl+Alt+T kombinasyonu ile toggle
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 't' || e.key === '₺')) {
        e.preventDefault();
        toggleTestDashboard('Ctrl+Alt+T');
      }
      // Diğer tüm tuşlar DEVRE DIŞI
    };

    // Event listener'ı sadece document'a ekle (window'a gerek yok)
    document.addEventListener('keydown', handleKeyDown);
    // Capture aşamasında space'i engelle
    document.addEventListener('keydown', preventSpaceToggle, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', preventSpaceToggle, true);
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(urlCheckInterval);
    };
  }, []); // Dependency array'i boş bırak

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const avatarLetter = (displayName || 'K').charAt(0).toUpperCase();

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    if (!handleLogoutContext) {
      handleClose();
      return;
    }
    await handleLogoutContext();
    handleClose();
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px 0 rgba(15, 23, 42, 0.35)',
          transition: 'all 0.3s ease',
        }}
      >
        <Toolbar sx={{ position: 'relative', minHeight: '70px !important', px: { xs: 2, md: 3 } }}>
          {/* Sol taraf - Logo */}
          <Box
            onClick={onHomeClick}
            sx={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1,
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-50%) scale(1.08)',
                background: 'rgba(255, 255, 255, 0.14)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
              }
            }}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
                overflow: 'hidden',
                p: 0.5,
              }}
            >
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL || ''}/osys-logo.png`}
                alt="OSYS Logo"
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: 'contain',
                  position: 'relative',
                  zIndex: 2,
                  filter: 'none'
                }}
              />
            </Box>
          </Box>

          {/* Orta - Başlık & Sürüm/Aktiflik Rozeti */}
          <Box
            sx={{
              position: 'absolute',
              left: { xs: 76, sm: '50%' },
              top: '50%',
              transform: { xs: 'translateY(-50%)', sm: 'translate(-50%, -50%)' },
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              zIndex: 1,
              maxWidth: { xs: 'calc(100% - 160px)', sm: 'calc(100% - 320px)', md: 'calc(100% - 440px)' },
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 800,
                letterSpacing: '0.5px',
                color: '#ffffff',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                fontSize: { xs: '0.9rem', sm: '1.15rem', md: '1.4rem' },
                textAlign: { xs: 'left', sm: 'center' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                userSelect: 'none'
              }}
              title={baslik || 'Ortak Sınav Yerleştirme Sistemi'}
            >
              {baslik || 'Ortak Sınav Yerleştirme Sistemi'}
            </Typography>

            <Chip
              label="v2.0 • SİSTEM AKTİF"
              size="small"
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                bgcolor: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                fontWeight: 700,
                fontSize: '0.72rem',
                height: 24,
                boxShadow: '0 0 12px rgba(34, 197, 94, 0.25)',
                '& .MuiChip-label': { px: 1.2 },
              }}
            />
          </Box>

          {/* Sağ taraf - Tüm Butonlar Birlikte */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1, md: 1.5 }, position: 'absolute', right: { xs: 8, sm: 12, md: 16 }, top: '50%', transform: 'translateY(-50%)' }}>
            <IconButton
              color="inherit"
              size="small"
              onClick={() => setOpenSearch(true)}
              title="Öğrenci Ara (Ctrl+K)"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                p: 1,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.18)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
            <IconButton
              color="inherit"
              size="small"
              onClick={toggleFullscreen}
              title="Tam Ekran (F11)"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                p: 1,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.18)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
            {/* Test Dashboard Butonu */}
            {showTestDashboard && (
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                <Button color="inherit" sx={{ minWidth: 'auto', px: 1.5, mr: 0 }} onClick={onTestDashboardClick}>
                  Test Dashboard
                </Button>
              </Box>
            )}

            {/* Kullanıcı Bölgesi */}
            {currentUser ? (
              <>
                <Chip
                  label={displayName}
                  variant="outlined"
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    color: '#ffffff',
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    fontWeight: 600,
                    borderRadius: '8px',
                    maxWidth: { sm: 130, md: 'none' },
                    transition: 'all 0.2s',
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.18)'
                    }
                  }}
                />
                <IconButton
                  size="small"
                  onClick={handleMenu}
                  color="inherit"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '10px',
                    p: 0.5,
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.24)', transform: 'translateY(-1px)' }
                  }}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'white', color: '#1e3a8a', fontWeight: 700 }}>
                    {avatarLetter}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem disabled>
                    <AccountCircle sx={{ mr: 1 }} />
                    {displayName}
                  </MenuItem>
                  <MenuItem onClick={() => { handleClose(); setLicenseInfoOpen(true); }}>
                    <KeyIcon sx={{ mr: 1, fontSize: 20 }} />
                    Lisans Bilgileri
                  </MenuItem>
                  {superAdmin && (
                    <MenuItem onClick={() => { handleClose(); setLicenseManagerOpen(true); }}>
                      <KeyIcon sx={{ mr: 1, fontSize: 20 }} />
                      Lisans Yönetimi
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout}>
                    <ExitToApp sx={{ mr: 1 }} />
                    Çıkış Yap
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                color="inherit"
                startIcon={<Login />}
                sx={{
                  minWidth: { xs: 'auto', sm: 'auto' },
                  px: { xs: 0.5, sm: 1.5 },
                  py: { xs: 0.5, sm: 0.75 },
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  },
                  '& .MuiButton-startIcon': {
                    margin: { xs: 0, sm: '0 8px 0 0' }
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: { xs: '1.2rem', sm: '1.5rem' }
                  }
                }}
                onClick={canAuth ? () => setLoginDialogOpen(true) : undefined}
                disabled={!canAuth}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  GİRİŞ YAP
                </Box>
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <QuickSearchModal open={openSearch} onClose={() => setOpenSearch(false)} />
      {canAuth ? (
        <LoginDialog
          open={loginDialogOpen}
          onClose={() => setLoginDialogOpen(false)}
        />
      ) : null}
      <LicenseManager open={licenseManagerOpen} onClose={() => setLicenseManagerOpen(false)} />
      <LicenseInfoDialog open={licenseInfoOpen} onClose={() => setLicenseInfoOpen(false)} />
    </>
  );
};

export default memo(Header);
