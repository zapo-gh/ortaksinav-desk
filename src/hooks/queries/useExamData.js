import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import db from '../../database';
import logger from '../../utils/logger';

// Ortak query ayarları - gereksiz refetch'leri önler
const defaultQueryOptions = {
    staleTime: 30 * 60 * 1000,       // 30 dakika boyunca veri "taze" sayılır
    gcTime: 60 * 60 * 1000,           // 60 dakika cache'te tutulur
    refetchOnWindowFocus: false,       // Tarayıcı sekmesi değişiminde refetch yapma
    refetchOnMount: false,             // Component remount'ta refetch yapma (cache varsa)
    retry: false,                      // Hata durumunda tekrar deneme
};

// Öğrencileri getir - optimize edilmiş
export const useStudentsQuery = () => {
    return useQuery({
        queryKey: ['students'],
        ...defaultQueryOptions,
        queryFn: async () => {
            try {
                return await db.getAllStudents();
            } catch (error) {
                logger.warn('SQLite fetch failed (students):', error);
                return [];
            }
        },
        enabled: false // Otomatik sorgulama kapalı
    });
};

// Salonları getir - optimize edilmiş
export const useSalonsQuery = () => {
    return useQuery({
        queryKey: ['salons'],
        ...defaultQueryOptions,
        queryFn: async () => {
            try {
                return await db.getAllSalons();
            } catch (error) {
                logger.warn('SQLite fetch failed (salons):', error);
                return [];
            }
        },
        enabled: false // Otomatik sorgulama kapalı
    });
};

// Ayarları getir - optimize edilmiş
export const useSettingsQuery = () => {
    return useQuery({
        queryKey: ['settings'],
        ...defaultQueryOptions,
        queryFn: async () => {
            try {
                return await db.getSettings();
            } catch (error) {
                return {};
            }
        },
        enabled: false // Otomatik sorgulama kapalı
    });
};
