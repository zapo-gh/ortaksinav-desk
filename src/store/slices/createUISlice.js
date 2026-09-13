export const createUISlice = (set, get) => ({
    ayarlar: {
        okulAdi: '',
        egitimYili: '',
        donem: '1',
        sinavDonemi: '1',
        sinavTarihi: '',
        sinavSaati: '',
        kisitlar: {
            cinsiyetKisiti: true,
            sinifSeviyesiKisiti: true,
            arkaArkaSinifKisiti: true
        }
    },
    aktifTab: 'ayarlar',
    yukleme: false,
    yuklemeMesaji: null,
    hata: null,
    role: 'public',
    authUser: null,

    updateAyarlar: (yeniAyarlar) => {
        const { ayarlar } = get();
        const updatedAyarlar = { ...ayarlar, ...yeniAyarlar };
        set({ ayarlar: updatedAyarlar });
    },

    setAktifTab: (aktifTab) => {
        set({ aktifTab });
    },

    startLoading: (mesaj = 'İşlem yapılıyor...') => set({ yukleme: true, yuklemeMesaji: mesaj, hata: null }),
    stopLoading: () => set({ yukleme: false, yuklemeMesaji: null }),
    setHata: (hata) => set({ hata, yukleme: false }),
    clearHata: () => set({ hata: null }),
    setRole: (role) => set({ role }),
    setAuthUser: (authUser) => set({ authUser }),

    resetStore: () => set({
        ogrenciler: [],
        seciliOgrenciler: [],
        siniflar: [],
        seciliSinif: null,
        salonlar: [],
        ayarlar: {
            okulAdi: '',
            egitimYili: '',
            donem: '1',
            sinavDonemi: '1',
            sinavTarihi: '',
            sinavSaati: '',
            kisitlar: {
                cinsiyetKisiti: true,
                sinifSeviyesiKisiti: true,
                arkaArkaSinifKisiti: true
            }
        },
        yerlestirmeSonucu: null,
        placementIndex: {},
        aktifTab: 'ayarlar',
        yukleme: false,
        yuklemeMesaji: null,
        hata: null,
        role: 'public',
        authUser: null
    })
});
