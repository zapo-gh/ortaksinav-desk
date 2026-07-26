import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExamProvider } from './context/ExamContext';
import ErrorBoundary from './components/ErrorBoundary';
import AnaSayfa from './pages/AnaSayfa';
import LoginPage from './components/auth/LoginPage';
import LicenseActivationDialog from './components/LicenseActivationDialog';
import { getCurrentSession, isSuperAdmin, ensureSuperAdmin, initAuth } from "./services/localAuth";
import { subscribeToAuthChanges } from './auth/authState';
import { checkStoredLicense } from './services/licenseService';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Modern Kurumsal Material-UI Teması (Indigo & Slate)
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1e3a8a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
  },
  typography: {
    fontFamily: '"Inter", "Outfit", "Segoe UI", system-ui, -apple-system, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a' },
    h6: { fontWeight: 700, letterSpacing: '-0.005em', color: '#0f172a' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          transition: 'all 0.25s ease',
          '&:hover': {
            boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: '16px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
          borderRadius: '8px',
          transition: 'all 0.2s',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: '8px',
        },
      },
    },
  },
});

// Preloader'Ä± kaldÄ±r (React ilk render'da)
function removePreloader() {
  const el = document.getElementById('preloader');
  if (el) {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }
}

function App() {
  // Ä°lk render'da preloader'Ä± kaldÄ±r
  React.useState(() => removePreloader());

  const [authReady, setAuthReady] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [licenseOk, setLicenseOk] = React.useState(null);
  const [licenseExpiredInfo, setLicenseExpiredInfo] = React.useState(null);

  // Auth ve lisans kontrolÃ¼ - login ekranÄ± gÃ¶sterildikten SONRA arka planda Ã§alÄ±ÅŸÄ±r
  React.useEffect(() => {
    let cancelled = false;

    async function initializeApp() {
      try {
        // Auth'u baÅŸlat (SQLite session oku)
        console.time('â ± initAuth');
        const session = await initAuth();
        console.timeEnd('â ± initAuth');

        if (cancelled) return;

        // Beni hatırla (permanent = 1) ile kaydedilmiş geçerli oturum varsa otomatik geri yükle
        if (session) {
          notifyAuthListeners(session);
          setIsLoggedIn(true);
          if (isSuperAdmin(session)) {
            console.time('â ± ensureSuperAdmin');
            await ensureSuperAdmin();
            console.timeEnd('â ± ensureSuperAdmin');
          }
        }
      } catch (error) {
        console.error('Uygulama baÅŸlatma hatasÄ±:', error);
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    }

    initializeApp();

    return () => { cancelled = true; };
  }, []);

  // Auth deÄŸiÅŸikliklerini dinle
  React.useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((session) => {
      setIsLoggedIn(!!session);
    });
    return unsubscribe;
  }, []);

  // Login baÅŸarÄ±lÄ± olunca lisans kontrolÃ¼nÃ¼ tetikle
  React.useEffect(() => {
    if (authReady && isLoggedIn && licenseOk === null) {
      const session = getCurrentSession();
      if (isSuperAdmin(session)) {
        setLicenseOk(true);
      } else {
        checkStoredLicense().then((result) => {
          if (result.valid) {
            setLicenseOk(true);
          } else {
            setLicenseOk(false);
            if (result.expired) setLicenseExpiredInfo(result);
          }
        }).catch(() => setLicenseOk(false));
      }
    } else if (!isLoggedIn) {
      setLicenseOk(null);
      setLicenseExpiredInfo(null);
    }
  }, [isLoggedIn, authReady]);

  // Login ekranı hemen göster: authReady beklenmez; ama render ağacı tek kalır (flash önleme)
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Giriş yapılmamışsa veya authReady bekleniyor ve oturum yoksa: LoginPage göster */}
        {!isLoggedIn ? (
          <LoginPage onSuccess={() => setIsLoggedIn(true)} />
        ) : licenseOk === false ? (
          <LicenseActivationDialog
            expiredInfo={licenseExpiredInfo}
            onActivated={() => { setLicenseOk(true); setLicenseExpiredInfo(null); }}
            onClose={() => { setIsLoggedIn(false); setLicenseOk(null); setLicenseExpiredInfo(null); }}
          />
        ) : licenseOk === true ? (
          <QueryClientProvider client={queryClient}>
            <ExamProvider>
              <div className="App">
                <a href="#" style={{ position: 'absolute', left: '-9999px' }}>learn react</a>
                <AnaSayfa />
              </div>
            </ExamProvider>
          </QueryClientProvider>
        ) : (
          // licenseOk===null: giriş yapıldı, lisans kontrol ediliyor
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              flexDirection: 'column',
              gap: 2,
              backgroundColor: '#f8fafc',
            }}
          >
            <CircularProgress size={48} thickness={4} />
            <Typography variant="body1" color="text.secondary">
              Yükleniyor...
            </Typography>
          </Box>
        )}
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;