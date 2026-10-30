import React, { forwardRef } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  GlobalStyles
} from '@mui/material';
import EmptyState from './common/EmptyState';
import PrintHeader from './common/PrintHeader';
import { BorderColor as BorderColorIcon } from '@mui/icons-material';

import { calculateDeskNumberForMasa } from '../utils/placementHelper';

/**
 * Salon İmza Listesi Bileşeni
 * Her salon için masa numarasına göre sıralanmış öğrenci listesi
 * Sınıf, ders ve imza bölümleri içerir
 */
const SalonImzaListesiPrintable = React.memo(forwardRef(({ yerlestirmeSonucu, ayarlar = {}, tumOgrenciler = [] }, ref) => {
  const theme = useTheme();
  // calculateDeskNumberForMasa artık dışarıdan alınıyor (import edildi)
  // Wrapper fonksiyon: Sadece salon parametresini kolaylaştırmak için
  const getMasaNo = (masa) => calculateDeskNumberForMasa(masa, yerlestirmeSonucu?.tumSalonlar);


  // Salon adını seviye (9, 10, 11, 12) ve şube (A, B, C...) olarak ayrıştırır
  const parseSalonAdi = (adi) => {
    if (!adi) return null;
    const match = adi.toString().trim().match(/^(\d+)[-/]?\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)?$/);
    if (!match) return null;
    return {
      seviye: parseInt(match[1], 10),
      sube: (match[2] || '').toUpperCase()
    };
  };

  // Tüm salonları al - salon adına göre (sınıf sırasına uygun) artan sırala
  const tumSalonlar = [...(yerlestirmeSonucu?.tumSalonlar || [])].sort((a, b) => {
    const adiA = (a.salonAdi || a.ad || '').toString().trim();
    const adiB = (b.salonAdi || b.ad || '').toString().trim();
    const parsedA = parseSalonAdi(adiA);
    const parsedB = parseSalonAdi(adiB);

    if (parsedA && parsedB) {
      if (parsedA.seviye !== parsedB.seviye) return parsedA.seviye - parsedB.seviye;
      if (parsedA.sube !== parsedB.sube) return parsedA.sube.localeCompare(parsedB.sube, 'tr-TR');
      return 0;
    }

    // Sınıf formatında değilse salon adını doğal (numeric-aware) sırala
    return adiA.localeCompare(adiB, 'tr-TR', { numeric: true, sensitivity: 'base' });
  });

  if (!tumSalonlar || tumSalonlar.length === 0) {
    return (
      <Box ref={ref} sx={{ p: 2 }}>
        <EmptyState 
          icon={BorderColorIcon} 
          title="Henüz yerleştirme yapılmadı" 
          description="İmza listelerini yazdırabilmek için önce otomatik yerleştirme yapmalısınız." 
        />
      </Box>
    );
  }

  // Salon öğrencilerini masa numarasına göre sırala
  const getSortedStudents = (salon) => {
    if (!salon.ogrenciler || salon.ogrenciler.length === 0) return [];

    return salon.ogrenciler.map(ogrenci => {
      // Öğrencinin masa numarasını bul
      let masaNo = 'Belirtilmemiş';
      if (salon.masalar && Array.isArray(salon.masalar) && salon.masalar.length > 0) {
        const masa = salon.masalar.find(m => m.ogrenci?.id === ogrenci.id);
        if (masa) {
          masaNo = masa.masaNumarasi || calculateDeskNumberForMasa(masa);
        }
      }

      if (masaNo === 'Belirtilmemiş') {
        if (ogrenci.masaNumarasi) {
          masaNo = ogrenci.masaNumarasi;
        } else if (ogrenci.satir !== undefined && ogrenci.sutun !== undefined) {
          const satirSayisi = salon.siraDizilimi?.sutun || salon.sutun || 5;
          masaNo = ogrenci.satir * satirSayisi + ogrenci.sutun + 1;
        } else {
          masaNo = ogrenci.masaNo || ogrenci.koltukNo || 'Belirtilmemiş';
        }
      }

      return {
        ...ogrenci,
        masaNo: parseInt(masaNo) || 999 // Sayısal olmayan değerler için büyük sayı
      };
    }).sort((a, b) => a.masaNo - b.masaNo);
  };

  // Dal ismi kısaltma fonksiyonu
  const getShortBranchName = (branchName) => {
    if (!branchName) return '-';
    switch (branchName) {
      case 'Ebe Yardımcılığı':
        return 'Ebe Yard.';
      case 'Hemşire Yardımcılığı':
        return 'Hemş. Yard.';
      case 'Sağlık Bakım Teknisyenliği':
        return 'Sağ. Bak. Tek.';
      default:
        // Eğer bilinen bir kısaltma yoksa, ilk 15 karakteri göster
        return branchName.length > 15 ? branchName.substring(0, 15) + '.' : branchName;
    }
  };

  return (
    <>
      <GlobalStyles
        styles={{
          '@media print': {
            html: { background: '#ffffff !important' },
            body: { background: '#ffffff !important', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' },
            thead: { display: 'table-header-group !important' },
            tr: { pageBreakInside: 'avoid !important', breakInside: 'avoid !important' }
          },
        }}
      />
      <Box
        ref={ref}
        sx={{
          p: { xs: 2, sm: 3 },
          minHeight: '100vh',
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          backgroundColor: 'white',
          boxSizing: 'border-box',
          '@media print': {
            p: 0,
            m: '0 auto',
            width: '100%',
            maxWidth: '100%',
            backgroundColor: 'white',
            boxSizing: 'border-box'
          }
        }}
      >
        {/* Tüm salonlar için ayrı sayfalar */}
        {
          tumSalonlar.map((salon, salonIndex) => {
            const sortedStudents = getSortedStudents(salon);
            const salonDersi = (ayarlar.dersler && ayarlar.dersler.length > 0)
              ? ayarlar.dersler[0].ad || 'Ortak Sınav'
              : 'Ortak Sınav';
            const salonAdi = salon.salonAdi || salon.ad || `Salon ${salonIndex + 1}`;
            const sinavBasligi = `${salonAdi} - Sınav Yoklama ve İmza Listesi (${salonDersi} - ${ayarlar.donem || '1'}. Dönem ${ayarlar.sinavDonemi || '1'}. Ortak Sınavı)`;

            return (
              <Box
                key={salon.salonId || salonIndex}
                sx={{
                  mb: 1.5,
                  pageBreakBefore: salonIndex > 0 ? 'always' : 'auto',
                  backgroundColor: 'white',
                  boxSizing: 'border-box',
                  '@media print': {
                    pageBreakBefore: salonIndex > 0 ? 'always' : 'auto',
                    breakBefore: salonIndex > 0 ? 'page' : 'auto',
                    boxSizing: 'border-box !important',
                    width: '100% !important',
                    maxWidth: '100% !important',
                    padding: '10mm 14mm 10mm 14mm !important',
                    backgroundColor: 'white'
                  }
                }}
              >
                {/* Salon Başlığı */}
                <PrintHeader 
                  compact={true}
                  schoolName={ayarlar.okulAdi || 'T.C. MİLLİ EĞİTİM BAKANLIĞI'}
                  subTitle={`${ayarlar.egitimYili || '2025-2026'} Eğitim Öğretim Yılı`}
                  documentTitle={sinavBasligi}
                  date={`${ayarlar.sinavTarihi ? new Date(ayarlar.sinavTarihi).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR')} ${ayarlar.sinavSaati ? `- ${ayarlar.sinavSaati}` : ''}`}
                />

                {/* Salon İmza Listesi Tablosu */}
                <TableContainer component={Paper} elevation={0} sx={{
                  mb: 1.5,
                  width: '100%',
                  maxWidth: '100%',
                  margin: '0 auto',
                  backgroundColor: 'white',
                  boxShadow: 'none',
                  borderRadius: '2px',
                  border: '1.5px solid #000',
                  '@media print': {
                    mb: 1,
                    width: '100%',
                    maxWidth: '100%',
                    margin: '0 auto',
                    backgroundColor: 'white',
                    boxShadow: 'none',
                    borderRadius: '2px',
                    border: '1.5px solid #000'
                  }
                }}>
                  <Table size="small" sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    '& .MuiTableCell-root': {
                      padding: '2px 6px',
                      fontSize: '8.5pt',
                      lineHeight: 1.2,
                      border: '1px solid #cbd5e1',
                      textAlign: 'center',
                      color: '#000',
                      fontFamily: '"Times New Roman", Times, serif'
                    },
                    '& .MuiTableHead-root': {
                      display: 'table-header-group !important'
                    },
                    '& .MuiTableHead-root .MuiTableCell-root': {
                      fontSize: '8.5pt',
                      fontWeight: 800,
                      backgroundColor: '#e2e8f0 !important',
                      color: '#000 !important',
                      border: '1.5px solid #000',
                      py: 0.4,
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase'
                    },
                    '& .MuiTableRow-root': {
                      height: '22px',
                      pageBreakInside: 'avoid !important',
                      breakInside: 'avoid !important'
                    },
                    '& .MuiTableRow-root:nth-of-type(even)': {
                      backgroundColor: '#f8fafc'
                    }
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '8%', textAlign: 'center' }}><strong>Masa No</strong></TableCell>
                        <TableCell sx={{ width: '26%', textAlign: 'left', pl: 1.5 }}><strong>Ad Soyad</strong></TableCell>
                        <TableCell sx={{ width: '9%', textAlign: 'center' }}><strong>Sınıf</strong></TableCell>
                        <TableCell sx={{ width: '13%', textAlign: 'center' }}><strong>Dal</strong></TableCell>
                        <TableCell sx={{ width: '24%', textAlign: 'center' }}><strong>Ders</strong></TableCell>
                        <TableCell sx={{ width: '20%', textAlign: 'center' }}><strong>Öğrenci Durumu</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody sx={{ display: 'table-row-group' }}>
                      {sortedStudents.map((ogrenci, index) => {
                      // Öğrencinin sınava gireceği dersi bul
                      let dersBilgisi = '';
                      if (ogrenci.dersler && ogrenci.dersler.length > 0) {
                        dersBilgisi = ogrenci.dersler.join(', ');
                      } else if (ogrenci.sinavDersleri && ogrenci.sinavDersleri.length > 0) {
                        dersBilgisi = ogrenci.sinavDersleri.join(', ');
                      } else if (ogrenci.ders && ogrenci.ders.length > 0) {
                        dersBilgisi = ogrenci.ders.join(', ');
                      } else {
                        const ogrenciSinifi = ogrenci.sinif || ogrenci.sube;
                        if (ogrenciSinifi && ayarlar.dersler && ayarlar.dersler.length > 0) {
                          const ogrenciDersleri = [];
                          ayarlar.dersler.forEach(ders => {
                            if (ders.siniflar && ders.siniflar.includes(ogrenciSinifi)) {
                              ogrenciDersleri.push(ders.ad);
                            }
                          });
                          if (ogrenciDersleri.length > 0) {
                            dersBilgisi = ogrenciDersleri.join(', ');
                          } else {
                            dersBilgisi = 'Ders Yok';
                          }
                        } else {
                          dersBilgisi = 'Ders Yok';
                        }
                      }

                      return (
                        <TableRow key={ogrenci.id || index}>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>
                            {ogrenci.masaNo === 999 ? 'Belirtilmemiş' : ogrenci.masaNo}
                          </TableCell>
                          <TableCell sx={{
                            fontWeight: 700,
                            textAlign: 'left !important',
                            '@media print': {
                              textAlign: 'left !important'
                            }
                          }}>
                            {ogrenci.ad} {ogrenci.soyad}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {ogrenci.sinif || ogrenci.sube || 'Belirtilmemiş'}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {(() => {
                              // Dal bilgisi yoksa güncel listeden bulmaya çalış
                              let dalBilgisi = ogrenci.dal;
                              if (!dalBilgisi && tumOgrenciler && tumOgrenciler.length > 0) {
                                const guncelOgrenci = tumOgrenciler.find(o => o.id === ogrenci.id || o.numara === ogrenci.numara);
                                if (guncelOgrenci) {
                                  dalBilgisi = guncelOgrenci.dal;
                                }
                              }
                              return getShortBranchName(dalBilgisi);
                            })()}
                          </TableCell>

                          <TableCell sx={{
                            textAlign: 'center',
                            fontSize: '0.8rem',
                          }}>
                            {dersBilgisi}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <Box sx={{
                              width: '100%',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: 1.5,
                              fontSize: '0.8rem',
                              fontWeight: 'normal',
                              whiteSpace: 'nowrap'
                            }}>
                              <span>[ &nbsp; ] Geldi</span>
                              <span>[ &nbsp; ] Gelmedi</span>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Salon Özeti ve Öğretmen İmza Bloğu */}
              <Box sx={{ 
                mt: 1, 
                mb: 0.5, 
                p: 1,
                border: '1.5px solid #000',
                borderRadius: '2px',
                backgroundColor: '#ffffff',
                pageBreakInside: 'avoid !important', 
                breakInside: 'avoid !important',
                fontFamily: '"Times New Roman", Times, serif'
              }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 2
                }}>
                  {/* Sol: Özet - Sınıf ve Dal Dağılımı */}
                  <Box sx={{ textAlign: 'left', flex: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 800, mb: 0.5, fontFamily: '"Times New Roman", Times, serif', color: '#000' }}>
                      Toplam Öğrenci: {sortedStudents.length}
                    </Typography>
                    {(() => {
                      // Sınıf seviyesi dağılımını hesapla
                      const sinifSeviyeleri = {};
                      sortedStudents.forEach(ogrenci => {
                        const sinifBilgisi = ogrenci.sinif || ogrenci.sube;
                        if (sinifBilgisi) {
                          const seviye = sinifBilgisi.match(/\d+/)?.[0];
                          if (seviye && ['9', '10', '11', '12'].includes(seviye)) {
                            sinifSeviyeleri[seviye] = (sinifSeviyeleri[seviye] || 0) + 1;
                          }
                        }
                      });
                      const sinifDagilimi = Object.entries(sinifSeviyeleri)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b));
                      return sinifDagilimi.map(([seviye, sayi]) => (
                        <Typography key={seviye} variant="body2" sx={{ fontSize: '8pt', fontWeight: 600, fontFamily: '"Times New Roman", Times, serif', color: '#111' }}>
                          {seviye}. sınıf: {sayi} öğrenci
                        </Typography>
                      ));
                    })()}

                    {/* Dal Dağılımı */}
                    {(() => {
                      const dalSayilari = {};
                      sortedStudents.forEach(ogrenci => {
                        let dalBilgisi = ogrenci.dal;
                        if (!dalBilgisi && tumOgrenciler && tumOgrenciler.length > 0) {
                          const guncelOgrenci = tumOgrenciler.find(o => o.id === ogrenci.id || o.numara === ogrenci.numara);
                          if (guncelOgrenci) {
                            dalBilgisi = guncelOgrenci.dal;
                          }
                        }
                        const kisaDal = getShortBranchName(dalBilgisi);
                        if (kisaDal && kisaDal !== '-') {
                          dalSayilari[kisaDal] = (dalSayilari[kisaDal] || 0) + 1;
                        }
                      });

                      const dalDagilimi = Object.entries(dalSayilari);
                      if (dalDagilimi.length > 0) {
                        return (
                          <Typography variant="body2" sx={{ fontSize: '8pt', fontWeight: 600, mt: 0.5, fontFamily: '"Times New Roman", Times, serif', color: '#111' }}>
                            Dal Dağılımı: {dalDagilimi.map(([dal, sayi]) => `${dal}: ${sayi}`).join(', ')}
                          </Typography>
                        );
                      }
                      return null;
                    })()}
                  </Box>

                  {/* Sağ: Öğretmen Adı Soyadı / İmza */}
                  <Box sx={{ textAlign: 'right', minWidth: { xs: '220px', sm: '270px' } }}>
                    <Typography variant="body2" sx={{ fontSize: '8.5pt', fontWeight: 800, mb: 1, pr: 0.5, fontFamily: '"Times New Roman", Times, serif', textTransform: 'uppercase', color: '#000' }}>
                      Salon Gözetmen Öğretmeni
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, width: { xs: 240, sm: 270 }, justifyContent: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontSize: '8pt', fontWeight: 600, minWidth: 70, textAlign: 'left', fontFamily: '"Times New Roman", Times, serif', color: '#000' }}>Adı Soyadı:</Typography>
                        <Box sx={{ flex: 1, height: 0, borderBottom: '1px solid #000', position: 'relative', top: '0.25em' }} />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, width: { xs: 240, sm: 270 }, justifyContent: 'flex-start' }}>
                        <Typography variant="body2" sx={{ fontSize: '8pt', fontWeight: 600, minWidth: 70, textAlign: 'left', fontFamily: '"Times New Roman", Times, serif', color: '#000' }}>İmza:</Typography>
                        <Box sx={{ flex: 1, height: 0, borderBottom: '1px solid #000', position: 'relative', top: '0.25em' }} />
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        })
      }

      {
        (() => {
          // Sabit öğrencileri güncel state'ten al (props ile gelmeli, yoksa tumOgrenciler'den filtrele)
          const pinned = (Array.isArray(tumOgrenciler) ? tumOgrenciler.filter(o => o && o.pinned) : []);
          if (!pinned || pinned.length === 0) return null;
          const salonAdiBul = (sid) => {
            if (!sid) return '-';
            const s = tumSalonlar.find(x => String(x.id) === String(sid) || String(x.salonId) === String(sid) || String(x.ad) === String(sid) || String(x.salonAdi) === String(sid));
            return s ? (s.salonAdi || s.ad || String(sid)) : String(sid);
          };
          // Sabit öğrenciyi güncel yerleşim planında bul
          const findPlacement = (ogr) => {
            for (const salon of tumSalonlar) {
              const masalar = Array.isArray(salon.masalar) ? salon.masalar : [];
              const masa = masalar.find(m => m?.ogrenci && m.ogrenci.id === ogr.id);
              if (masa) {
                let masaNo = '-';
                if (typeof masa.masaNumarasi !== 'undefined' && masa.masaNumarasi !== null) {
                  masaNo = masa.masaNumarasi;
                } else {
                  const calculated = getMasaNo(masa);
                  masaNo = (typeof calculated !== 'undefined' && calculated !== null) ? calculated : '-';
                }
                return {
                  salonAdi: salon.salonAdi || salon.ad,
                  masaNo
                };
              }
            }
            // Yerleşimi yoksa null dön
            return { salonAdi: null, masaNo: null };
          };

          // Sadece yerleşimi olan pinned öğrencileri filtrele
          // Sadece gerçekten güncel yerleşimde atanmış sabit öğrenciler
          // Sıralama: önce sınıf (alfabetik), sonra öğrenci numarası (artan)
          const placedPinned = pinned
            .map(o => {
              const plc = findPlacement(o);
              return { ...o, _salonAdi: plc.salonAdi, _masaNo: plc.masaNo };
            })
            .filter(o => o._salonAdi !== null && o._masaNo !== null && o._masaNo !== '-')
            .sort((a, b) => {
              // Sınıf karşılaştırması (ör: 9-A, 9-B, 10-A)
              const parseSinif = (sinif) => {
                // 9-A -> {grade:9, section:'A'}
                const m = String(sinif || '').toUpperCase().match(/^(\d+)[-\s]?([A-ZÇĞİÖŞÜ0-9]*)/);
                return m ? { grade: parseInt(m[1], 10), section: m[2] || '' } : { grade: 0, section: '' };
              };
              const sA = parseSinif(a.sinif || a.sube);
              const sB = parseSinif(b.sinif || b.sube);
              if (sA.grade !== sB.grade) return sA.grade - sB.grade;
              if (sA.section < sB.section) return -1;
              if (sA.section > sB.section) return 1;
              // Aynı sınıfta ise öğrenci numarasına göre sırala
              const numA = parseInt(a.numara || a.ogrNo || a.ogrenciNo || '0', 10);
              const numB = parseInt(b.numara || b.ogrNo || b.ogrenciNo || '0', 10);
              if (numA !== numB) return numA - numB;
              // Son olarak ad soyad
              const adSoyadA = (a.ad + ' ' + a.soyad).toUpperCase();
              const adSoyadB = (b.ad + ' ' + b.soyad).toUpperCase();
              return adSoyadA.localeCompare(adSoyadB, 'tr');
            });

          if (placedPinned.length === 0) return null;

          return (
            <Box sx={{
              pageBreakBefore: 'always',
              backgroundColor: 'white',
              '@media print': { pageBreakBefore: 'always', breakBefore: 'page', backgroundColor: 'white' }
            }}>
              {/* Üst Boşluk - diğer sayfalarla aynı */}
              <Box sx={{
                height: '30px',
                '@media print': {
                  height: '50px'
                }
              }} />
              {/* Başlık: diğer sayfalar ile aynı */}
              <Box sx={{ textAlign: 'center', mb: 2, '@media print': { mt: 0, mb: 1, pt: 0, pb: 0 } }}>
                <Typography variant="body1" component="h2" sx={{ fontWeight: 700, mb: 0.2, lineHeight: 1.3, fontSize: '1.1rem' }}>
                  {ayarlar.okulAdi}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '1.0rem' }}>
                  {(() => {
                    const yil = ayarlar.egitimYili ? `${ayarlar.egitimYili} Eğitim Öğretim Yılı` : '';
                    const dersAdi = ayarlar.dersler && ayarlar.dersler.length > 0
                      ? ayarlar.dersler[0].ad || 'Ders Adı'
                      : 'Ders Adı';
                    const sinav = `${dersAdi} ${ayarlar.donem || '1'}. Dönem ${ayarlar.sinavDonemi || '1'}. Ortak Sınavı`;
                    return yil ? `${yil} - ${sinav}` : sinav;
                  })()}
                </Typography>
                <Typography variant="body1" component="h3" sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1.3, fontSize: '1.1rem' }}>
                  Sabit Öğrenciler Listesi
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '0.9rem', color: 'text.secondary' }}>
                  Toplam: {placedPinned.length}
                </Typography>
              </Box>
              <TableContainer component={Paper} sx={{ mb: 1, width: '100%', maxWidth: '700px', margin: '0 auto', '@media print': { width: '98%', maxWidth: '98%' } }}>
                <Table size="small" sx={(theme) => ({
                  border: `1px solid ${theme.palette.divider}`,
                  '& .MuiTableCell-root': { padding: '2px 6px', fontSize: '0.8rem', border: `1px solid ${theme.palette.divider}`, textAlign: 'center' },
                  '& .MuiTableCell-root:nth-of-type(2)': { textAlign: 'left !important' }
                })}>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>#</strong></TableCell>
                      <TableCell><strong>Sınıf</strong></TableCell>
                      <TableCell><strong>Okul No</strong></TableCell>
                      <TableCell><strong>Ad Soyad</strong></TableCell>
                      <TableCell><strong>Salon</strong></TableCell>
                      <TableCell><strong>Masa</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {placedPinned.map((o, i) => {
                      const masaStr = o._masaNo != null && o._masaNo !== '-' ? o._masaNo : '-';
                      const salonStr = o._salonAdi || '-';
                      return (
                        <TableRow key={o.id || i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{o.sinif || o.sube || '-'}</TableCell>
                          <TableCell>{o.numara || o.ogrNo || o.ogrenciNo || '-'}</TableCell>
                          <TableCell sx={{ textAlign: 'left !important' }}>{o.ad} {o.soyad}</TableCell>
                          <TableCell>{salonStr}</TableCell>
                          <TableCell>{masaStr}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })()
      }
    </Box>
  </>
);
}));

SalonImzaListesiPrintable.displayName = 'SalonImzaListesiPrintable';

export { SalonImzaListesiPrintable };
