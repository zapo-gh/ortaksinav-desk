import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeContext = createContext({
  toggleColorMode: () => {},
  mode: 'light',
});

export const useThemeMode = () => useContext(ThemeContext);

export const CustomThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');

  // Load from local storage
  useEffect(() => {
    const savedMode = localStorage.getItem('app_theme_mode');
    if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
      setMode(savedMode);
    } else {
      // OS tercihini yoksay ve her zaman aydınlık modda başlat
      setMode('light');
    }
  }, []);

  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('app_theme_mode', newMode);
      document.documentElement.setAttribute('data-theme', newMode);
      return newMode;
    });
  };

  // Ensure data-theme is set on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                // Light mode palette (SaaS Corporate)
                primary: { main: '#4F46E5', light: '#818CF8', dark: '#3730A3', contrastText: '#ffffff' },
                secondary: { main: '#0EA5E9', light: '#38BDF8', dark: '#0284C7', contrastText: '#ffffff' },
                background: { default: '#F4F7F9', paper: '#ffffff' },
                text: { primary: '#0F172A', secondary: '#64748B' },
                divider: 'rgba(226, 232, 240, 1)',
                female: { main: '#ec4899', light: '#f472b6', dark: '#db2777', 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', contrastText: '#ffffff' },
                male: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb', 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', contrastText: '#ffffff' },
              }
            : {
                // Dark mode palette
                primary: { main: '#818CF8', light: '#A5B4FC', dark: '#4F46E5', contrastText: '#0f172a' },
                secondary: { main: '#38BDF8', light: '#7DD3FC', dark: '#0EA5E9', contrastText: '#0f172a' },
                background: { default: '#0F172A', paper: '#1E293B' },
                text: { primary: '#F8FAFC', secondary: '#94A3B8' },
                divider: 'rgba(51, 65, 85, 1)',
                female: { main: '#f472b6', light: '#f9a8d4', dark: '#ec4899', 50: '#831843', 100: '#9d174d', 200: '#be185d', contrastText: '#ffffff' },
                male: { main: '#60a5fa', light: '#93c5fd', dark: '#3b82f6', 50: '#1e3a8a', 100: '#1e40af', 200: '#1d4ed8', contrastText: '#ffffff' },
              }),
        },
        typography: {
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
          h4: { fontWeight: 700, letterSpacing: '-0.02em' },
          h5: { fontWeight: 700, letterSpacing: '-0.02em' },
          h6: { fontWeight: 600, letterSpacing: '-0.01em' },
          subtitle1: { fontWeight: 500 },
          subtitle2: { fontWeight: 500 },
          button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
        },
        shape: { borderRadius: 8 },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  boxShadow: 'none',
                  transform: 'translateY(-1px)',
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: '12px',
                boxShadow: 'none',
                border: '1px solid',
                borderColor: mode === 'light' ? 'rgba(226, 232, 240, 1)' : 'rgba(51, 65, 85, 1)',
                backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(16px)',
                transition: 'all 0.25s ease',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              rounded: {
                borderRadius: '12px',
              },
              root: {
                backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(16px)',
              }
            },
          },
          MuiDialog: {
            defaultProps: {
              TransitionProps: { timeout: 250 },
            },
            styleOverrides: {
              paper: {
                borderRadius: '20px',
                boxShadow: mode === 'light'
                  ? '0 32px 64px -12px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(226, 232, 240, 0.6)'
                  : '0 32px 64px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(51, 65, 85, 0.6)',
                backdropFilter: 'none',
                backgroundColor: mode === 'light' ? '#ffffff' : '#0f172a',
                border: `1px solid ${mode === 'light' ? 'rgba(226, 232, 240, 1)' : 'rgba(51, 65, 85, 1)'}`,
              },
              paperWidthXs: {
                maxWidth: '400px',
              },
              paperWidthSm: {
                maxWidth: '520px',
              },
            },
          },
          MuiBackdrop: {
            styleOverrides: {
              root: {
                backdropFilter: 'none',
                backgroundColor: mode === 'light' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(0, 0, 0, 0.65)',
              },
            },
          },
          MuiDialogTitle: {
            styleOverrides: {
              root: {
                padding: 0,
                fontSize: '1rem',
                overflow: 'hidden',
              },
            },
          },
          MuiDialogContent: {
            styleOverrides: {
              root: {
                padding: '8px 24px 16px 24px',
              },
            },
          },
          MuiDialogActions: {
            styleOverrides: {
              root: {
                padding: '12px 24px 20px 24px',
                gap: '8px',
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                minHeight: '40px',
                transition: 'all 0.2s',
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                fontWeight: 600,
                borderRadius: '6px',
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: '8px',
                backgroundColor: mode === 'light' ? 'rgba(248, 250, 252, 0.5)' : 'rgba(15, 23, 42, 0.5)',
                transition: 'all 0.2s ease',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'light' ? '#CBD5E1' : '#475569',
                },
                '&.Mui-focused': {
                  backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B',
                  boxShadow: mode === 'light' ? '0 0 0 2px rgba(79, 70, 229, 0.15)' : '0 0 0 2px rgba(129, 140, 248, 0.2)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'light' ? '#4F46E5' : '#818CF8',
                  borderWidth: '1px',
                },
              },
              notchedOutline: {
                borderColor: mode === 'light' ? '#E2E8F0' : '#334155',
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottom: `1px solid ${mode === 'light' ? '#F1F5F9' : '#1E293B'}`,
                padding: '16px',
              },
              head: {
                fontWeight: 600,
                color: mode === 'light' ? '#64748B' : '#94A3B8',
                backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                borderBottom: `1px solid ${mode === 'light' ? '#E2E8F0' : '#334155'}`,
                zIndex: 3,
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={{ toggleColorMode, mode }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
