import { useState } from 'react';
import logger from '../../../utils/logger';
import { useNotifications } from '../../NotificationSystem';
import { turkishNormalize, normalizeGender } from '../../../utils/turkishUtils';

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
    if (mevcutOgrenciSayisi > 0 && yerlesimPlaniVarMi) {
      logger.warn('⚠️ Mevcut yerleşim planı varken öğrenci ekleme engellendi');
      showError(`Mevcut bir sınav yerleşim planı bulunmaktadır. Yeni öğrenci eklemek için önce planı temizlemeniz veya arşivlemeniz gerekmektedir.`);
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

        const yeniOgrenciler = [];
        let cinsiyetSutunuBulundu = false;

        const mevcutMaksimumId = ogrenciler.reduce((max, o) => {
          const numericId = typeof o?.id === 'number' ? o.id : parseInt(o?.id, 10);
          return Number.isFinite(numericId) && numericId > max ? numericId : max;
        }, 0);

        // Sayfa adından sınıf çıkarma yardımcısı (Örn: "9-A", "9A", "10/B", "11-C Sınıfı")
        const parseSinifAdi = (text) => {
          if (!text) return null;
          const str = text.toString().trim();
          let m = str.match(/(\d+)\s*[-/._\s]?\s*([a-zA-ZğüşıöçĞÜŞİÖÇ]+)/);
          if (m && parseInt(m[1], 10) >= 5 && parseInt(m[1], 10) <= 12) {
            return `${m[1]}-${m[2].toLocaleUpperCase('tr-TR').trim()}`;
          }
          return null;
        };

        // Tüm çalışma sayfalarını (sheets) sırayla tara
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (!jsonData || jsonData.length === 0) continue;

          logger.debug(`[Excel Import] Sayfa "${sheetName}" taranıyor, satır sayısı:`, jsonData.length);

          const sheetDefaultSinif = parseSinifAdi(sheetName);

          // Sütun başlıklarını tespit et
          const sutunBasliklari = {};
          let baslikSatirIndex = -1;

          for (let satir = 0; satir < Math.min(15, jsonData.length); satir++) {
            const row = jsonData[satir];
            if (!row || !Array.isArray(row)) continue;

            for (let sutun = 0; sutun < row.length; sutun++) {
              const cell = row[sutun];
              if (!cell) continue;
              const cellNorm = turkishNormalize(cell.toString());

              if (!sutunBasliklari.numara && ((cellNorm.includes('ogrenci no') || cellNorm.includes('okul no') || cellNorm.includes('numara') || cellNorm === 'no' || cellNorm === 'ogr no') && !cellNorm.includes('sno') && !cellNorm.includes('sira no'))) {
                sutunBasliklari.numara = sutun;
              } else if (!sutunBasliklari.adi && (cellNorm === 'adi' || cellNorm === 'ad' || cellNorm === 'isim' || cellNorm.includes('ogrenci adi') || cellNorm.includes('ogrencinin adi')) && !cellNorm.includes('soyad')) {
                sutunBasliklari.adi = sutun;
              } else if (!sutunBasliklari.tamAd && (cellNorm.includes('ad soyad') || cellNorm.includes('adi soyadi') || cellNorm === 'ogrenci' || cellNorm === 'ogrencinin ad soyadi')) {
                sutunBasliklari.tamAd = sutun;
              } else if (!sutunBasliklari.soyadi && (cellNorm === 'soyadi' || cellNorm === 'soyad' || cellNorm === 'soyisim' || cellNorm.includes('ogrenci soyadi'))) {
                sutunBasliklari.soyadi = sutun;
              } else if (!sutunBasliklari.cinsiyet && (cellNorm.includes('cinsiyet') || cellNorm === 'cins')) {
                sutunBasliklari.cinsiyet = sutun;
                cinsiyetSutunuBulundu = true;
              } else if (!sutunBasliklari.sinif && (cellNorm.includes('sinif') || cellNorm.includes('sube'))) {
                sutunBasliklari.sinif = sutun;
              }
            }

            if ((sutunBasliklari.numara !== undefined || sutunBasliklari.adi !== undefined || sutunBasliklari.tamAd !== undefined)) {
              baslikSatirIndex = satir;
              if (sutunBasliklari.numara !== undefined && (sutunBasliklari.adi !== undefined || sutunBasliklari.tamAd !== undefined)) {
                break;
              }
            }
          }

          // Format 1: e-Okul tarzı T.C. bloklu başlıklar
          const eOkulGruplari = [];
          let eOkulMevcutSinif = sheetDefaultSinif || '9-A';
          let sonTCSatiri = -1;

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
                  eOkulGruplari.push({
                    sinif: eOkulMevcutSinif,
                    baslangicSatir: sonTCSatiri + 4,
                    bitisSatir: i - 1
                  });
                }
                eOkulMevcutSinif = sinifBilgisi;
                sonTCSatiri = i;
              }
            }
          }

          if (sonTCSatiri >= 0) {
            eOkulGruplari.push({
              sinif: eOkulMevcutSinif,
              baslangicSatir: sonTCSatiri + 4,
              bitisSatir: jsonData.length - 1
            });
          }

          // Eğer e-Okul blokları bulunduysa bu bloklardan oku
          if (eOkulGruplari.length > 0) {
            eOkulGruplari.forEach((grup) => {
              const grupVerileri = jsonData.slice(grup.baslangicSatir, grup.bitisSatir + 1);
              grupVerileri.forEach((row) => {
                if (!row || row.length < 2) return;
                const numaraRaw = sutunBasliklari.numara !== undefined ? row[sutunBasliklari.numara] : row[1];
                let adRaw = sutunBasliklari.adi !== undefined ? row[sutunBasliklari.adi] : (sutunBasliklari.tamAd !== undefined ? row[sutunBasliklari.tamAd] : row[2]);
                let soyadRaw = sutunBasliklari.soyadi !== undefined ? row[sutunBasliklari.soyadi] : '';

                if (!numaraRaw || !adRaw) return;

                const numaraStr = numaraRaw.toString().trim();
                let adStr = adRaw.toString().trim();
                let soyadStr = soyadRaw ? soyadRaw.toString().trim() : '';

                if (adStr.includes('Sınıf') || adStr.includes('Şubesi') || adStr.includes('Toplam') || adStr.includes('Öğrenci')) return;
                if (isNaN(numaraStr) || numaraStr.length < 1 || numaraStr.length > 10) return;
                if (!adStr.match(/[a-zA-ZçğıöşüÇĞIİÖŞÜ]/) || adStr.length < 2) return;

                let cinsiyet = '';
                if (sutunBasliklari.cinsiyet !== undefined && row[sutunBasliklari.cinsiyet]) {
                  const detected = normalizeGender(row[sutunBasliklari.cinsiyet]);
                  if (detected) cinsiyet = detected;
                }

                // Sadece tamAd varsa ad ve soyadı ayır
                if (!soyadStr && sutunBasliklari.tamAd !== undefined) {
                  const parts = adStr.split(/\s+/);
                  if (parts.length > 1) {
                    soyadStr = parts.pop();
                    adStr = parts.join(' ');
                  }
                }

                yeniOgrenciler.push({
                  id: mevcutMaksimumId + yeniOgrenciler.length + 1,
                  ad: adStr,
                  soyad: soyadStr,
                  numara: numaraStr,
                  sinif: grup.sinif,
                  cinsiyet: cinsiyet || 'E',
                  gecmisSkor: 75,
                  ozelDurum: false
                });
              });
            });
          } else {
            // Format 2: Standart tablo formatı (e-Okul T.C. başlığı olmayan düz listeler)
            const baslangic = baslikSatirIndex >= 0 ? baslikSatirIndex + 1 : 0;
            let currentSinif = sheetDefaultSinif || '9-A';

            for (let i = baslangic; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (!row || !Array.isArray(row) || row.length === 0) continue;

              // Satır bir sınıf başlığı satırı mı kontrol et (Örn: "9-A Sınıfı")
              const firstCell = row[0] ? row[0].toString().trim() : '';
              const parsedInlineSinif = parseSinifAdi(firstCell);
              if (parsedInlineSinif && row.filter(c => c !== undefined && c !== '').length <= 2) {
                currentSinif = parsedInlineSinif;
                continue;
              }

              // Sınıf sütunu varsa o satırdaki sınıfı al
              let rowSinif = currentSinif;
              if (sutunBasliklari.sinif !== undefined && row[sutunBasliklari.sinif]) {
                const sVal = parseSinifAdi(row[sutunBasliklari.sinif].toString());
                if (sVal) rowSinif = sVal;
              }

              // Numara ve Ad bul
              let numaraRaw = sutunBasliklari.numara !== undefined ? row[sutunBasliklari.numara] : null;
              let adRaw = sutunBasliklari.adi !== undefined ? row[sutunBasliklari.adi] : (sutunBasliklari.tamAd !== undefined ? row[sutunBasliklari.tamAd] : null);
              let soyadRaw = sutunBasliklari.soyadi !== undefined ? row[sutunBasliklari.soyadi] : '';

              // Başlık eşleşmediyse hücre tiplerine göre sezgisel tespit yap
              if (!numaraRaw || !adRaw) {
                for (let c = 0; c < row.length; c++) {
                  const val = row[c] ? row[c].toString().trim() : '';
                  if (!val) continue;

                  if (!numaraRaw && !isNaN(val) && val.length >= 1 && val.length <= 10 && parseInt(val, 10) > 0) {
                    numaraRaw = val;
                  } else if (!adRaw && val.match(/^[a-zA-ZçğıöşüÇĞIİÖŞÜ\s]{2,40}$/) && !val.includes('Sınıf') && !val.includes('Şube')) {
                    adRaw = val;
                  }
                }
              }

              if (!numaraRaw || !adRaw) continue;

              const numaraStr = numaraRaw.toString().trim();
              let adStr = adRaw.toString().trim();
              let soyadStr = soyadRaw ? soyadRaw.toString().trim() : '';

              if (adStr.toLowerCase().includes('toplam') || adStr.toLowerCase().includes('özet') || adStr.toLowerCase().includes('öğrenci no')) continue;
              if (isNaN(numaraStr) || numaraStr.length < 1 || numaraStr.length > 10) continue;

              // Ad Soyad tek sütundaysa ayır
              if (!soyadStr && (sutunBasliklari.tamAd !== undefined || !sutunBasliklari.soyadi)) {
                const parts = adStr.split(/\s+/);
                if (parts.length > 1) {
                  soyadStr = parts.pop();
                  adStr = parts.join(' ');
                }
              }

              let cinsiyet = '';
              if (sutunBasliklari.cinsiyet !== undefined && row[sutunBasliklari.cinsiyet]) {
                const detected = normalizeGender(row[sutunBasliklari.cinsiyet]);
                if (detected) cinsiyet = detected;
              }

              yeniOgrenciler.push({
                id: mevcutMaksimumId + yeniOgrenciler.length + 1,
                ad: adStr,
                soyad: soyadStr,
                numara: numaraStr,
                sinif: rowSinif,
                cinsiyet: cinsiyet || 'E',
                gecmisSkor: 75,
                ozelDurum: false
              });
            }
          }
        }

        if (yeniOgrenciler.length === 0) {
          setYukleme(false);
          showError(`❌ Excel dosyasında öğrenci verisi bulunamadı! Lütfen dosyanızda 'Öğrenci No / Numara' ve 'Ad / Soyad' sütunlarının bulunduğundan emin olun.`);
          return;
        }

        if (!cinsiyetSutunuBulundu) {
          logger.warn('⚠️ Excel dosyasında cinsiyet sütunu tespit edilemedi, varsayılan cinsiyet atandı.');
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
            const mevcutNumaralar = new Set((ogrenciler || []).map(o => String(o.numara)));
            const eklenenOgrenciler = yeniOgrenciler.filter(o => !mevcutNumaralar.has(String(o.numara)));
            const atlananSayisi = yeniOgrenciler.length - eklenenOgrenciler.length;

            const updatedList = [...(ogrenciler || []), ...eklenenOgrenciler];
            await ogrencilerYukle(updatedList);
            setYukleme(false);

            if (atlananSayisi > 0) {
              showSuccess(`✅ ${eklenenOgrenciler.length} yeni öğrenci eklendi (${atlananSayisi} mükerrer numara atlandı). Toplam: ${updatedList.length} öğrenci.`);
            } else {
              showSuccess(`✅ ${eklenenOgrenciler.length} öğrenci başarıyla yüklendi! Toplam: ${updatedList.length} öğrenci.`);
            }
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
