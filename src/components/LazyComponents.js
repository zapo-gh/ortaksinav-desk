import React, { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Lazy loading için fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
    <CircularProgress />
  </Box>
);

const lazyWithTimeout = (importer, {
  timeoutMs = 15000,
  retries = 1,
  componentName = 'LazyComponent'
} = {}) => {
  const withTimeout = (promise, name) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${name} yukleme zaman asimina ugradi (${timeoutMs}ms).`));
      }, timeoutMs);

      promise
        .then((module) => {
          clearTimeout(timeoutId);
          resolve(module);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  };

  return lazy(async () => {
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await withTimeout(importer(), componentName);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    }

    throw lastError || new Error(`${componentName} yuklenemedi.`);
  });
};

// Lazy loaded components - Test/Debug components
export const LazyTestDashboard = lazyWithTimeout(() => import('./TestDashboard'), { componentName: 'TestDashboard' });
export const LazyDatabaseTest = lazyWithTimeout(() => import('./DatabaseTest'), { componentName: 'DatabaseTest' });
export const LazyWelcomePage = lazyWithTimeout(() => import('./WelcomePage'), { componentName: 'WelcomePage' });

// Lazy loaded components - Main application components (Code splitting)
export const LazySalonPlani = lazyWithTimeout(() => import('./SalonPlani'), { componentName: 'SalonPlani' });
export const LazyPlanlamaYap = lazyWithTimeout(() => import('./PlanlamaYap'), { componentName: 'PlanlamaYap' });
export const LazySabitAtamalar = lazyWithTimeout(() => import('./SabitAtamalar'), { componentName: 'SabitAtamalar', retries: 2 });
export const LazyKayitliPlanlar = lazyWithTimeout(() => import('./KayitliPlanlar'), { componentName: 'KayitliPlanlar' });


// HOC for lazy loading with Suspense
export const withLazyLoading = (Component) => {
  return (props) => (
    <Suspense fallback={<LoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
};

// Lazy loaded components with Suspense - Test/Debug
export const TestDashboardLazy = withLazyLoading(LazyTestDashboard);
export const DatabaseTestLazy = withLazyLoading(LazyDatabaseTest);
export const WelcomePageLazy = withLazyLoading(LazyWelcomePage);

// Lazy loaded components with Suspense - Main application
export const SalonPlaniLazy = withLazyLoading(LazySalonPlani);
export const PlanlamaYapLazy = withLazyLoading(LazyPlanlamaYap);
export const SabitAtamalarLazy = withLazyLoading(LazySabitAtamalar);
export const KayitliPlanlarLazy = withLazyLoading(LazyKayitliPlanlar);















