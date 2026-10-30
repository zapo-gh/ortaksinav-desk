import React, { forwardRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  GlobalStyles
} from '@mui/material';
import PrintHeader from './common/PrintHeader';
import EmptyState from './common/EmptyState';
import { Chair as ChairIcon } from '@mui/icons-material';

/**
 * Yazdırılabilir Salon Planı Bileşeni
 * PDF export için özel olarak tasarlanmıştır
 * Tüm salonlar için ayrı sayfalarda salon yerleşim planları
 */
export const SalonPlaniPrintable = React.memo(forwardRef(({ yerlestirmeSonucu, ayarlar = {} }, ref) => {  const theme = useTheme();  // Masa numarası hesaplama fonksiyonu
  const calculateDeskNumberForMasa = (masa) => {
    if (!masa || !yerlestirmeSonucu?.tumSalonlar) return masa?.id + 1 || 1;

    // Tüm salonları kontrol et
    for (const salon of yerlestirmeSonucu.tumSalonlar) {
      if (salon.masalar && Array.isArray(salon.masalar)) {
        const allMasalar = salon.masalar;
        const gruplar = {};

        allMasalar.forEach(m => {
          const grup = m.grup || 1;
          if (!gruplar[grup]) gruplar[grup] = [];
          gruplar[grup].push(m);
        });

        let masaNumarasi = 1;
        const sortedGruplar = Object.keys(gruplar).sort((a, b) => parseInt(a) - parseInt(b));

        for (const grupId of sortedGruplar) {
          const grupMasalar = gruplar[grupId];

          // Grup içinde satır-sütun sıralaması
          const sortedGrupMasalar = grupMasalar.sort((a, b) => {
            if (a.satir !== b.satir) return a.satir - b.satir;
            return a.sutun - b.sutun;
          });

          for (const m of sortedGrupMasalar) {
            if (m.id === masa.id) {
              return masaNumarasi;
            }
            masaNumarasi++;
          }
        }
      }
    }

    return masa.id + 1; // Fallback
  };

  // Yerleştirme yoksa uygun mesaj göster
  if (!yerlestirmeSonucu || !yerlestirmeSonucu.tumSalonlar || yerlestirmeSonucu.tumSalonlar.length === 0) {
    return (
      <Box
        ref={ref}
        sx={{
          p: 4,
          textAlign: 'center',
          minHeight: '100vh',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, color: 'text.secondary' }}>
          Herhangi Bir Yerleştirme Yapılmadı
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Öğrenci yerleştirme işlemi yapılmadığı için salon planı oluşturulamadı.
        </Typography>
      </Box>
    );
  }

  const getRiskColor = (kategori) => {
    switch (kategori) {
      case 'yuksek-risk':
        return theme.palette.error.main;
      case 'orta-risk':
        return theme.palette.warning.main;
      case 'dusuk-risk':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getKitapcikColor = (kitapcik) => {
    switch (kitapcik) {
      case 'A':
        return theme.palette.info.main;
      case 'B':
        return theme.palette.warning.main;
      case 'C':
        return theme.palette.success.main;
      case 'D':
        return theme.palette.secondary.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Sınıf seviyesi çıkarma fonksiyonu
  const getSinifSeviyesi = (sinifAdi) => {
    if (!sinifAdi) return 'Bilinmeyen';

    // Sınıf adından seviyeyi çıkar (9A -> 9, 10B -> 10, 11C -> 11)
    const match = sinifAdi.match(/^(\d+)/);
    if (match) {
      return `${match[1]}. sınıf`;
    }

    return 'Bilinmeyen';
  };

  // Salon özeti hesaplama fonksiyonu
  const getSalonOzeti = (salon) => {
    const ogrenciler = [];

    // Grup bazlı görüntüleme için
    if (salon.gruplar) {
      Object.values(salon.gruplar).forEach(grup => {
        grup.forEach(masa => {
          if (masa.ogrenci) {
            ogrenciler.push(masa.ogrenci);
          }
        });
      });
    } else {
      // Fallback görüntüleme için
      salon.masalar.forEach(masa => {
        if (masa.ogrenci) {
          ogrenciler.push(masa.ogrenci);
        }
      });
    }

    // Sınıf seviyesi dağılımını hesapla
    const sinifDagilimi = {};
    ogrenciler.forEach(ogrenci => {
      const sinifAdi = ogrenci.sinif || ogrenci.sube || 'Bilinmeyen';
      const sinifSeviyesi = getSinifSeviyesi(sinifAdi);
      sinifDagilimi[sinifSeviyesi] = (sinifDagilimi[sinifSeviyesi] || 0) + 1;
    });

    return {
      toplamOgrenci: ogrenciler.length,
      sinifDagilimi
    };
  };

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
          icon={ChairIcon} 
          title="Henüz yerleştirme yapılmadı" 
          description="Salon planını yazdırabilmek için önce otomatik yerleştirme yapmalısınız." 
        />
      </Box>
    );
  }

  // Salon düzenini oluştur
  const getSalonDuzeni = (salon) => {
    if (!salon || !Array.isArray(salon.ogrenciler)) return null;

    // Eğer salon.masalar varsa, grup bazlı salon yapısını kullan
    if (salon.masalar && salon.masalar.length > 0) {
      // Grupları oluştur
      const gruplar = {};
      salon.masalar.forEach(masa => {
        const grupId = masa.grup || '1';
        if (!gruplar[grupId]) {
          gruplar[grupId] = [];
        }
        gruplar[grupId].push(masa);
      });

      return {
        satirSayisi: salon.siraDizilimi?.satir || Math.ceil(Math.sqrt(salon.kapasite)),
        sutunSayisi: salon.siraDizilimi?.sutun || Math.ceil(salon.kapasite / (salon.siraDizilimi?.satir || Math.ceil(Math.sqrt(salon.kapasite)))),
        masalar: salon.masalar,
        gruplar: gruplar
      };
    }

    // Fallback: Basit matris - Tüm kapasiteyi kullan
    const satirSayisi = salon.siraDizilimi?.satir || Math.ceil(Math.sqrt(salon.kapasite));
    const sutunSayisi = salon.siraDizilimi?.sutun || Math.ceil(salon.kapasite / satirSayisi);

    const masalar = [];
    // Tüm kapasiteyi kullan - sadece öğrenci sayısı değil
    const toplamKoltuk = satirSayisi * sutunSayisi;

    for (let i = 0; i < toplamKoltuk; i++) {
      const satir = Math.floor(i / sutunSayisi);
      const sutun = i % sutunSayisi;
      const ogrenci = salon.ogrenciler[i] || null;

      masalar.push({
        id: i,
        satir: satir,
        sutun: sutun,
        ogrenci: ogrenci
      });
    }

    return { satirSayisi, sutunSayisi, masalar };
  };

  return (
    <>
      <GlobalStyles
        styles={{
          '@media print': {
            html: { background: '#fff !important' },
            body: { background: '#fff !important', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' },
          },
        }}
      />
      <Box
        ref={ref}
        sx={{
          p: { xs: 2, sm: 3 },
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          bgcolor: 'white',
          '@media print': {
            p: 0,
            m: '0 auto',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            fontSize: '12px',
            bgcolor: 'white',
          }
        }}
      >
      {/* Tüm salonlar için ayrı sayfalar */}
      {tumSalonlar.map((salon, salonIndex) => {
        const salonDuzeni = getSalonDuzeni(salon);

        if (!salonDuzeni) return null;

        return (
          <Box
            key={salon.salonId || salonIndex}
            sx={{
              mb: 2,
              pageBreakBefore: salonIndex > 0 ? 'always' : 'auto',
              bgcolor: 'white',
              boxSizing: 'border-box',
              overflow: 'hidden',
              '@media print': {
                pageBreakBefore: salonIndex > 0 ? 'always' : 'auto',
                breakBefore: salonIndex > 0 ? 'page' : 'auto',
                boxSizing: 'border-box !important',
                width: '100% !important',
                maxWidth: '100% !important',
                padding: '10mm 14mm 10mm 14mm !important',
                bgcolor: 'white'
              }
            }}
          >
            {/* Salon Başlığı */}
            <PrintHeader 
              schoolName={ayarlar.okulAdi || 'T.C. MİLLİ EĞİTİM BAKANLIĞI'}
              subTitle={`${ayarlar.egitimYili || '2025-2026'} Eğitim Öğretim Yılı`}
              documentTitle={`${salon.salonAdi || salon.ad || `Salon ${salonIndex + 1}`} Salon Oturma Planı - ${(() => {
                const dersAdi = ayarlar.dersler && ayarlar.dersler.length > 0
                  ? ayarlar.dersler[0].ad || 'Ders Adı'
                  : 'Ders Adı';
                return `${dersAdi} ${ayarlar.donem || '1'}. Dönem ${ayarlar.sinavDonemi || '1'}. Ortak Sınavı`;
              })()}`}
              date={`${ayarlar.sinavTarihi ? new Date(ayarlar.sinavTarihi).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR')} ${ayarlar.sinavSaati ? `- ${ayarlar.sinavSaati}` : ''}`}
            />


            {/* Öğretmen Masası ve Ders Tahtası */}
            <Box sx={{ mb: 1.5, px: 2 }}>
              {/* Ders Tahtası - Üstte ortaya hizalı */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <Paper
                  elevation={0}
                  sx={{
                    width: 280,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f1f5f9',
                    color: '#000',
                    borderRadius: 1,
                    border: '2px solid #94a3b8'
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 1 }}>
                    DERS TAHTASI
                  </Typography>
                </Paper>
              </Box>

              {/* Öğretmen Masası - Altta sola hizalı */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Paper
                  elevation={0}
                  sx={{
                    width: 140,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f8fafc',
                    border: '2px solid #64748b',
                    borderRadius: 1
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.7rem', textAlign: 'center', color: '#000' }}>
                    ÖĞRETMEN<br />MASASI
                  </Typography>
                </Paper>
              </Box>
            </Box>

            {/* Grup Bazlı Masalar */}
            {salonDuzeni.gruplar ? (() => {
              const grupIds = Object.keys(salonDuzeni.gruplar);
              const grupSayisi = grupIds.length;
              const maxWPercent = `${Math.floor(100 / Math.max(1, grupSayisi))}%`;
              const gapVal = grupSayisi > 4 ? 1.5 : (grupSayisi === 4 ? 2.5 : 3.5);

              return (
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: gapVal, flexWrap: 'nowrap', justifyContent: 'center', mb: 2, width: '100%' }}>
                  {grupIds.map(grupId => (
                    <Box key={grupId} sx={{ minWidth: 0, flex: `1 1 ${maxWPercent}`, maxWidth: maxWPercent }}>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: 0.2,
                          rowGap: 0.9,
                          maxWidth: '100%',
                          mx: 'auto'
                        }}
                      >
                        {salonDuzeni.gruplar[grupId].map((masa) => (
                          <Paper
                            key={masa.id}
                            elevation={0}
                            sx={{
                              p: 0.3,
                              width: '100px',
                              height: '50px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                            bgcolor: (masa?.ogrenci && (masa.ogrenci.id || masa.ogrenci.numara || masa.ogrenci.ad || masa.ogrenci.soyad)) ? '#eff6ff' : '#f8fafc',
                            border: (masa?.ogrenci && (masa.ogrenci.id || masa.ogrenci.numara || masa.ogrenci.ad || masa.ogrenci.soyad)) ? '2px solid' : '1px solid',
                            borderColor: (masa?.ogrenci && (masa.ogrenci.id || masa.ogrenci.numara || masa.ogrenci.ad || masa.ogrenci.soyad)) ? '#2563eb' : '#cbd5e1',
                              fontSize: '0.5rem',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                          >
                            {/* Masa Numarası */}
                            <Typography
                              variant="caption"
                              sx={{
                                position: 'absolute',
                                top: 1,
                                left: 2,
                                fontWeight: 700,
                                color: 'text.secondary',
                                fontSize: '0.6rem'
                              }}
                            >
                              {masa.masaNumarasi || calculateDeskNumberForMasa(masa)}
                            </Typography>

                            {/* Öğrenci Bilgileri */}
                            {masa.ogrenci ? (
                              <Box sx={{ textAlign: 'center', width: '100%', px: 0.5 }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    fontWeight: 700,
                                    fontSize: '0.55rem',
                                    lineHeight: 1.15,
                                    mb: 0.1,
                                    overflow: 'hidden',
                                    textAlign: 'center',
                                    wordBreak: 'break-word',
                                    color: '#000'
                                  }}
                                >
                                  {masa.ogrenci.ad} {masa.ogrenci.soyad}
                                </Typography>

                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    fontSize: '0.45rem',
                                    color: '#334155',
                                    fontWeight: 600,
                                    mb: 0.1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {masa.ogrenci.sinif} - {masa.ogrenci.numara}
                                </Typography>

                              </Box>
                            ) : (
                              <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
                                <Typography variant="caption" sx={{ fontSize: '0.5rem' }}>
                                  Boş
                                </Typography>
                              </Box>
                            )}
                          </Paper>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              );
            })() : (
              // Fallback: Normal grid görüntüleme
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${salonDuzeni.sutunSayisi}, 1fr)`,
                  gap: 0.2,
                  rowGap: 0.4,
                  maxWidth: '100%',
                  mx: 'auto',
                  mb: 3
                }}
              >
                {salonDuzeni.masalar.map((masa) => (
                  <Paper
                    key={masa.id}
                    elevation={masa.ogrenci ? 2 : 1}
                    sx={{
                      p: 0.3,
                      width: '100px',
                      height: '50px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    bgcolor: (masa?.ogrenci && (masa.ogrenci.id || masa.ogrenci.numara || masa.ogrenci.ad || masa.ogrenci.soyad)) ? 'primary.50' : 'grey.100',
                    border: (masa?.ogrenci && (masa.ogrenci.id || masa.ogrenci.numara || masa.ogrenci.ad || masa.ogrenci.soyad)) ? '2px solid' : '1px solid',
                    borderColor: (masa?.ogrenci && (masa.ogrenci.id || masa.ogrenci.numara || masa.ogrenci.ad || masa.ogrenci.soyad)) ? getKitapcikColor(masa.ogrenci.kitapcik) : 'grey.300',
                      position: 'relative',
                      overflow: 'hidden',
                      '@media print': {
                        width: '100px',
                        height: '50px',
                        p: 0.3
                      }
                    }}
                  >
                    {/* Masa Numarası */}
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        top: 1,
                        left: 2,
                        fontWeight: 700,
                        color: 'text.secondary',
                        fontSize: '0.6rem'
                      }}
                    >
                      {masa.masaNumarasi || calculateDeskNumberForMasa(masa)}
                    </Typography>

                    {/* Öğrenci Bilgileri */}
                    {masa.ogrenci ? (
                      <Box sx={{ textAlign: 'center', width: '100%', px: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontWeight: 700,
                            fontSize: '0.5rem',
                            lineHeight: 1.1,
                            mb: 0.1,
                            overflow: 'hidden',
                            textAlign: 'center',
                            wordBreak: 'break-word'
                          }}
                        >
                          {masa.ogrenci.ad} {masa.ogrenci.soyad}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontSize: '0.4rem',
                            color: 'text.secondary',
                            mb: 0.1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {masa.ogrenci.numara}
                        </Typography>


                        {/* Kitapçık Göstergesi */}
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: getKitapcikColor(masa.ogrenci.kitapcik),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.3rem',
                            fontWeight: 700,
                            mx: 'auto'
                          }}
                        >
                          {masa.ogrenci.kitapcik}
                        </Box>

                        {/* Risk Göstergesi */}
                        <Box
                          sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            bgcolor: getRiskColor(masa.ogrenci.kategori),
                            mx: 'auto',
                            mt: 0.1
                          }}
                        />
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.4rem' }}>
                          Boş
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            )}

            {/* Salon Özeti */}
            {(() => {
              const ozet = getSalonOzeti(salonDuzeni);
              // Sınıf seviyelerini önceden tanımla ve sırala
              const sinifSeviyeleri = ['9. sınıf', '10. sınıf', '11. sınıf', '12. sınıf'];
              const sinifListesi = sinifSeviyeleri
                .filter(seviye => ozet.sinifDagilimi[seviye])
                .map(seviye => `${seviye}: ${ozet.sinifDagilimi[seviye]}`)
                .join(', ');

              return (
                <Box sx={{
                  mt: 2,
                  p: 1,
                  bgcolor: '#ffffff',
                  borderRadius: '2px',
                  border: '1.5px solid #000',
                  fontFamily: '"Times New Roman", Times, serif'
                }}>
                  <Typography variant="body2" sx={{
                    fontSize: '8.5pt',
                    fontWeight: 800,
                    textAlign: 'center',
                    color: '#000',
                    fontFamily: '"Times New Roman", Times, serif'
                  }}>
                    Toplam Öğrenci: {ozet.toplamOgrenci} &nbsp;|&nbsp; Sınıf Dağılımı: {sinifListesi}
                  </Typography>
                </Box>
              );
            })()}

          </Box>
        );
      })}
      </Box>
    </>
  );
}));

SalonPlaniPrintable.displayName = 'SalonPlaniPrintable';

export default SalonPlaniPrintable;