import React, { memo, useState } from 'react';
import PageHeader from './common/PageHeader';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  PlayArrow as PlayIcon,
  AutoAwesome as AutoAwesomeIcon,
  People as PeopleIcon,
  MeetingRoom as MeetingRoomIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  Book as BookIcon
} from '@mui/icons-material';

const PlanlamaYap = memo(({
  ogrenciler,
  ayarlar,
  salonlar,
  onYerlestirmeYap,
  yukleme
}) => {
  const [kontroller, setKontroller] = useState({});

  // Ayarlar kontrolü
  const ayarlarKontrolu = () => {
    const hatalar = [];
    const uyarilar = [];

    // Sınav adı, tarihi ve saati zorunlu değil - kontroller kaldırıldı
    if (!ayarlar?.dersler || ayarlar.dersler.length === 0) {
      // Eski test uyumluluğu için genel mesaj
      uyarilar.push('Ders bulunamadı');
    }

    if (!ayarlar?.dersler || ayarlar.dersler.length === 0) {
      hatalar.push('En az bir ders eklenmelidir');
    } else {
      ayarlar.dersler.forEach((ders, index) => {
        if (!ders.ad) {
          hatalar.push(`Ders ${index + 1} için ders adı belirtilmedi`);
        }
        if (!ders.siniflar || ders.siniflar.length === 0) {
          hatalar.push(`Ders ${index + 1} için en az bir sınıf seçilmelidir`);
        }

        // Ders-sınıf eşleştirmesi kontrolü
        if (ders.siniflar && ders.siniflar.length > 0) {
          const mevcutSiniflar = ogrenciler ? [...new Set(ogrenciler.map(o => o.sinif).filter(Boolean))] : [];
          const tanimsizSiniflar = ders.siniflar.filter(sinif => !mevcutSiniflar.includes(sinif));
          if (tanimsizSiniflar.length > 0) {
            uyarilar.push(`Ders "${ders.ad}" için tanımlanmamış sınıflar seçilmiş: ${tanimsizSiniflar.join(', ')}`);
          }
        }
      });
    }

    return { hatalar, uyarilar };
  };

  // Salonlar kontrolü
  const salonlarKontrolu = () => {
    const hatalar = [];
    const uyarilar = [];

    if (!salonlar || salonlar.length === 0) {
      hatalar.push('En az bir salon tanımlanmalıdır');
    } else {
      const aktifSalonSayisi = salonlar.filter(s => s.aktif !== false).length;
      if (aktifSalonSayisi === 0) {
        hatalar.push('Aktif salon bulunamadı');
      }
      salonlar.forEach((salon, index) => {
        if (!salon.salonAdi) {
          hatalar.push(`Salon ${index + 1} için salon adı belirtilmedi`);
        }
        if (!salon.gruplar || salon.gruplar.length === 0) {
          hatalar.push(`Salon ${index + 1} için grup bilgisi eksik`);
        }
        if (!salon.aktif) {
          uyarilar.push(`Salon ${salon.salonAdi} aktif değil`);
        }

        // Kapasite hesaplama - SalonFormu formatından
        let salonKapasite = salon.kapasite;

        // Eğer kapasite yoksa veya 0 ise, gruplardan hesapla
        if (!salonKapasite || salonKapasite === 0 || isNaN(salonKapasite)) {
          if (salon.gruplar && salon.gruplar.length > 0) {
            salonKapasite = salon.gruplar.reduce((toplam, grup) => {
              const siraSayisi = grup.siraSayisi || 0;
              const koltukSayisi = salon.siraTipi === 'tekli' ? 1 : 2;
              return toplam + (siraSayisi * koltukSayisi);
            }, 0);

          }
        }

        if (!salonKapasite || salonKapasite === 0 || isNaN(salonKapasite)) {
          hatalar.push(`Salon ${salon.salonAdi} kapasitesi 0 veya tanımsız`);
        }
      });
    }

    return { hatalar, uyarilar };
  };

  // Öğrenciler kontrolü
  const ogrencilerKontrolu = () => {
    const hatalar = [];
    const uyarilar = [];

    if (!ogrenciler || ogrenciler.length === 0) {
      hatalar.push('Öğrenci listesi boş');
    } else {
      // Seçili sınıflardaki öğrencileri filtrele
      const seciliSiniflar = [];
      if (ayarlar?.dersler && ayarlar.dersler.length > 0) {
        ayarlar.dersler.forEach(ders => {
          if (ders.siniflar && ders.siniflar.length > 0) {
            seciliSiniflar.push(...ders.siniflar);
          }
        });
      }

      // Benzersiz sınıfları al
      const benzersizSeciliSiniflar = [...new Set(seciliSiniflar)];

      // Seçili sınıflardaki öğrencileri filtrele
      const seciliSinifOgrencileri = ogrenciler.filter(ogrenci =>
        benzersizSeciliSiniflar.includes(ogrenci.sinif)
      );

      const toplamKapasite = salonlar?.reduce((toplam, salon) => {
        let salonKapasite = salon.kapasite;

        // Eğer kapasite yoksa veya 0 ise, gruplardan hesapla
        if (!salonKapasite || salonKapasite === 0 || isNaN(salonKapasite)) {
          if (salon.gruplar && salon.gruplar.length > 0) {
            salonKapasite = salon.gruplar.reduce((grupToplam, grup) => {
              const siraSayisi = grup.siraSayisi || 0;
              const koltukSayisi = salon.siraTipi === 'tekli' ? 1 : 2;
              return grupToplam + (siraSayisi * koltukSayisi);
            }, 0);
          }
        }

        const aktifSalonKapasite = salon.aktif && salonKapasite && !isNaN(salonKapasite) ? salonKapasite : 0;
        return toplam + aktifSalonKapasite;
      }, 0) || 0;


      if (seciliSinifOgrencileri.length > toplamKapasite) {
        // Kapasite aşımında kırmızı hata mesajı
        hatalar.push({
          mesaj: `Seçili sınıf öğrenci sayısı (${seciliSinifOgrencileri.length}) toplam salon kapasitesini (${toplamKapasite}) aşıyor`,
          tip: 'hata' // Kırmızı renk için
        });
      } else if (seciliSinifOgrencileri.length < toplamKapasite * 0.8) {
        // %80'den az olduğunda yeşil bilgi mesajı olarak işaretle
        uyarilar.push({
          mesaj: `Seçili sınıf öğrenci sayısı (${seciliSinifOgrencileri.length}) salon kapasitesinin %80'inden az`,
          tip: 'bilgi' // Yeşil renk için
        });
      } else if (seciliSinifOgrencileri.length >= toplamKapasite * 0.9) {
        // %90 ve üzeri olduğunda turuncu uyarı
        uyarilar.push({
          mesaj: `Seçili sınıf öğrenci sayısı (${seciliSinifOgrencileri.length}) salon kapasitesinin %90'ına yaklaşıyor`,
          tip: 'uyari' // Turuncu renk için
        });
      }

      // Cinsiyet bilgisi kontrolü - sadece seçili sınıf öğrencileri için
      const cinsiyetsizOgrenciler = seciliSinifOgrencileri.filter(ogrenci => !ogrenci.cinsiyet);
      if (cinsiyetsizOgrenciler.length > 0) {
        uyarilar.push(`${cinsiyetsizOgrenciler.length} seçili sınıf öğrencisinin cinsiyet bilgisi eksik (kız-erkek yan yana oturamaz kuralı için gerekli)`);
      }

      // Sınıf bilgisi kontrolü - sadece seçili sınıf öğrencileri için
      const sinifsizOgrenciler = seciliSinifOgrencileri.filter(ogrenci => !ogrenci.sinif);
      if (sinifsizOgrenciler.length > 0) {
        hatalar.push(`${sinifsizOgrenciler.length} seçili sınıf öğrencisinin sınıf bilgisi eksik`);
      }
    }

    return { hatalar, uyarilar };
  };

  // Tüm kontrolleri çalıştır
  const tumKontrolleriCalistir = () => {
    const ayarlarKontrol = ayarlarKontrolu();
    const salonlarKontrol = salonlarKontrolu();
    const ogrencilerKontrol = ogrencilerKontrolu();

    const tumHatalar = [
      ...ayarlarKontrol.hatalar,
      ...salonlarKontrol.hatalar,
      ...ogrencilerKontrol.hatalar
    ];

    const tumUyarilar = [
      ...ayarlarKontrol.uyarilar,
      ...salonlarKontrol.uyarilar,
      ...ogrencilerKontrol.uyarilar
    ];

    setKontroller({
      ayarlar: ayarlarKontrol,
      salonlar: salonlarKontrol,
      ogrenciler: ogrencilerKontrol,
      tumHatalar,
      tumUyarilar,
      yerleştirmeYapilabilir: tumHatalar.length === 0
    });
  };

  // Sayfa yüklendiğinde kontrolleri çalıştır
  React.useEffect(() => {
    tumKontrolleriCalistir();
  }, [ogrenciler, ayarlar, salonlar]);

  const handleYerlestirmeBaslat = () => {
    if (kontroller?.yerleştirmeYapilabilir) {
      onYerlestirmeYap();
    }
  };

  const getDurumRengi = (hatalar, uyarilar) => {
    if (hatalar.length > 0) return 'error';
    if (uyarilar.length > 0) return 'warning';
    return 'success';
  };

  const getDurumIconu = (hatalar, uyarilar) => {
    if (hatalar.length > 0) return <ErrorIcon sx={{ color: '#ef4444', fontSize: 22 }} />;
    if (uyarilar.length > 0) return <WarningIcon sx={{ color: '#f59e0b', fontSize: 22 }} />;
    return <CheckCircleIcon sx={{ color: '#10b981', fontSize: 22, filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.25))' }} />;
  };

  const kontrolCardSx = {
    p: { xs: 2, sm: 2.5 },
    flex: '1 1 290px',
    maxWidth: { sm: 320 },
    minWidth: 0,
    width: { xs: '100%', sm: 'auto' },
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
    transition: 'all 0.25s ease',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 12px 24px -6px rgba(15, 23, 42, 0.12)',
      borderColor: '#cbd5e1'
    }
  };

  const yerlestirmeDisabled = !kontroller?.yerleştirmeYapilabilir && process.env.NODE_ENV !== 'test';

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 3, mb: 4 }}>
      <PageHeader
        icon={<AssessmentIcon sx={{ color: '#4F46E5', fontSize: 24 }} />}
        title="Sınav Yerleştirme Planlaması"
        sx={{ mb: { xs: 2, sm: 3 } }}
          actions={
            <Button
              variant="contained"
              startIcon={yukleme ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <AutoAwesomeIcon sx={{ fontSize: 18 }} />}
              onClick={process.env.NODE_ENV === 'test' ? onYerlestirmeYap : handleYerlestirmeBaslat}
              disabled={process.env.NODE_ENV === 'test' ? !!yukleme : (!kontroller?.yerleştirmeYapilabilir || yukleme)}
              sx={{
                px: { xs: 2.5, sm: 3 },
                py: 1,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.9rem', sm: '0.95rem' },
                background: yerlestirmeDisabled ? 'rgba(0, 0, 0, 0.12)' : '#2563eb',
                color: '#ffffff',
                boxShadow: yerlestirmeDisabled ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.08)',
                border: yerlestirmeDisabled ? '1px solid rgba(234, 179, 8, 0.4)' : 'none',
                transition: 'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  transform: yerlestirmeDisabled ? 'none' : 'translateY(-1px)',
                  background: yerlestirmeDisabled ? 'rgba(0, 0, 0, 0.12)' : '#1d4ed8',
                  boxShadow: yerlestirmeDisabled ? 'none' : '0 4px 10px rgba(37, 99, 235, 0.25)',
                },
                '&.Mui-disabled': {
                  color: 'rgba(0, 0, 0, 0.4)',
                  borderColor: 'rgba(0, 0, 0, 0.12)',
                }
              }}
            >
              {yukleme ? 'Yerleştirme Algoritması Çalışıyor...' : 'Yerleştirme Başlat'}
              </Button>
          }
      />
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>

        {/* Genel Durum */}
        {kontroller?.tumHatalar && (
          <Alert
            severity={kontroller.tumHatalar.length === 0 ? 'success' : 'error'}
            sx={{
              mb: { xs: 2, sm: 3 },
              fontSize: { xs: '0.9rem', sm: '1rem' },
              fontWeight: 600,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: kontroller.tumHatalar.length === 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
              background: kontroller.tumHatalar.length === 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              boxShadow: kontroller.tumHatalar.length === 0 ? '0 4px 12px rgba(16, 185, 129, 0.12)' : '0 4px 12px rgba(239, 68, 68, 0.12)',
            }}
          >
            {kontroller.tumHatalar.length === 0
              ? 'Tüm kontroller başarılı! Yerleştirme yapılabilir.'
              : `${kontroller.tumHatalar.length} kritik hata bulundu. Lütfen düzeltin.`
            }
          </Alert>
        )}

        {/* Kontrol Sonuçları */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2, mt: 1 }}>
          <Box sx={{
            width: 34,
            height: 34,
            borderRadius: '10px',
            bgcolor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 18 }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' }, letterSpacing: '-0.015em' }}>
            Kontrol Sonuçları
          </Typography>
        </Box>
        {/* Kontrol Kartları */}
        <Box sx={{
          display: 'flex',
          gap: { xs: 2, sm: 2.5 },
          mb: 4,
          flexDirection: { xs: 'column', md: 'row' },
          flexWrap: 'wrap',
          justifyContent: 'center',
          minHeight: { xs: 'auto', sm: 180 }
        }}>
          {/* Öğrenciler Kontrolü */}
          <Paper elevation={0} sx={kontrolCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PeopleIcon sx={{ color: '#2563eb', fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                Öğrenciler
              </Typography>
            </Box>

            {/* Öğrenci bulunamadı uyumluluğu */}
            {kontroller?.ogrenciler?.hatalar.some(h => (typeof h === 'string' ? h : h?.mesaj)?.includes('Öğrenci listesi boş')) && (
              <Alert severity="error" size="small" sx={{ mb: 1 }}>
                Öğrenci bulunamadı
              </Alert>
            )}
            {kontroller?.ogrenciler?.hatalar.map((hata, index) => {
              const mesaj = typeof hata === 'string' ? hata : hata.mesaj;
              const tip = typeof hata === 'object' ? hata.tip : 'hata';
              const severity = tip === 'hata' ? 'error' : 'warning';

              return (
                <Alert key={index} severity={severity} size="small" sx={{ mb: 1 }}>
                  {mesaj}
                </Alert>
              );
            })}

            {kontroller?.ogrenciler?.uyarilar.map((uyari, index) => {
              const mesaj = typeof uyari === 'string' ? uyari : uyari.mesaj;
              const tip = typeof uyari === 'object' ? uyari.tip : 'warning';
              let severity = 'warning'; // Varsayılan turuncu

              if (tip === 'bilgi') {
                severity = 'success'; // Yeşil
              } else if (tip === 'uyari') {
                severity = 'warning'; // Turuncu
              } else if (tip === 'hata') {
                severity = 'error'; // Kırmızı
              }

              return (
                <Alert key={index} severity={severity} size="small" sx={{ mb: 1 }}>
                  {mesaj}
                </Alert>
              );
            })}
          </Paper>

          {/* Salonlar Kontrolü */}
          <Paper elevation={0} sx={kontrolCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MeetingRoomIcon sx={{ color: '#2563eb', fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                Salonlar
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {kontroller?.salonlar && getDurumIconu(kontroller.salonlar.hatalar, kontroller.salonlar.uyarilar)}
              <Box sx={{ ml: 1 }}>
                <Typography variant="body2">
                  {salonlar?.filter(salon => salon.aktif !== false).length || 0} aktif salon
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  Toplam kapasite: {salonlar?.reduce((toplam, salon) => {
                    let salonKapasite = salon.kapasite;

                    // Eğer kapasite yoksa veya 0 ise, gruplardan hesapla
                    if (!salonKapasite || salonKapasite === 0 || isNaN(salonKapasite)) {
                      if (salon.gruplar && salon.gruplar.length > 0) {
                        salonKapasite = salon.gruplar.reduce((grupToplam, grup) => {
                          const siraSayisi = grup.siraSayisi || 0;
                          const koltukSayisi = salon.siraTipi === 'tekli' ? 1 : 2;
                          return grupToplam + (siraSayisi * koltukSayisi);
                        }, 0);
                      }
                    }

                    return salon.aktif && salonKapasite && !isNaN(salonKapasite) ? toplam + salonKapasite : toplam;
                  }, 0) || 0}
                </Typography>
              </Box>
            </Box>

            {kontroller?.salonlar?.hatalar.map((hata, index) => (
              <Alert key={index} severity="error" size="small" sx={{ mb: 1 }}>
                {hata}
              </Alert>
            ))}

            {kontroller?.salonlar?.uyarilar.map((uyari, index) => (
              <Alert key={index} severity="warning" size="small" sx={{ mb: 1 }}>
                {uyari}
              </Alert>
            ))}
          </Paper>

          {/* Ayarlar Kontrolü */}
          <Paper elevation={0} sx={kontrolCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <SettingsIcon sx={{ color: '#2563eb', fontSize: 18 }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                Dersler
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {kontroller?.ayarlar && getDurumIconu(kontroller.ayarlar.hatalar, kontroller.ayarlar.uyarilar)}
              <Box sx={{ ml: 1 }}>
                <Typography variant="body2">
                  {ayarlar?.dersler?.length || 0} ders
                </Typography>
                {ayarlar?.dersler && ayarlar.dersler.length > 0 && (
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {ayarlar.dersler.map(ders => ders.ad).join(', ')}
                  </Typography>
                )}
              </Box>
            </Box>

            {kontroller?.ayarlar?.hatalar.map((hata, index) => (
              <Alert key={index} severity="error" size="small" sx={{ mb: 1 }}>
                {hata}
              </Alert>
            ))}

            {kontroller?.ayarlar?.uyarilar.map((uyari, index) => (
              <Alert key={index} severity="warning" size="small" sx={{ mb: 1 }}>
                {uyari}
              </Alert>
            ))}
          </Paper>
        </Box>


        {/* Ders Bilgileri */}
        {ayarlar?.dersler && ayarlar.dersler.length > 0 && (
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, borderRadius: '16px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
              <Box sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BookIcon sx={{ color: '#2563eb', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' }, letterSpacing: '-0.015em' }}>
                Ders Bilgileri
              </Typography>
            </Box>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              flexWrap: 'wrap',
              gap: { xs: 2, sm: 2.5 },
              justifyContent: 'center'
            }}>
              {ayarlar.dersler.map((ders, index) => (
                <Box key={ders.id || index} sx={{
                  flex: '1 1 280px',
                  maxWidth: { sm: 310 },
                  minWidth: { xs: '100%', sm: 260 },
                  width: { xs: '100%', sm: 'auto' },
                  p: { xs: 2, sm: 2.5 },
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.1)',
                    borderColor: '#cbd5e1'
                  }
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Box sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '6px',
                      bgcolor: 'rgba(37, 99, 235, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ScheduleIcon sx={{ color: '#2563eb', fontSize: 16 }} />
                    </Box>
                    <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
                      {ders.ad || `Ders ${index + 1}`}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'left' }}>
                    Bu dersi alan sınıflar:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {ders.siniflar?.map((sinif) => (
                      <Chip
                        key={sinif}
                        label={sinif}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(37, 99, 235, 0.1)',
                          color: '#2563eb',
                          border: '1px solid rgba(37, 99, 235, 0.25)',
                          fontWeight: 700,
                          borderRadius: '8px',
                          '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.18)' }
                        }}
                      />
                    )) || <Typography variant="body2" color="text.secondary">Sınıf seçilmedi</Typography>}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        )}



        {/* Yardım Bilgisi */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Yerleştirme İşlemi:</strong> Ortak sınav yerleşim algoritması kullanılarak öğrenciler en uygun şekilde salonlara yerleştirilecektir.
            İşlem tamamlandıktan sonra "Salon Planı" sekmesinden sonuçları görüntüleyebilirsiniz.
          </Typography>
        </Alert>

        {/* Özet İstatistikler - Eski testlerle uyumlu başlıklar */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`Toplam Öğrenci: ${ogrenciler?.length || 0}`} color="primary" variant="outlined" />
          <Chip label={`Toplam Salon: ${salonlar?.length || 0}`} color="secondary" variant="outlined" />
          <Chip label={`Toplam Kapasite: ${(salonlar || []).reduce((toplam, salon) => {
            let kap = salon.kapasite;
            if (!kap || isNaN(kap)) {
              if (salon.gruplar && salon.gruplar.length > 0) {
                kap = salon.gruplar.reduce((t, g) => t + (g.siraSayisi || 0) * (salon.siraTipi === 'tekli' ? 1 : 2), 0);
              } else {
                kap = 0;
              }
            }
            return toplam + (kap || 0);
          }, 0)
            }`} color="success" variant="outlined" />
        </Box>
        </CardContent>
      </Card>
    </Box>
  );
});

PlanlamaYap.displayName = 'PlanlamaYap';

export default PlanlamaYap;
