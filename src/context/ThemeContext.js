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
      // Check OS preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('app_theme_mode', newMode);
      return newMode;
    });
  };

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
                background: { default: '#F8FAFC', paper: '#ffffff' },
                text: { primary: '#0F172A', secondary: '#64748B' },
                divider: 'rgba(226, 232, 240, 1)',
              }
            : {
                // Dark mode palette
                primary: { main: '#818CF8', light: '#A5B4FC', dark: '#4F46E5', contrastText: '#0f172a' },
                secondary: { main: '#38BDF8', light: '#7DD3FC', dark: '#0EA5E9', contrastText: '#0f172a' },
                background: { default: '#0F172A', paper: '#1E293B' },
                text: { primary: '#F8FAFC', secondary: '#94A3B8' },
                divider: 'rgba(51, 65, 85, 1)',
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
                boxShadow: mode === 'light' 
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
                border: '1px solid',
                borderColor: mode === 'light' ? 'rgba(226, 232, 240, 1)' : 'rgba(51, 65, 85, 1)',
                transition: 'all 0.25s ease',
                '&:hover': {
                  boxShadow: mode === 'light'
                    ? '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)'
                    : '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                },
                backgroundColor: mode === 'light' ? '#ffffff' : '#1e293b',
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
                boxShadow: mode === 'light'
                  ? '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(8px)',
                backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 41, 59, 0.95)',
              },
            },
          },
          MuiBackdrop: {
            styleOverrides: {
              root: {
                backdropFilter: 'blur(4px)',
                backgroundColor: mode === 'light' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(0, 0, 0, 0.6)',
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
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: '10px',
                backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
                transition: 'all 0.2s ease',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: mode === 'light' ? '#CBD5E1' : '#475569',
                },
                '&.Mui-focused': {
                  backgroundColor: mode === 'light' ? '#FFFFFF' : '#1E293B',
                  boxShadow: mode === 'light' ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : '0 0 0 3px rgba(129, 140, 248, 0.2)',
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
                borderBottom: `1px solid ${mode === 'light' ? '#F1F5F9' : '#334155'}`,
                padding: '16px',
              },
              head: {
                fontWeight: 600,
                color: mode === 'light' ? '#64748B' : '#94A3B8',
                backgroundColor: mode === 'light' ? '#F8FAFC' : '#0F172A',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                borderBottom: `1px solid ${mode === 'light' ? '#E2E8F0' : '#1E293B'}`,
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
