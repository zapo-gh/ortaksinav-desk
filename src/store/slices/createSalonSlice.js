export const createSalonSlice = (set, get) => ({
    siniflar: [],
    seciliSinif: null,
    salonlar: [],

    setSiniflar: (siniflar) => set({ siniflar, yukleme: false }),
    
    setSeciliSinif: (seciliSinif) => set({ seciliSinif }),

    setSalonlar: (salonlar) => {
        set({ salonlar });
    },

    addSalon: (salon) => {
        const { salonlar } = get();
        const updatedSalonlar = [...salonlar, salon];
        set({ salonlar: updatedSalonlar });
    },

    deleteSalon: (salonId) => {
        const { salonlar } = get();
        const updatedSalonlar = salonlar.filter(salon => salon.id !== salonId);
        set({ salonlar: updatedSalonlar });
    }
});
