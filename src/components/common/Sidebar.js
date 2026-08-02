import React from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography, 
  IconButton,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Tooltip
} from '@mui/material';
import {
  Settings as SettingsIcon,
  People as PeopleIcon,
  Book as BookIcon,
  MeetingRoom as MeetingRoomIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Chair as ChairIcon,
  Save as SaveIcon,
  School as SchoolIcon,
  MenuOpen as MenuOpenIcon,
  Menu as MenuIcon,
  Search as SearchIcon,
  AccountCircle,
  ExitToApp,
  Login,
  VpnKey as KeyIcon
} from '@mui/icons-material';
import { useExamStore } from '../../store/useExamStore';
import { useExam } from '../../context/ExamContext';
import { isSuperAdmin, getCurrentSession } from '../../services/localAuth';
import logger from '../../utils/logger';
import QuickSearchModal from '../QuickSearchModal';
import LoginDialog from '../auth/LoginDialog';
import LicenseManager from '../LicenseManager';
import LicenseInfoDialog from '../LicenseInfoDialog';
import ContactFormDialog from '../ContactFormDialog';
import {
  Email as EmailIcon
} from '@mui/icons-material';

const drawerWidth = 260;
const collapsedWidth = 72;

const NAV_ITEMS = [
  { id: 'genel-ayarlar', label: 'Sınav Ayarları', icon: SettingsIcon },
  { id: 'ogrenciler', label: 'Öğrenciler', icon: PeopleIcon },
  { id: 'ayarlar', label: 'Dersler', icon: BookIcon },
  { id: 'salonlar', label: 'Sınav Salonları', icon: MeetingRoomIcon },
  { id: 'sabit-atamalar', label: 'Sabit Atamalar', icon: AssignmentIcon },
  { id: 'planlama', label: 'Planlama Yap', icon: AssessmentIcon },
  { id: 'salon-plani', label: 'Salon Planı', icon: ChairIcon },
  { id: 'kayitli-planlar', label: 'Kayıtlı Planlar', icon: SaveIcon },
];

const Sidebar = ({ isMobile, mobileOpen, setMobileOpen, collapsed, setCollapsed, kullanici }) => {
  const theme = useTheme();
  
  const aktifTab = useExamStore(s => s.aktifTab);
  const setAktifTab = useExamStore(s => s.setAktifTab);

  // --- Auth & Profile State ---
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [openSearch, setOpenSearch] = React.useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = React.useState(false);
  const [licenseManagerOpen, setLicenseManagerOpen] = React.useState(false);
  const [licenseInfoOpen, setLicenseInfoOpen] = React.useState(false);
  const [showTestDashboard, setShowTestDashboard] = React.useState(false);
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false);
  
  const superAdmin = isSuperAdmin(getCurrentSession());

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
  const avatarLetter = (displayName || 'K').charAt(0).toUpperCase();

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = async () => {
    if (!handleLogoutContext) {
      handleClose();
      return;
    }
    await handleLogoutContext();
    handleClose();
  };

  // Keyboard Shortcuts & Test Dashboard Logic
  React.useEffect(() => {
    const checkTestDashboardVisibility = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const showFromUrl = urlParams.has('test') || urlParams.get('showTestDashboard') === 'true';
      if (showFromUrl) {
        localStorage.setItem('show_test_dashboard', 'true');
        setShowTestDashboard(true);
      } else {
        localStorage.removeItem('show_test_dashboard');
        setShowTestDashboard(false);
      }
    };

    checkTestDashboardVisibility();
    const handleUrlChange = () => checkTestDashboardVisibility();
    window.addEventListener('popstate', handleUrlChange);

    const preventSpaceToggle = (e) => {
      const isEditable = (el) => {
        if (!el) return false;
        const tag = (el.tagName || '').toLowerCase();
        const editableTags = ['input', 'textarea', 'select'];
        return editableTags.includes(tag) || el.isContentEditable === true;
      };
      if ((e.key === ' ' || e.code === 'Space' || e.keyCode === 32) && !isEditable(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) return;

      const toggleTestDashboard = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const hasTestParam = urlParams.has('test') || urlParams.get('showTestDashboard') === 'true';
        if (hasTestParam) {
          urlParams.delete('test');
          urlParams.delete('showTestDashboard');
          const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
          window.history.pushState({}, '', newUrl);
          setShowTestDashboard(false);
          localStorage.removeItem('show_test_dashboard');
        } else {
          urlParams.set('test', '1');
          window.history.pushState({}, '', window.location.pathname + '?' + urlParams.toString());
          setShowTestDashboard(true);
          localStorage.setItem('show_test_dashboard', 'true');
        }
      };

      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpenSearch(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 't' || e.key === '₺')) {
        e.preventDefault();
        toggleTestDashboard();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', preventSpaceToggle, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', preventSpaceToggle, true);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleNavClick = (id) => {
    setAktifTab(id);
    if (isMobile) setMobileOpen(false);
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Section */}
      <Box sx={{ 
        height: 64, 
        display: 'flex', 
        alignItems: 'center', 
        px: collapsed ? 0 : 2.5, 
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.3s ease'
      }}>
        {collapsed && !isMobile ? (
          <Tooltip title="Menüyü Aç" placement="right">
            <IconButton 
              onClick={() => setCollapsed(false)} 
              size="small"
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: '10px', 
                bgcolor: 'rgba(255,255,255,0.08)', 
                color: '#fff', 
                '&:hover': { bgcolor: '#2563eb', color: '#fff' },
                transition: 'all 0.2s'
              }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
              <Box sx={{ 
                width: 32, height: 32, 
                borderRadius: '8px', 
                bgcolor: '#2563eb', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <SchoolIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ letterSpacing: '-0.02em', color: '#ffffff' }}>
                Ortak Sınav
              </Typography>
            </Box>
            
            {!isMobile && (
              <Tooltip title="Menüyü Daralt" placement="bottom">
                <IconButton onClick={() => setCollapsed(true)} size="small" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                  <MenuOpenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </Box>

      {/* Top Action Buttons (Arama & İletişim) */}
      <Box sx={{
        px: collapsed ? 1 : 1.5,
        pt: 1.5,
        pb: 1,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        gap: 1
      }}>
        {!collapsed ? (
          <>
            <Box
              onClick={() => setOpenSearch(true)}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                bgcolor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                px: 1.5,
                py: 0.8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.15)'
                }
              }}
            >
              <SearchIcon sx={{ fontSize: 18, color: '#60a5fa' }} />
              <Typography
                variant="body2"
                noWrap
                sx={{
                  flex: 1,
                  fontSize: '0.8125rem',
                  color: '#cbd5e1',
                  fontWeight: 500,
                  letterSpacing: '-0.01em'
                }}
              >
                Öğrenci Ara...
              </Typography>
              <Box
                component="span"
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: '#94a3b8',
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: '6px'
                }}
              >
                Ctrl+K
              </Box>
            </Box>
            <Tooltip title="İletişim & Destek" placement="bottom">
              <IconButton
                onClick={() => setContactDialogOpen(true)}
                size="small"
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  bgcolor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#fff'
                  }
                }}
              >
                <EmailIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="Öğrenci Ara (Ctrl+K)" placement="right">
              <IconButton
                onClick={() => setOpenSearch(true)}
                size="small"
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  bgcolor: 'rgba(255, 255, 255, 0.06)',
                  color: '#60a5fa',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.12)', color: '#fff' }
                }}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="İletişim & Destek" placement="right">
              <IconButton
                onClick={() => setContactDialogOpen(true)}
                size="small"
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  bgcolor: 'rgba(255, 255, 255, 0.06)',
                  color: '#94a3b8',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.12)', color: '#fff' }
                }}
              >
                <EmailIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Box>

      {/* Navigation Links */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2, px: 1.5, '&::-webkit-scrollbar': { display: 'none' } }}>
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = aktifTab === item.id;
            
            return (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  onClick={() => handleNavClick(item.id)}
                  sx={{
                    borderRadius: '8px',
                    minHeight: 44,
                    justifyContent: collapsed ? 'center' : 'initial',
                    px: collapsed ? 0 : 1.5,
                    bgcolor: active ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                    color: active ? '#60a5fa' : '#94a3b8',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: active ? 'rgba(37, 99, 235, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      color: active ? '#60a5fa' : '#f8fafc',
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 0, 
                    mr: collapsed ? 0 : 1.5, 
                    justifyContent: 'center',
                    color: 'inherit'
                  }}>
                    <Icon sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  
                  {!collapsed && (
                    <ListItemText 
                      primary={item.label} 
                      primaryTypographyProps={{ 
                        fontSize: '0.875rem',
                        fontWeight: active ? 600 : 500,
                        letterSpacing: '-0.01em'
                      }} 
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}

          {showTestDashboard && (
             <ListItem disablePadding>
               <ListItemButton
                 onClick={() => handleNavClick('test-dashboard')}
                 sx={{
                   borderRadius: '8px',
                   minHeight: 44,
                   justifyContent: collapsed ? 'center' : 'initial',
                   px: collapsed ? 0 : 1.5,
                   bgcolor: aktifTab === 'test-dashboard' ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                   color: aktifTab === 'test-dashboard' ? 'error.main' : 'text.secondary',
                   '&:hover': {
                     bgcolor: 'rgba(239, 68, 68, 0.12)',
                     color: 'error.main',
                   }
                 }}
               >
                 <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, justifyContent: 'center', color: 'inherit' }}>
                   <SettingsIcon sx={{ fontSize: 20 }} />
                 </ListItemIcon>
                 {!collapsed && (
                   <ListItemText primary="Test Dashboard" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
                 )}
               </ListItemButton>
             </ListItem>
          )}
        </List>
      </Box>

      {/* Bottom Actions (User Profile, Search, Fullscreen, Theme Toggle) */}
      <Box sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        
        {/* User Profile */}
        {currentUser ? (
          <>
            <ListItemButton
              onClick={handleMenu}
              sx={{
                borderRadius: '8px',
                minHeight: 44,
                justifyContent: collapsed ? 'center' : 'initial',
                px: collapsed ? 0 : 1.5,
                mb: 1,
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, justifyContent: 'center' }}>
                <Avatar sx={{ width: 26, height: 26, bgcolor: '#2563eb', fontSize: '0.8rem', fontWeight: 600 }}>
                  {avatarLetter}
                </Avatar>
              </ListItemIcon>
              {!collapsed && (
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.2 }}>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" noWrap sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {role === 'admin' ? 'Yönetici' : 'Misafir'}
                  </Typography>
                </Box>
              )}
            </ListItemButton>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} transformOrigin={{ horizontal: 'left', vertical: 'bottom' }} anchorOrigin={{ horizontal: 'left', vertical: 'top' }}>
              <MenuItem disabled><AccountCircle sx={{ mr: 1 }} />{displayName}</MenuItem>
              <MenuItem onClick={() => { handleClose(); setLicenseInfoOpen(true); }}><KeyIcon sx={{ mr: 1, fontSize: 20 }} />Lisans Bilgileri</MenuItem>
              {superAdmin && <MenuItem onClick={() => { handleClose(); setLicenseManagerOpen(true); }}><KeyIcon sx={{ mr: 1, fontSize: 20 }} />Lisans Yönetimi</MenuItem>}
              <MenuItem onClick={handleLogout}><ExitToApp sx={{ mr: 1 }} />Çıkış Yap</MenuItem>
            </Menu>
          </>
        ) : (
          <ListItemButton
            onClick={canAuth ? () => setLoginDialogOpen(true) : undefined}
            disabled={!canAuth}
            sx={{
              borderRadius: '8px',
              minHeight: 44,
              justifyContent: collapsed ? 'center' : 'initial',
              px: collapsed ? 0 : 1.5,
              mb: 1,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, justifyContent: 'center', color: 'inherit' }}>
              <Login sx={{ fontSize: 20 }} />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Giriş Yap" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />}
          </ListItemButton>
        )}
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ 
        width: { sm: collapsed ? collapsedWidth : drawerWidth }, 
        flexShrink: { sm: 0 },
        transition: 'width 0.3s ease'
      }}
    >
      {/* Mobile drawer */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: 'none',
              bgcolor: '#0f172a',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        /* Desktop drawer */
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: collapsed ? collapsedWidth : drawerWidth,
              borderRight: 'none',
              bgcolor: '#0f172a',
              transition: 'width 0.3s ease',
              overflowX: 'hidden',
              boxShadow: '4px 0 24px rgba(0,0,0,0.05)'
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
      
      {/* Modals moved from Header */}
      <QuickSearchModal open={openSearch} onClose={() => setOpenSearch(false)} />
      {canAuth ? <LoginDialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)} /> : null}
      <LicenseManager open={licenseManagerOpen} onClose={() => setLicenseManagerOpen(false)} />
      <LicenseInfoDialog open={licenseInfoOpen} onClose={() => setLicenseInfoOpen(false)} />
      <ContactFormDialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} />
    </Box>
  );
};

export default Sidebar;
