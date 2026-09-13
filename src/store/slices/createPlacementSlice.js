import { normalizeSalonList } from '../../utils/contextHelpers';
import logger from '../../utils/logger';

const buildPlacementIndex = (yerlestirme) => {
    const index = {};
    if (!yerlestirme) return index;
    try {
        const tumSalonlar = yerlestirme.tumSalonlar;
        if (Array.isArray(tumSalonlar)) {
            tumSalonlar.forEach(salon => {
                const salonAdi = salon.salonAdi || salon.ad || String(salon.id || salon.salonId || '');
                const masalar = Array.isArray(salon.masalar) ? salon.masalar : [];
                masalar.forEach(m => {
                    if (m?.ogrenci?.id) {
                        const masaNo = m.masaNumarasi != null ? m.masaNumarasi : (typeof m.id === 'number' ? m.id + 1 : null);
                        index[m.ogrenci.id] = { salonId: salon.id || salon.salonId, salonAdi, masaNo };
                    }
                });
            });
        }
    } catch (e) {
        logger.debug('build placement index error:', e);
    }
    return index;
};

export const createPlacementSlice = (set, get) => ({
    yerlestirmeSonucu: null,
    placementIndex: {},

    setYerlestirmeSonucu: (sonuc) => {
        let yerlestirmeSonucuWithSalon = sonuc;
        if (!yerlestirmeSonucuWithSalon.salon && yerlestirmeSonucuWithSalon.tumSalonlar?.length > 0) {
            yerlestirmeSonucuWithSalon = {
                ...yerlestirmeSonucuWithSalon,
                salon: yerlestirmeSonucuWithSalon.tumSalonlar[0]
            };
        }

        const updatedPlacementIndex = buildPlacementIndex(yerlestirmeSonucuWithSalon);
        set({
            yerlestirmeSonucu: yerlestirmeSonucuWithSalon,
            placementIndex: updatedPlacementIndex,
            yukleme: false
        });
    },

    updateYerlestirmeSonucu: (incoming) => {
        const { yerlestirmeSonucu } = get();
        const incomingData = incoming || {};
        const normalizedTumSalonlar = incomingData.tumSalonlar
            ? normalizeSalonList(incomingData.tumSalonlar)
            : yerlestirmeSonucu?.tumSalonlar;

        const merged = {
            ...(yerlestirmeSonucu || {}),
            ...incomingData,
            tumSalonlar: normalizedTumSalonlar
        };

        const updatedPlacementIndex = buildPlacementIndex(merged);
        set({
            yerlestirmeSonucu: merged,
            placementIndex: updatedPlacementIndex,
            yukleme: false
        });
    },

    clearYerlestirme: () => {
        set({ yerlestirmeSonucu: null, placementIndex: {} });
    }
});
