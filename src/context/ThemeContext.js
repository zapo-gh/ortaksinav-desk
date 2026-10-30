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
      const bg = newMode === 'dark' ? '#0F172A' : '#F4F7F9';
      document.documentElement.style.backgroundColor = bg;
      document.body.style.backgroundColor = bg;
      document.documentElement.style.colorScheme = newMode;
      return newMode;
    });
  };

  // Ensure data-theme and root background is set on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    const bg = mode === 'dark' ? '#0F172A' : '#F4F7F9';
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    document.documentElement.style.colorScheme = mode;
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
            defaultProps: {
              disableElevation: false,
            },
            styleOverrides: {
              root: {
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                lineHeight: 1.5,
                transition: 'transform 0.12s ease, background-color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                },
                '&:active:not(:disabled)': {
                  transform: 'scale(0.97)',
                },
                '&.Mui-focusVisible': {
                  outline: `2px solid ${mode === 'light' ? '#4F46E5' : '#818CF8'}`,
                  outlineOffset: '2px',
                },
                '&.Mui-disabled': {
                  opacity: 0.5,
                  transform: 'none',
                },
              },
              contained: {
                boxShadow: mode === 'light'
                  ? '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)'
                  : '0 1px 3px rgba(0, 0, 0, 0.3)',
                '&:hover': {
                  boxShadow: mode === 'light'
                    ? '0 6px 16px -2px rgba(79, 70, 229, 0.25), 0 2px 4px -1px rgba(79, 70, 229, 0.15)'
                    : '0 6px 16px -2px rgba(0, 0, 0, 0.5)',
                },
              },
              containedPrimary: {
                background: mode === 'light'
                  ? 'linear-gradient(180deg, #4F46E5 0%, #4338CA 100%)'
                  : 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)',
                color: '#ffffff',
                border: '1px solid',
                borderColor: mode === 'light' ? '#3730A3' : '#4338CA',
                '&:hover': {
                  background: mode === 'light'
                    ? 'linear-gradient(180deg, #4338CA 0%, #3730A3 100%)'
                    : 'linear-gradient(180deg, #818CF8 0%, #6366F1 100%)',
                },
              },
              containedSuccess: {
                background: mode === 'light'
                  ? 'linear-gradient(180deg, #10B981 0%, #059669 100%)'
                  : 'linear-gradient(180deg, #34D399 0%, #10B981 100%)',
                color: '#ffffff',
                border: '1px solid',
                borderColor: mode === 'light' ? '#047857' : '#059669',
                '&:hover': {
                  background: mode === 'light'
                    ? 'linear-gradient(180deg, #059669 0%, #047857 100%)'
                    : 'linear-gradient(180deg, #6EE7B7 0%, #34D399 100%)',
                },
              },
              containedError: {
                background: mode === 'light'
                  ? 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)'
                  : 'linear-gradient(180deg, #F87171 0%, #EF4444 100%)',
                color: '#ffffff',
                border: '1px solid',
                borderColor: mode === 'light' ? '#B91C1C' : '#DC2626',
                '&:hover': {
                  background: mode === 'light'
                    ? 'linear-gradient(180deg, #DC2626 0%, #B91C1C 100%)'
                    : 'linear-gradient(180deg, #FCA5A5 0%, #F87171 100%)',
                },
              },
              outlined: {
                borderWidth: '1px',
                borderColor: mode === 'light' ? 'rgba(203, 213, 225, 0.85)' : 'rgba(71, 85, 105, 0.7)',
                backgroundColor: mode === 'light' ? '#FFFFFF' : 'rgba(30, 41, 59, 0.6)',
                '&:hover': {
                  borderColor: mode === 'light' ? '#94A3B8' : '#64748B',
                  backgroundColor: mode === 'light' ? '#F8FAFC' : 'rgba(51, 65, 85, 0.65)',
                },
              },
              outlinedPrimary: {
                borderColor: mode === 'light' ? 'rgba(79, 70, 229, 0.35)' : 'rgba(129, 140, 248, 0.4)',
                color: mode === 'light' ? '#4F46E5' : '#A5B4FC',
                backgroundColor: mode === 'light' ? 'rgba(79, 70, 229, 0.04)' : 'rgba(99, 102, 241, 0.08)',
                '&:hover': {
                  borderColor: mode === 'light' ? '#4F46E5' : '#818CF8',
                  backgroundColor: mode === 'light' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(99, 102, 241, 0.18)',
                },
              },
              outlinedError: {
                borderColor: mode === 'light' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(248, 113, 113, 0.4)',
                color: mode === 'light' ? '#DC2626' : '#F87171',
                backgroundColor: mode === 'light' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(239, 68, 68, 0.08)',
                '&:hover': {
                  borderColor: mode === 'light' ? '#DC2626' : '#EF4444',
                  backgroundColor: mode === 'light' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.18)',
                },
              },
              sizeSmall: {
                height: '34px',
                padding: '4px 12px',
                fontSize: '0.8125rem',
              },
              sizeMedium: {
                height: '38px',
                padding: '7px 16px',
                fontSize: '0.875rem',
              },
              sizeLarge: {
                height: '44px',
                padding: '10px 22px',
                fontSize: '0.9375rem',
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                borderRadius: '10px',
                transition: 'transform 0.12s ease, background-color 0.12s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  backgroundColor: mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.08)',
                },
                '&:active:not(:disabled)': {
                  transform: 'scale(0.94)',
                },
              },
            },
          },
          MuiButtonGroup: {
            styleOverrides: {
              root: {
                borderRadius: '10px',
                boxShadow: 'none',
                overflow: 'hidden',
              },
              grouped: {
                minWidth: 'auto',
              },
            },
          },
          MuiFab: {
            styleOverrides: {
              root: {
                borderRadius: '14px',
                boxShadow: mode === 'light'
                  ? '0 10px 25px -4px rgba(15, 23, 42, 0.18), 0 4px 6px -2px rgba(15, 23, 42, 0.08)'
                  : '0 10px 25px -4px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.02)',
                  boxShadow: mode === 'light'
                    ? '0 14px 28px -4px rgba(15, 23, 42, 0.24)'
                    : '0 14px 28px -4px rgba(0, 0, 0, 0.75)',
                },
                '&:active': {
                  transform: 'scale(0.96)',
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
                backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B',
                backgroundImage: 'none',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              rounded: {
                borderRadius: '12px',
              },
              root: {
                backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B',
                backgroundImage: 'none',
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
