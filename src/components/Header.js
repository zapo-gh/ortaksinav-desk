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
} from '@mui/material';
import {
  AccountCircle,
  ExitToApp,
  Login,
  Search as SearchIcon,
  School as SchoolIcon,
  VpnKey as KeyIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

import QuickSearchModal from './QuickSearchModal';
import LoginDialog from './auth/LoginDialog';
import LicenseInfoDialog from './LicenseInfoDialog';
import { useExam } from '../context/ExamContext';
import { useThemeMode } from '../context/ThemeContext';
import { isSuperAdmin, getCurrentSession } from '../services/localAuth';
import logger from '../utils/logger';

const Header = ({ baslik, kullanici, onHomeClick, onTestDashboardClick, showNav, onMenuClick }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [showTestDashboard, setShowTestDashboard] = React.useState(false);
  const [openSearch, setOpenSearch] = React.useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = React.useState(false);
  const [licenseInfoOpen, setLicenseInfoOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const superAdmin = isSuperAdmin(getCurrentSession());
  const { mode, toggleColorMode } = useThemeMode();

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
      logger.error('Tam ekran geçişi hatası:', error);
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
  const handleLogoutContext = examContext?.logout;
  const canAuth = Boolean(examContext?.login);
  const currentUser = kullanici || contextUser;
  const displayName =
    currentUser?.displayName ||
    currentUser?.ad ||
    currentUser?.email ||
    (role === 'admin' ? 'Yönetici' : 'Misafir');
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
      // Space tuşunu tamamen görmezden gel
      if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
        return;
      }

      // Test Dashboard toggle fonksiyonu - SADECE URL PARAMETRESİ İLE ÇALIŞIR
      const toggleTestDashboard = () => {
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
        } else {
          // URL'ye ?test parametresi ekle
          urlParams.set('test', '1');
          const newUrl = window.location.pathname + '?' + urlParams.toString();
          window.history.pushState({}, '', newUrl);
          setShowTestDashboard(true);
          localStorage.setItem('show_test_dashboard', 'true');
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
        toggleTestDashboard();
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
          background: 'transparent',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: 'all 0.3s ease',
          zIndex: 10,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 60, md: 64 }, px: { xs: 1.5, sm: 2, md: 3 }, gap: 1 }}>
          {/* Mobil Menü İkonu */}
          {onMenuClick && (
            <IconButton
              onClick={onMenuClick}
              edge="start"
              sx={{ color: 'text.primary', mr: 1, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}
          {/* Sol taraf - Logo */}
          <Box
            onClick={onHomeClick}
            sx={{
              flexShrink: 0,
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
                transform: 'scale(1.08)',
                background: 'rgba(255, 255, 255, 0.14)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
              }
            }}
            role="button"
            aria-label="Ana sayfaya dön"
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
              flexGrow: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 1.5,
              px: { xs: 0.5, sm: 1 },
            }}
          >
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                color: 'text.primary',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}
            >
              {baslik || 'Ortak Sınav Yerleştirme Sistemi'}
            </Typography>
          </Box>

          {/* Sağ taraf - Tüm Butonlar Birlikte */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1, md: 1.5 }, flexShrink: 0 }}>
              {/* Arama Butonu */}
              <IconButton
                onClick={() => setOpenSearch(true)}
                title="Hızlı Arama (Ctrl+K)"
                sx={{
                  color: 'text.secondary',
                  background: mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                  '&:hover': { background: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }
                }}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
              
              {/* Tema Butonu */}
              {!showNav && (
                <IconButton
                  onClick={toggleColorMode}
                  title={mode === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
                  sx={{
                    color: 'text.secondary',
                    background: mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                    '&:hover': { background: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' },
                    display: { xs: 'none', sm: 'inline-flex' }
                  }}
                >
                  {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>
              )}

              {/* Tam Ekran Butonu */}
              <IconButton
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
                sx={{
                  color: 'text.secondary',
                  background: mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                  '&:hover': { background: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }
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
              <Box
                onClick={handleMenu}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 0.5, sm: 1 },
                  cursor: 'pointer',
                  p: 0.5,
                  pr: { xs: 1, sm: 1.5 },
                  borderRadius: '12px',
                  background: mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid',
                  borderColor: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                <Avatar
                  sx={{
                    width: { xs: 32, sm: 36 },
                    height: { xs: 32, sm: 36 },
                    bgcolor: 'primary.main',
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    fontWeight: 600,
                  }}
                >
                  {avatarLetter}
                </Avatar>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ 
                      fontWeight: 600, 
                      color: 'text.primary',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2
                    }}
                  >
                    {displayName}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ 
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      display: 'block'
                    }}
                  >
                    {role === 'admin' ? 'Yönetici' : 'Misafir'}
                  </Typography>
                </Box>
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
                  <MenuItem onClick={handleLogout}>
                    <ExitToApp sx={{ mr: 1 }} />
                    Çıkış Yap
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Button
                color="inherit"
                startIcon={<Login />}
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
      <LicenseInfoDialog open={licenseInfoOpen} onClose={() => setLicenseInfoOpen(false)} />
    </>
  );
};

export default memo(Header);
