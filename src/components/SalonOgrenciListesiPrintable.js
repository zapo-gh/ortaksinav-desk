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
  TableFooter,
  Paper,
  Chip,
  GlobalStyles
} from '@mui/material';
import { getPlacementMap, resolveStudentPlacement } from '../utils/placementHelper';
import PrintHeader from './common/PrintHeader';
import EmptyState from './common/EmptyState';
import { People as PeopleIcon } from '@mui/icons-material';

const SalonOgrenciListesiPrintable = React.memo(forwardRef(({ ogrenciler, yerlestirmeSonucu, ayarlar = {} }, ref) => {
  // Merkezi yerleşim haritasını oluştur (her render'da çalışır ama hızlıdır, useMemo eklenebilir ama şu an için yeterli)
  const placementMap = getPlacementMap(yerlestirmeSonucu?.tumSalonlar);

  // Yardımcılar: normalize ve parse (önce tanımla, sonra kullan)
  function normalizeClassName(s) {
    if (!s) return '';
    const raw = String(s).trim().toLocaleUpperCase('tr-TR');
    // Ayırıcıları tek tipe çevir ("-", " ", "_" -> "/")
    const unified = raw.replace(/[- _]+/g, '/');
    // "11A" gibi durumları "11/A" yap
    const m = unified.match(/^(\d{1,2})\/?\s*([A-ZÇĞİÖŞÜ0-9]+)?$/i);
    if (!m) return unified;
    const level = m[1];
    const section = (m[2] || '').toLocaleUpperCase('tr-TR');
    return section ? `${level}/${section}` : `${level}`;
  }

  // Aktif salonlarda yer alan sınıfları belirle (yalnızca seçili/aktif salonlardan gelen sınıflar)
  const aktifSinifSet = new Set();
  const aktifSinifNormalizedSet = new Set(); // Normalize edilmiş sınıf adları için
  const hasValidPlacement = yerlestirmeSonucu?.tumSalonlar && Array.isArray(yerlestirmeSonucu.tumSalonlar) && yerlestirmeSonucu.tumSalonlar.length > 0;

  if (hasValidPlacement) {
    for (const salon of yerlestirmeSonucu.tumSalonlar) {
      // Masalardaki öğrencilere bak
      if (Array.isArray(salon.masalar)) {
        salon.masalar.forEach(m => {
          const o = m?.ogrenci;
          if (o?.sinif) {
            aktifSinifSet.add(o.sinif);
            aktifSinifNormalizedSet.add(normalizeClassName(o.sinif));
          }
        });
      }
      // Ek olarak salon.ogrenciler listesini de tara
      if (Array.isArray(salon.ogrenciler)) {
        salon.ogrenciler.forEach(o => {
          if (o?.sinif) {
            aktifSinifSet.add(o.sinif);
            aktifSinifNormalizedSet.add(normalizeClassName(o.sinif));
          }
        });
      }
    }
  }

  // Yalnızca aktif salonlarda bulunan sınıflardaki öğrencileri dahil et
  // Eğer yerleştirme yoksa veya aktif sınıf seti boşsa, tüm öğrencileri göster
  const filtreliOgrenciler = Array.isArray(ogrenciler)
    ? ogrenciler.filter(o => {
      if (!o) return false;
      const sinif = o.sinif || 'Belirtilmemiş';
      // Eğer geçerli bir yerleştirme var ve aktif sınıf seti boş değilse sadece o sınıfları göster
      // Ama eğer yerleştirme var ama aktif sınıf seti boşsa (salonlarda öğrenci yok), tüm öğrencileri göster
      if (hasValidPlacement && aktifSinifSet.size > 0) {
        // Önce tam eşleşme kontrolü
        if (aktifSinifSet.has(sinif)) return true;
        // Sonra normalize edilmiş eşleşme kontrolü
        const normalizedSinif = normalizeClassName(sinif);
        return aktifSinifNormalizedSet.has(normalizedSinif);
      }
      // Yerleştirme yoksa veya aktif set boşsa (yerleştirme var ama salonlarda öğrenci yok) tümünü göster
      return true;
    })
    : [];

  // Öğrencileri sınıf seviyesine göre grupla ve salon/koltuk bilgilerini ekle
  const ogrencilerBySinif = filtreliOgrenciler.reduce((acc, ogrenci) => {
    const sinif = ogrenci.sinif || 'Belirtilmemiş';
    if (!acc[sinif]) {
      acc[sinif] = [];
    }

    // Salon ve koltuk bilgilerini placementMap'ten çek güvenli bir şekilde
    let salonBilgisi = 'Belirtilmemiş';
    let koltukNo = 'Belirtilmemiş';
    let salonId = null;

    // resolveStudentPlacement fonksiyonu ID çakışmalarını kontrol eder
    const info = resolveStudentPlacement(placementMap, ogrenci);

    // (Eski manual lookup kodu silindi)

    if (info) {
      salonBilgisi = info.salonAdi;
      koltukNo = info.koltukNo;
      salonId = info.salonId;
    }

    acc[sinif].push({
      ...ogrenci,
      salonBilgisi,
      koltukNo,
      salonId
    });
    return acc;
  }, {});


  function parseSinif(s) {
    if (!s || typeof s !== 'string') return { seviye: Number.MAX_SAFE_INTEGER, sube: s || '' };
    const norm = normalizeClassName(s);
    const match = norm.match(/(\d+)/);
    const seviye = match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    // Şube: sayısal kısım sonrası ilk harf/karakter grubu
    const subeMatch = norm.replace(/\d+/g, '').match(/[A-ZÇĞİÖŞÜ]+/i);
    const sube = subeMatch ? subeMatch[0].trim() : '';
    return { seviye, sube };
  }

  function findFirstSalonIndexForClass(sinifAdi) {
    const hedef = normalizeClassName(sinifAdi);
    const sortedSalonlar = (yerlestirmeSonucu?.tumSalonlar || []).sort((a, b) => {
      const aId = parseInt(a.id || a.salonId || 0);
      const bId = parseInt(b.id || b.salonId || 0);
      return aId - bId;
    });
    for (let i = 0; i < sortedSalonlar.length; i++) {
      const salon = sortedSalonlar[i];
      // Önce masalarda ara
      if (Array.isArray(salon?.masalar) && salon.masalar.some(m => normalizeClassName(m?.ogrenci?.sinif) === hedef)) {
        return i;
      }
      // Sonra ogrenciler listesinde ara
      if (Array.isArray(salon?.ogrenciler) && salon.ogrenciler.some(o => normalizeClassName(o?.sinif) === hedef)) {
        return i;
      }
    }
    return Number.MAX_SAFE_INTEGER;
  }

  // Sınıfları PDF'te salon sırasına göre sırala
  // Salonları ID'ye göre sırala (sayısal olarak)
  const sortedSalonlar = (yerlestirmeSonucu?.tumSalonlar || []).sort((a, b) => {
    const aId = parseInt(a.id || a.salonId || 0);
    const bId = parseInt(b.id || b.salonId || 0);
    return aId - bId;
  });

  const salonIdOrder = new Map(sortedSalonlar.map((s, i) => [s.id, i]));

  const salonSiraliSiniflar = [];
  if (sortedSalonlar.length > 0) {
    for (const salon of sortedSalonlar) {
      const sinifSet = new Set();
      if (Array.isArray(salon.masalar)) {
        salon.masalar.forEach(m => {
          const o = m?.ogrenci;
          if (o?.sinif) sinifSet.add(o.sinif);
        });
      }
      if (Array.isArray(salon.ogrenciler)) {
        salon.ogrenciler.forEach(o => { if (o?.sinif) sinifSet.add(o.sinif); });
      }
      // Normalize ederek ogrencilerBySinif anahtarları ile eşleştir
      const keys = Object.keys(ogrencilerBySinif);
      const findKeyForClassName = (target) => {
        const hedef = normalizeClassName(target);
        for (const k of keys) {
          if (normalizeClassName(k) === hedef) return k;
        }
        return null;
      };
      for (const s of sinifSet) {
        const rep = findKeyForClassName(s) || s;
        if (!salonSiraliSiniflar.includes(rep) && Object.prototype.hasOwnProperty.call(ogrencilerBySinif, rep)) {
          salonSiraliSiniflar.push(rep);
        }
      }
    }
  }

  const sinifEntries = Object.entries(ogrencilerBySinif);

  // Artık salonSiraliSiniflar üzerinden kesin sırayı kuracağız; bu nedenle eski karma sıralayıcıyı kullanmıyoruz

  // Sınıfları seviye/şube sırasına göre sırala (9/A, 9/B, 9/C, 10/A, 10/B...)
  const finalSinifList = Object.keys(ogrencilerBySinif).sort((a, b) => {
    const pa = parseSinif(a);
    const pb = parseSinif(b);
    // Önce seviye (9, 10, 11, 12)
    if (pa.seviye !== pb.seviye) return pa.seviye - pb.seviye;
    // Sonra şube (A, B, C, D...)
    return (pa.sube || '').localeCompare(pb.sube || '', 'tr');
  });

  // Salon bazında öğrenci grupları (kullanılmıyor, sınıf bazında listeleme yapıyoruz)
  // const salonGruplari = ogrenciSalonEslesmeleri.reduce((acc, ogrenci) => {
  //   const salonId = ogrenci.salonId;
  //   if (!acc[salonId]) {
  //     acc[salonId] = {
  //       salonAdi: ogrenci.salonAdi,
  //       ogrenciler: []
  //     };
  //   }
  //   acc[salonId].ogrenciler.push(ogrenci);
  //   return acc;
  // }, {});

  // Öğrenci yoksa uygun mesaj göster (yerleştirme yoksa bile öğrencileri göster)
  if (!Array.isArray(ogrenciler) || ogrenciler.length === 0) {
    return (
      <Box ref={ref} sx={{ p: 2 }}>
        <EmptyState 
          icon={PeopleIcon} 
          title="Öğrenci bulunamadı" 
          description="Liste oluşturmak için öğrenci verisi bulunmamaktadır." 
        />
      </Box>
    );
  }

  // Filtrelenmiş öğrenci yoksa uygun mesaj göster
  if (filtreliOgrenciler.length === 0) {
    return (
      <Box ref={ref} sx={{ p: 2 }}>
        <EmptyState 
          icon={PeopleIcon} 
          title="Filtrelenen öğrenci bulunamadı" 
          description="Seçilen kriterlere uygun öğrenci listelenemedi." 
        />
      </Box>
    );
  }

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



      {/* Sınıf Bazında Liste */}
      <Box sx={{ mb: 2 }}>
        {finalSinifList.map((sinif, index) => {
          const sinifOgrencileri = ogrencilerBySinif[sinif] || [];
          const sinifNorm = normalizeClassName(sinif);
          const sinifDersi = (ayarlar.dersler || []).find(ders =>
            Array.isArray(ders.siniflar) && ders.siniflar.some(s => normalizeClassName(s) === sinifNorm)
          );

          let dersSinavBasligi = '';
          if (sinifDersi) {
            dersSinavBasligi = `${sinifDersi.ad} - ${ayarlar.donem || '1'}. Dönem ${ayarlar.sinavDonemi || '1'}. Ortak Sınavı`;
          } else if (ayarlar.dersler && ayarlar.dersler.length > 0) {
            dersSinavBasligi = `${ayarlar.dersler[0].ad || 'Ortak Sınav'} - ${ayarlar.donem || '1'}. Dönem ${ayarlar.sinavDonemi || '1'}. Ortak Sınavı`;
          } else {
            dersSinavBasligi = `${ayarlar.donem || '1'}. Dönem ${ayarlar.sinavDonemi || '1'}. Ortak Sınavı`;
          }

          return (
            <Box key={sinif} sx={{
              mb: 1.5,
              pt: index > 0 ? 1 : 0,
              pageBreakBefore: index > 0 ? 'always' : 'auto',
              backgroundColor: 'white',
              boxSizing: 'border-box',
              '@media print': {
                pageBreakBefore: index > 0 ? 'always' : 'auto',
                breakBefore: index > 0 ? 'page' : 'auto',
                boxSizing: 'border-box !important',
                width: '100% !important',
                maxWidth: '100% !important',
                padding: '10mm 14mm 10mm 14mm !important',
                backgroundColor: 'white'
              }
            }}>
              {/* Sınıf Başlığı */}
              <PrintHeader 
                compact={true}
                schoolName={ayarlar.okulAdi || 'T.C. MİLLİ EĞİTİM BAKANLIĞI'}
                subTitle={`${ayarlar.egitimYili || '2025-2026'} Eğitim Öğretim Yılı`}
                documentTitle={`${sinif} Sınıfı Öğrenci Listesi - ${dersSinavBasligi}`}
                date={`${ayarlar.sinavTarihi ? new Date(ayarlar.sinavTarihi).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR')} ${ayarlar.sinavSaati ? `- ${ayarlar.sinavSaati}` : ''}`}
              />

              <TableContainer component={Paper} elevation={0} sx={{
                mb: 1.5,
                width: '100%',
                margin: '0 auto',
                backgroundColor: 'white',
                boxShadow: 'none',
                borderRadius: '2px',
                border: '1.5px solid #334155',
                '@media print': {
                  mb: 0,
                  width: '100%',
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
                      <TableCell align="center" sx={{ width: '8%', fontWeight: 700 }}><strong>Sıra</strong></TableCell>
                      <TableCell align="center" sx={{ width: '15%', fontWeight: 700 }}><strong>Öğrenci No</strong></TableCell>
                      <TableCell align="left" sx={{ width: '45%', fontWeight: 700, pl: 1.5 }}><strong>Ad Soyad</strong></TableCell>
                      <TableCell align="center" sx={{ width: '16%', fontWeight: 700 }}><strong>Salon</strong></TableCell>
                      <TableCell align="center" sx={{ width: '16%', fontWeight: 700 }}><strong>Sıra No</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody sx={{ display: 'table-row-group' }}>
                    {[...sinifOgrencileri]
                      .sort((a, b) => {
                        const numA = parseInt((a?.numara ?? a?.number ?? '').toString().replace(/[^0-9]/g, ''), 10);
                        const numB = parseInt((b?.numara ?? b?.number ?? '').toString().replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(numA) && !isNaN(numB)) {
                          return numA - numB;
                        }
                        if (isNaN(numA) && isNaN(numB)) {
                          return (a?.numara ?? a?.number ?? '').toString().localeCompare((b?.numara ?? b?.number ?? '').toString(), 'tr', { sensitivity: 'base' });
                        }
                        if (isNaN(numA)) return 1;
                        if (isNaN(numB)) return -1;
                        return 0;
                      })
                      .map((ogrenci, index) => (
                        <TableRow key={ogrenci.id || index}>
                          <TableCell align="center">{index + 1}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{ogrenci.numara}</TableCell>
                          <TableCell align="left" sx={{ pl: 1.5 }}>{ogrenci.ad || ogrenci.adSoyad || 'Bilinmeyen'} {ogrenci.soyad || ''}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {ogrenci.salonBilgisi || '-'}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {ogrenci.koltukNo || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                  <TableFooter sx={{ display: 'table-row-group !important' }}>
                    <TableRow sx={{
                      pageBreakInside: 'avoid !important',
                      breakInside: 'avoid !important',
                      pageBreakBefore: 'avoid !important',
                      breakBefore: 'avoid !important',
                      backgroundColor: '#f8fafc !important'
                    }}>
                      <TableCell
                        colSpan={5}
                        align="right"
                        sx={{
                          fontWeight: 800,
                          fontSize: '8.5pt',
                          py: 0.5,
                          px: 1.5,
                          border: '1.5px solid #000 !important',
                          fontFamily: '"Times New Roman", Times, serif',
                          color: '#000 !important'
                        }}
                      >
                        {sinif} Sınıfı Toplam: {sinifOgrencileri.length} Öğrenci
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            </Box>
          );
        })}
      </Box>

      {/* Alt bilgi */}
    </Box>
  </>
);
}));

SalonOgrenciListesiPrintable.displayName = 'SalonOgrenciListesiPrintable';

export { SalonOgrenciListesiPrintable };