import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStudentSlice } from './slices/createStudentSlice';
import { createSalonSlice } from './slices/createSalonSlice';
import { createPlacementSlice } from './slices/createPlacementSlice';
import { createUISlice } from './slices/createUISlice';

export const useExamStore = create(
    persist(
        (set, get, api) => ({
            ...createStudentSlice(set, get, api),
            ...createSalonSlice(set, get, api),
            ...createPlacementSlice(set, get, api),
            ...createUISlice(set, get, api)
        }),
        {
            name: 'exam-storage-tauri-v1',
            version: 2,
            migrate: (persistedState, version) => {
                if (!persistedState || typeof persistedState !== 'object') {
                    return persistedState;
                }

                if (version < 2) {
                    const nextState = { ...persistedState };
                    delete nextState.role;
                    return nextState;
                }

                return persistedState;
            },
            partialize: (state) => ({
                // Sadece UI state'ini ve ayarları persist et
                // Büyük verileri (ogrenciler, yerlestirmeSonucu) SQLite yönetiyor
                aktifTab: state.aktifTab,
                ayarlar: state.ayarlar
            })
        }
    )
);
