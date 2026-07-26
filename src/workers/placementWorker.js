/**
 * Web Worker for Placement Algorithm (Ortak Sınav Yerleşim Motoru)
 * Ana JS thread'ini (UI) bloklamadan arka planda yerleştirme hesaplaması yapar.
 */
import { gelismisYerlestirme } from '../algorithms/gelismisYerlestirmeAlgoritmasi';

self.onmessage = (e) => {
  const { type, data, id } = e.data || {};

  if (type === 'START_PLACEMENT') {
    try {
      const { seciliSinifOgrencileri, aktifSalonlar, ayarlar, kisitlar } = data || {};

      if (!seciliSinifOgrencileri || !aktifSalonlar) {
        throw new Error('Eksik dağıtım verisi!');
      }

      const sonuc = gelismisYerlestirme(seciliSinifOgrencileri, aktifSalonlar, ayarlar, kisitlar);

      self.postMessage({
        type: 'PLACEMENT_COMPLETE',
        id,
        sonuc,
      });
    } catch (error) {
      self.postMessage({
        type: 'PLACEMENT_ERROR',
        id,
        error: error.message || String(error),
      });
    }
  }
};
