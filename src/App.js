import React from 'react';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppToaster } from './components/NotificationSystem';
import { ExamProvider } from './context/ExamContext';
import { CustomThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import AnaSayfa from './pages/AnaSayfa';
import LoginPage from './components/auth/LoginPage';
import LicenseActivationDialog from './components/LicenseActivationDialog';
import { getCurrentSession, isSuperAdmin, ensureSuperAdmin, initAuth } from "./services/localAuth";
import { subscribeToAuthChanges, notifyAuthListeners } from './auth/authState';
import { checkStoredLicense } from './services/licenseService';
import logger from './utils/logger';
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



// Preloader'ı kaldır (React ilk render'da)
function removePreloader() {
  const el = document.getElementById('preloader');
  if (el) {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }
}

function App() {
  // İlk render'da preloader'ı kaldır
  React.useState(() => removePreloader());

  const [authReady, setAuthReady] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [licenseOk, setLicenseOk] = React.useState(null);
  const [licenseExpiredInfo, setLicenseExpiredInfo] = React.useState(null);

  // Auth ve lisans kontrolü - login ekranı gösterildikten SONRA arka planda çalışır
  React.useEffect(() => {
    let cancelled = false;

    async function initializeApp() {
      try {
        // Auth'u başlat (SQLite session oku)
        const session = await initAuth();

        if (cancelled) return;

        // Beni hatırla (permanent = 1) ile kaydedilmiş geçerli oturum varsa otomatik geri yükle
        if (session) {
          notifyAuthListeners(session);
          setIsLoggedIn(true);
          if (isSuperAdmin(session)) {
            await ensureSuperAdmin();
          }
        }
      } catch (error) {
        logger.error('Uygulama başlatma hatası:', error);
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    }

    initializeApp();

    return () => { cancelled = true; };
  }, []);

  // Auth değişikliklerini dinle
  React.useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((session) => {
      setIsLoggedIn(!!session);
    });
    return unsubscribe;
  }, []);

  // Login başarılı olunca lisans kontrolünü tetikle
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
      <CustomThemeProvider>
        <AppToaster />
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
      </CustomThemeProvider>
    </ErrorBoundary>
  );
}

export default App;