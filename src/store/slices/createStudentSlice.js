const sortOgrencilerBySinifVeNumara = (a, b) => {
    const parseSinif = (sinif) => {
        if (!sinif) return { numara: 0, sube: '' };
        const match = sinif.toString().match(/^(\d+)[-/]?([A-Za-z]+)?/);
        if (match) {
            return {
                numara: parseInt(match[1]) || 0,
                sube: (match[2] || '').toUpperCase()
            };
        }
        return { numara: 0, sube: sinif.toString().toUpperCase() };
    };

    const sinifA = parseSinif(a.sinif);
    const sinifB = parseSinif(b.sinif);

    if (sinifA.numara !== sinifB.numara) return sinifA.numara - sinifB.numara;
    if (sinifA.sube !== sinifB.sube) return sinifA.sube.localeCompare(sinifB.sube, 'tr-TR');

    const numaraA = parseInt(a.numara) || 0;
    const numaraB = parseInt(b.numara) || 0;
    return numaraA - numaraB;
};

export const createStudentSlice = (set, get) => ({
    ogrenciler: [],
    seciliOgrenciler: [],

    setOgrenciler: (ogrenciler) => {
        set({ ogrenciler, yukleme: false });
    },

    addOgrenciler: (yeniOgrenciler) => {
        const { ogrenciler } = get();
        const tumOgrenciler = ogrenciler.concat(yeniOgrenciler);
        tumOgrenciler.sort(sortOgrencilerBySinifVeNumara);
        set({ ogrenciler: tumOgrenciler, yukleme: false });
    },

    toggleOgrenciSec: (ogrenci) => {
        const { seciliOgrenciler } = get();
        const mevcutSecili = seciliOgrenciler.find(o => o.id === ogrenci.id);
        set({
            seciliOgrenciler: mevcutSecili
                ? seciliOgrenciler.filter(o => o.id !== ogrenci.id)
                : [...seciliOgrenciler, ogrenci]
        });
    },

    clearSeciliOgrenciler: () => set({ seciliOgrenciler: [] }),

    deleteOgrenci: (ogrenciId) => {
        const { ogrenciler, yerlestirmeSonucu, placementIndex } = get();
        let updatedYerlestirmeSonucu = yerlestirmeSonucu;
        let updatedPlacementIndex = { ...placementIndex };

        if (updatedYerlestirmeSonucu && updatedYerlestirmeSonucu.isArchived !== true) {
            const updatedTumSalonlar = (updatedYerlestirmeSonucu.tumSalonlar || []).map(salon => {
                let salonMasalarDegisti = false;
                const updatedMasalar = (salon.masalar || []).map(masa => {
                    if (masa.ogrenci && masa.ogrenci.id === ogrenciId) {
                        salonMasalarDegisti = true;
                        return { ...masa, ogrenci: null };
                    }
                    return masa;
                });

                if (salonMasalarDegisti) {
                    return {
                        ...salon,
                        masalar: updatedMasalar,
                        ogrenciler: updatedMasalar
                            .filter(m => m.ogrenci)
                            .map(m => ({ ...m.ogrenci, masaNumarasi: m.masaNumarasi }))
                    };
                }
                return salon;
            });

            const updatedYerlesilemeyenOgrenciler = (updatedYerlestirmeSonucu.yerlesilemeyenOgrenciler || [])
                .filter(o => o.id !== ogrenciId);

            const updatedSalon = updatedTumSalonlar.find(s =>
                (s.id === updatedYerlestirmeSonucu.salon?.id || s.salonId === updatedYerlestirmeSonucu.salon?.salonId)
            ) || updatedYerlestirmeSonucu.salon;

            const wasPlaced = !!placementIndex[ogrenciId];
            const wasUnplaced = (updatedYerlestirmeSonucu.yerlesilemeyenOgrenciler || []).length < (yerlestirmeSonucu?.yerlesilemeyenOgrenciler || []).length;

            const mevcutIstatistikler = updatedYerlestirmeSonucu.istatistikler || {};
            const updatedIstatistikler = {
                ...mevcutIstatistikler,
                toplamOgrenci: Math.max(0, (mevcutIstatistikler.toplamOgrenci || 0) - 1),
                yerlesenOgrenci: wasPlaced ? Math.max(0, (mevcutIstatistikler.yerlesenOgrenci || 0) - 1) : (mevcutIstatistikler.yerlesenOgrenci || 0),
                yerlesemeyenOgrenci: wasUnplaced ? Math.max(0, (mevcutIstatistikler.yerlesemeyenOgrenci || 0) - 1) : (mevcutIstatistikler.yerlesemeyenOgrenci || 0)
            };

            updatedYerlestirmeSonucu = {
                ...updatedYerlestirmeSonucu,
                salon: updatedSalon,
                tumSalonlar: updatedTumSalonlar,
                yerlesilemeyenOgrenciler: updatedYerlesilemeyenOgrenciler,
                istatistikler: updatedIstatistikler
            };

            delete updatedPlacementIndex[ogrenciId];
        }

        const updatedOgrenciler = ogrenciler.filter(o => o.id !== ogrenciId);
        set({
            ogrenciler: updatedOgrenciler,
            yerlestirmeSonucu: updatedYerlestirmeSonucu,
            placementIndex: updatedPlacementIndex
        });
    },

    clearOgrenciler: () => {
        set({ ogrenciler: [] });
    },

    pinOgrenci: (ogrenciId, pinnedSalonId, pinnedMasaId) => {
        const { ogrenciler } = get();
        const normalizedTargetId = ogrenciId != null ? String(ogrenciId) : null;
        const normalizedSalonId = pinnedSalonId != null ? String(pinnedSalonId) : null;
        const normalizedMasaId = pinnedMasaId != null ? String(pinnedMasaId) : null;
        const updatedOgrenciler = ogrenciler.map(o => {
            const matchesById = o?.id != null && String(o.id) === normalizedTargetId;
            const matchesByNumara = o?.numara != null && String(o.numara) === normalizedTargetId;
            const isMatch = normalizedTargetId != null && (matchesById || matchesByNumara);
            if (isMatch) {
                return {
                    ...o,
                    pinned: true,
                    pinnedSalonId: normalizedSalonId,
                    pinnedMasaId: normalizedMasaId
                };
            }
            const occupiesSameSeat = normalizedMasaId != null && o?.pinned &&
                String(o.pinnedSalonId) === normalizedSalonId &&
                String(o.pinnedMasaId) === normalizedMasaId;
            if (occupiesSameSeat) {
                return { ...o, pinned: false, pinnedSalonId: null, pinnedMasaId: null };
            }
            return o;
        });
        set({ ogrenciler: updatedOgrenciler });
    },

    unpinOgrenci: (ogrenciId) => {
        const { ogrenciler } = get();
        const normalizedTargetId = ogrenciId != null ? String(ogrenciId) : null;
        const updatedOgrenciler = ogrenciler.map(o => {
            const matchesById = o?.id != null && String(o.id) === normalizedTargetId;
            const matchesByNumara = o?.numara != null && String(o.numara) === normalizedTargetId;
            const isMatch = normalizedTargetId != null && (matchesById || matchesByNumara);
            return isMatch ? {
                ...o,
                pinned: false,
                pinnedSalonId: null,
                pinnedMasaId: null
            } : o;
        });
        set({ ogrenciler: updatedOgrenciler });
    }
});
