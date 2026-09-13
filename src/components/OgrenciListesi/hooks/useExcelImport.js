import { useState } from 'react';
import logger from '../../../utils/logger';
import { useNotifications } from '../../NotificationSystem';

export const useExcelImport = (
  ogrenciler,
  ogrencilerYukle,
  yerlesimPlaniVarMi,
  readOnly,
  setBekleyenOgrenciler,
  setDialogAcik
) => {
  const { showSuccess, showError } = useNotifications();
  const [yukleme, setYukleme] = useState(false);

  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (readOnly) {
      showError('Excel ile öğrenci yüklemek için yönetici olarak giriş yapmalısınız.');
      event.target.value = '';
      return;
    }

    const mevcutOgrenciSayisi = Array.isArray(ogrenciler) ? ogrenciler.length : 0;
    if (mevcutOgrenciSayisi > 0) {
      logger.warn('⚠️ Mevcut öğrenci listesi tespit edildi:', mevcutOgrenciSayisi, 'öğrenci');
      showError(`Mevcut bir öğrenci listesi bulunmaktadır (${mevcutOgrenciSayisi} öğrenci). Yeni liste yüklemek için önce mevcut listeyi temizlemeniz gerekmektedir.`);
      event.target.value = '';
      return;
    }

    setYukleme(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const ogrenciGruplari = [];
        let mevcutSinif = '9-A';
        let sonTCSatiri = -1;
        let sutunBasliklari = {};

        logger.debug('Excel dosyası analiz ediliyor...');
        logger.debug('Toplam satır sayısı:', jsonData.length);

        const sutunBasliklariniTespitEt = () => {
          for (let satir = 1; satir < Math.min(5, jsonData.length); satir++) {
            const row = jsonData[satir];
            if (!row) continue;
            for (let sutun = 0; sutun < row.length; sutun++) {
              const cell = row[sutun];
              if (cell && cell.toString().trim()) {
                const cellValue = cell.toString().trim().toLowerCase();
                if ((cellValue.includes('öğrenci no') || cellValue.includes('numara')) && !cellValue.includes('s.no')) {
                  sutunBasliklari.numara = sutun;
                } else if (cellValue.includes('adı') && !cellValue.includes('soyadı')) {
                  sutunBasliklari.adi = sutun;
                } else if (cellValue.includes('soyadı') || cellValue.includes('soyad')) {
                  sutunBasliklari.soyadi = sutun;
                } else if (cellValue.includes('cinsiyet')) {
                  sutunBasliklari.cinsiyet = sutun;
                }
              }
            }
            if (sutunBasliklari.numara !== undefined && sutunBasliklari.adi !== undefined) {
              break;
            }
          }
          return sutunBasliklari;
        };

        sutunBasliklariniTespitEt();

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row[0] && row[0].toString().includes('T.C.')) {
            const baslik = row[0].toString();
            let sinifBilgisi = null;
            let sinifMatch = baslik.match(/(\d+)\.\s*Sınıf\s*\/\s*(\w+)\s*Şubesi/);
            if (sinifMatch) sinifBilgisi = `${sinifMatch[1]}-${sinifMatch[2]}`;
            if (!sinifBilgisi) {
              sinifMatch = baslik.match(/(\d+)\.\s*Sınıf\s+(\w+)\s+Şubesi/);
              if (sinifMatch) sinifBilgisi = `${sinifMatch[1]}-${sinifMatch[2]}`;
            }
            if (!sinifBilgisi) {
              sinifMatch = baslik.match(/(\d+)\/(\w+)\s*Şubesi/);
              if (sinifMatch) sinifBilgisi = `${sinifMatch[1]}-${sinifMatch[2]}`;
            }
            if (!sinifBilgisi) {
              sinifMatch = baslik.match(/(\d+)-(\w+)/);
              if (sinifMatch) sinifBilgisi = `${sinifMatch[1]}-${sinifMatch[2]}`;
            }
            if (sinifBilgisi) {
              if (sonTCSatiri >= 0) {
                ogrenciGruplari.push({
                  sinif: mevcutSinif,
                  baslangicSatir: sonTCSatiri + 4,
                  bitisSatir: i - 1
                });
              }
              mevcutSinif = sinifBilgisi;
              sonTCSatiri = i;
            }
          }
        }

        if (sonTCSatiri >= 0) {
          ogrenciGruplari.push({
            sinif: mevcutSinif,
            baslangicSatir: sonTCSatiri + 4,
            bitisSatir: jsonData.length - 1
          });
        }

        const yeniOgrenciler = [];
        const mevcutMaksimumId = ogrenciler.reduce((max, o) => {
          const numericId = typeof o?.id === 'number' ? o.id : parseInt(o?.id, 10);
          return Number.isFinite(numericId) && numericId > max ? numericId : max;
        }, 0);

        ogrenciGruplari.forEach((grup, grupIndex) => {
          const grupVerileri = jsonData.slice(grup.baslangicSatir, grup.bitisSatir + 1);
          let reddedilenSatirSayisi = 0;
          const grupOgrencileri = grupVerileri.filter((row, rowIndex) => {
            if (!row || row.length < 3) return false;
            const numara = sutunBasliklari.numara !== undefined ? row[sutunBasliklari.numara] : row[1];
            const ad = sutunBasliklari.adi !== undefined ? row[sutunBasliklari.adi] : row[2];
            if (!numara || !ad) return false;
            const numaraStr = numara.toString().trim();
            const adStr = ad.toString().trim();
            if (adStr.includes('Sınıf') || adStr.includes('Şubesi') || (adStr.includes('Öğrenci') && adStr.includes('No')) || adStr.includes('Numara') || adStr.includes('Adı') || adStr.includes('Soyadı') || adStr.includes('Toplam') || adStr.includes('Özet') || adStr.includes('S.No') || adStr.includes('Cinsiyet')) return false;
            const numaraValid = !isNaN(numaraStr) && numaraStr.length >= 1 && numaraStr.length <= 10 && numaraStr.trim() !== '';
            const adValid = adStr.match(/[a-zA-ZçğıöşüÇĞIİÖŞÜ]/) && adStr.length >= 2;
            if (numaraValid && adValid) return true;
            reddedilenSatirSayisi++;
            return false;
          });

          const islenmisOgrenciler = grupOgrencileri.map((row, index) => {
            let ogrenciNo = '';
            let adi = '';
            let soyadi = '';
            let cinsiyet = '';

            if (sutunBasliklari.numara !== undefined && row[sutunBasliklari.numara]) ogrenciNo = row[sutunBasliklari.numara].toString().trim();
            if (sutunBasliklari.adi !== undefined && row[sutunBasliklari.adi]) adi = row[sutunBasliklari.adi].toString().trim();
            if (sutunBasliklari.soyadi !== undefined && row[sutunBasliklari.soyadi]) soyadi = row[sutunBasliklari.soyadi].toString().trim();
            if (sutunBasliklari.cinsiyet !== undefined && row[sutunBasliklari.cinsiyet]) {
              const cinsiyetValue = row[sutunBasliklari.cinsiyet].toString().trim().toLowerCase();
              if (['k', 'kız', 'kadın', 'kadin', 'bayan'].includes(cinsiyetValue)) cinsiyet = 'K';
              else if (['e', 'erkek', 'bay'].includes(cinsiyetValue)) cinsiyet = 'E';
            }

            if (!ogrenciNo || !adi) {
              if (row.length > 11) {
                if (!ogrenciNo && row[1] && !isNaN(row[1].toString().trim())) {
                  const numaraStr = row[1].toString().trim();
                  if (numaraStr.length >= 1 && numaraStr.length <= 10) ogrenciNo = numaraStr;
                }
                if (!adi && row[3] && row[3].toString().trim()) adi = row[3].toString().trim();
                if (!soyadi && row[7] && row[7].toString().trim()) soyadi = row[7].toString().trim();
                if (!cinsiyet && row[11] && row[11].toString().trim()) {
                  const cinsiyetValue = row[11].toString().trim().toLowerCase();
                  if (['k', 'kız', 'kadın', 'kadin', 'bayan'].includes(cinsiyetValue)) cinsiyet = 'K';
                  else if (['e', 'erkek', 'bay'].includes(cinsiyetValue)) cinsiyet = 'E';
                }
              }

              if (!ogrenciNo || !adi) {
                for (let i = 0; i < row.length; i++) {
                  const cell = row[i];
                  if (cell && cell.toString().trim()) {
                    const cellValue = cell.toString().trim();
                    if (!ogrenciNo && !isNaN(cellValue) && cellValue.length >= 1 && cellValue.length <= 10) ogrenciNo = cellValue;
                    else if (cellValue.match(/[a-zA-ZçğıöşüÇĞIİÖŞÜ]/) && cellValue.length >= 2 && cellValue.length <= 30) {
                      if (cellValue.match(/^[a-zA-ZçğıöşüÇĞIİÖŞÜ\s]+$/)) {
                        if (!adi) adi = cellValue;
                        else if (!soyadi) soyadi = cellValue;
                      }
                    } else if (!cinsiyet && ['k', 'e', 'kız', 'erkek', 'kadın', 'kadin', 'bay', 'bayan'].includes(cellValue.toLowerCase())) {
                      const cv = cellValue.toLowerCase();
                      if (['k', 'kız', 'kadın', 'kadin', 'bayan'].includes(cv)) cinsiyet = 'K';
                      else if (['e', 'erkek', 'bay'].includes(cv)) cinsiyet = 'E';
                    }
                  }
                }
              }
            }

            return {
              id: mevcutMaksimumId + yeniOgrenciler.length + index + 1,
              ad: adi,
              soyad: soyadi || '',
              numara: ogrenciNo,
              sinif: grup.sinif,
              cinsiyet: cinsiyet || 'E',
              gecmisSkor: Math.floor(Math.random() * 40) + 60,
              ozelDurum: false
            };
          });

          const gecerliOgrenciler = islenmisOgrenciler.filter(ogrenci => ogrenci.ad && ogrenci.numara);
          yeniOgrenciler.push(...gecerliOgrenciler);
        });

        if (yeniOgrenciler.length === 0) {
          setYukleme(false);
          const tespitEdilenSiniflar = ogrenciGruplari.map(g => g.sinif).join(', ');
          showError(`❌ Excel dosyasında öğrenci verisi bulunamadı!
🔍 Analiz Sonucu:
• Tespit edilen sınıf sayısı: ${ogrenciGruplari.length}
• Tespit edilen sınıflar: ${tespitEdilenSiniflar || 'Hiçbiri'}
• Toplam Excel satır sayısı: ${jsonData.length}
• Tespit edilen sütun başlıkları: ${Object.keys(sutunBasliklari).length > 0 ? Object.keys(sutunBasliklari).join(', ') : 'Hiçbiri'}`);
          return;
        }

        const onikinciSinifOgrenciler = yeniOgrenciler.filter(ogrenci => ogrenci.sinif.startsWith('12-'));
        if (onikinciSinifOgrenciler.length > 0) {
          setBekleyenOgrenciler(yeniOgrenciler);
          setDialogAcik(true);
          setYukleme(false);
        } else {
          if (yerlesimPlaniVarMi) {
            showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
            setYukleme(false);
            return;
          }
          try {
            const updatedList = [...ogrenciler, ...yeniOgrenciler];
            await ogrencilerYukle(updatedList);
            setYukleme(false);
            showSuccess(`✅ ${yeniOgrenciler.length} öğrenci başarıyla yüklendi!`);
          } catch (error) {
            setYukleme(false);
            showError(`Öğrenciler yüklenirken hata: ${error.message}`);
          }
        }
      } catch (error) {
        logger.error('❌ Excel dosyası işlenirken hata:', error);
        showError('Excel dosyası işlenirken hata oluştu: ' + error.message);
        setYukleme(false);
      }
    };

    reader.onerror = () => {
      logger.error('❌ Excel dosyası okuma hatası');
      showError('Dosya okunurken bir hata oluştu. Lütfen dosyanızın bozuk veya şifreli olmadığından emin olun.');
      setYukleme(false);
    };

    reader.readAsArrayBuffer(file);
  };

  return { handleExcelUpload, yukleme, setYukleme };
};
