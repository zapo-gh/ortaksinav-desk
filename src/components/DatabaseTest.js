import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { useExamSelector } from '../context/ExamContext';
import db from '../database';
import PageHeader from './common/PageHeader';
import { BugReport as BugReportIcon } from '@mui/icons-material';

const DatabaseTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const startLoading = useExamSelector((state) => state.startLoading);
  const stopLoading = useExamSelector((state) => state.stopLoading);

  const addTestResult = (test, status, message, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runDatabaseTests = async () => {
    setIsLoading(true);
    if (startLoading) startLoading('Veritabanı sağlık kontrolü çalıştırılıyor...');
    setError(null);
    setTestResults([]);

    try {
      // Test 1: Veritabanı bağlantısı
      addTestResult('DB Connection', 'running', 'Veritabanı bağlantısı kontrol ediliyor...');
      if (db.open) {
        await db.open();
      }
      addTestResult('DB Connection', 'success', 'Veritabanı bağlantısı aktif ve hazır');

      // Test 2: Öğrenci tablosu kontrolü (Güvenli Okuma - Veri ezilmez)
      addTestResult('Read Students', 'running', 'Kayıtlı öğrenciler kontrol ediliyor...');
      const loadedStudents = await db.getAllStudents();
      addTestResult('Read Students', 'success', `${loadedStudents?.length || 0} öğrenci başarıyla okundu`);

      // Test 3: Ayar tablosu kontrolü
      addTestResult('Read Settings', 'running', 'Sınav ayarları kontrol ediliyor...');
      const loadedSettings = await db.getSettings();
      addTestResult('Read Settings', 'success', 'Sınav ayarları okundu', loadedSettings);

      // Test 4: Salon tablosu kontrolü
      addTestResult('Read Salons', 'running', 'Kayıtlı salonlar kontrol ediliyor...');
      const loadedSalons = await db.getAllSalons();
      addTestResult('Read Salons', 'success', `${loadedSalons?.length || 0} salon başarıyla okundu`);

      // Test 5: Plan tablosu kontrolü
      addTestResult('List Plans', 'running', 'Kayıtlı planlar kontrol ediliyor...');
      const plans = await db.getAllPlans();
      addTestResult('List Plans', 'success', `${plans?.length || 0} sınav planı bulundu`);

      addTestResult('All Tests', 'success', 'Veritabanı sağlık kontrolü tamamlandı! Mevcut veriler korundu.');

    } catch (error) {
      console.error('❌ Veritabanı test hatası:', error);
      setError(error.message);
      addTestResult('Error', 'error', `Test hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
      if (stopLoading) stopLoading();
    }
  };

  const clearDatabase = async () => {
    try {
      setIsLoading(true);
      startLoading('Veritabanı temizleniyor...');
      await db.clearDatabase();
      setTestResults([]);
      setError(null);
      addTestResult('Clear DB', 'success', 'Veritabanı temizlendi');
    } catch (error) {
      setError(error.message);
      addTestResult('Clear DB', 'error', `Temizleme hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
      stopLoading();
    }
  };

  const clearAutoPlans = async () => {
    try {
      setIsLoading(true);
      startLoading('Otomatik kayıtlar temizleniyor...');
      await db.clearAutoPlans();
      setTestResults([]);
      setError(null);
      addTestResult('Clear Auto Plans', 'success', 'Otomatik kayıt planları temizlendi');
    } catch (error) {
      setError(error.message);
      addTestResult('Clear Auto Plans', 'error', `Temizleme hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
      stopLoading();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success.main';
      case 'error': return 'error.main';
      case 'running': return 'info.main';
      default: return 'text.primary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '🔄';
      default: return 'ℹ️';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Veritabanı Test Paneli
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              onClick={runDatabaseTests}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Testler Çalışıyor...' : 'Veritabanı Testlerini Çalıştır'}
            </Button>

            <Button
              variant="outlined"
              color="warning"
              onClick={clearDatabase}
              disabled={isLoading}
            >
              Veritabanını Temizle
            </Button>

            <Button
              variant="outlined"
              color="error"
              onClick={clearAutoPlans}
              disabled={isLoading}
            >
              Otomatik Kayıt Planlarını Temizle
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Sonuçları
            </Typography>

            <List>
              {testResults.map((result, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            component="span"
                            sx={{ color: getStatusColor(result.status) }}
                          >
                            {getStatusIcon(result.status)} {result.test}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({result.timestamp})
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {result.message}
                          </Typography>
                          {result.data && (
                            <Typography variant="caption" color="text.secondary">
                              Veri: {JSON.stringify(result.data, null, 2).substring(0, 100)}...
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < testResults.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DatabaseTest;
