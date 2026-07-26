import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  Alert,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Paper
} from '@mui/material';
import {
  Check as CheckIcon,
  PushPin as PushPinIcon,
  PersonAdd as PersonAddIcon,
  HighlightOff as HighlightOffIcon,
  Chair as ChairIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  DeleteSweep as DeleteSweepIcon,
  School as SchoolIcon,
  EventSeat as EventSeatIcon
} from '@mui/icons-material';
import { useExam } from '../context/ExamContext';
import { getPozisyon, calculateGroupBasedDeskNumbers } from './SalonPlani/utils';

const SabitAtamalar = () => {
  const { ogrenciler, salonlar, ayarlar, ogrenciPin, ogrenciUnpin, isWriteAllowed } = useExam();
  const readOnly = !isWriteAllowed;

  const [query, setQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedSalonId, setSelectedSalonId] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [viewMode, setViewMode] = useState('schema'); // 'schema' | 'list'
  const [confirmClearSalon, setConfirmClearSalon] = useState(false);

  // Türkçe karakterleri normalize eden fonksiyon
  const normalizeText = useCallback((text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
  }, []);

  // Sınıf seviyesine göre renk belirleme (9: Mavi, 10: Yeşil, 11: Turuncu, 12: Mor)
  const getClassBadgeColor = useCallback((sinifStr) => {
    if (!sinifStr) return { bgcolor: '#e2e8f0', color: '#334155', border: '#cbd5e1' };
    const str = String(sinifStr).trim();
    if (str.startsWith('9')) return { bgcolor: '#dbeafe', color: '#1e40af', border: '#bfdbfe' }; // 9. Sınıf - Mavi
    if (str.startsWith('10')) return { bgcolor: '#dcfce7', color: '#166534', border: '#bbf7d0' }; // 10. Sınıf - Yeşil
    if (str.startsWith('11')) return { bgcolor: '#fef3c7', color: '#92400e', border: '#fde68a' }; // 11. Sınıf - Turuncu
    if (str.startsWith('12')) return { bgcolor: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' }; // 12. Sınıf - Mor
    return { bgcolor: '#f1f5f9', color: '#334155', border: '#cbd5e1' };
  }, []);

  const selectedClasses = useMemo(() => {
    try {
      const dersler = Array.isArray(ayarlar?.dersler) ? ayarlar.dersler : [];
      const siniflar = [];
      dersler.forEach(d => {
        if (Array.isArray(d.siniflar)) siniflar.push(...d.siniflar);
      });
      return Array.from(new Set(siniflar));
    } catch (_) {
      return [];
    }
  }, [ayarlar]);

  const normalizeClassCode = useCallback((value) => {
    if (!value) return '';
    const raw = String(value).trim().toUpperCase().replace(/\s+/g, '');
    const match = raw.match(/^(\d+)([-/.]?)([A-ZÇĞİÖŞÜ]+)?$/);
    if (!match) {
      return raw.replace(/[^\wÇĞİÖŞÜ]/g, '');
    }
    const grade = match[1];
    const section = match[3] ? match[3].replace(/[^A-ZÇĞİÖŞÜ0-9]/g, '') : '';
    return section ? `${grade}-${section}` : grade;
  }, []);

  const classOptions = useMemo(() => {
    const map = new Map();
    selectedClasses.forEach((cls) => {
      const normalized = normalizeClassCode(cls);
      if (normalized) map.set(normalized, normalized);
    });
    ogrenciler.forEach((o) => {
      const normalized = normalizeClassCode(o?.sinif);
      if (normalized) map.set(normalized, normalized);
    });
    const sorted = Array.from(map.keys()).sort((a, b) => {
      const parse = (value) => {
        const match = value.match(/^(\d+)(?:[-\s]?([A-ZÇĞİÖŞÜ0-9]+))?$/);
        return {
          grade: match ? parseInt(match[1], 10) || 0 : 0,
          section: match && match[2] ? match[2] : ''
        };
      };
      const aParsed = parse(a);
      const bParsed = parse(b);
      if (aParsed.grade !== bParsed.grade) {
        return aParsed.grade - bParsed.grade;
      }
      return aParsed.section.localeCompare(bParsed.section, 'tr-TR');
    });
    return ['ALL', ...sorted];
  }, [ogrenciler, selectedClasses, normalizeClassCode]);

  const normalizedSalons = useMemo(() => {
    return salonlar.map((s) => {
      const canonicalId = s?.id ?? s?.salonId ?? s?.salonAdi ?? s?.ad ?? '';
      return {
        ...s,
        canonicalId: String(canonicalId),
        label: s?.salonAdi || s?.ad || String(canonicalId),
        kapasite: Number.isFinite(s?.kapasite) ? s.kapasite : null
      };
    });
  }, [salonlar]);

  const activeSalonId = useMemo(() => {
    if (selectedSalonId) {
      return selectedSalonId;
    }
    if (normalizedSalons.length > 0) {
      return normalizedSalons[0].canonicalId;
    }
    return '';
  }, [normalizedSalons, selectedSalonId]);

  const activeSalon = useMemo(
    () => normalizedSalons.find((s) => s.canonicalId === String(activeSalonId)) || null,
    [normalizedSalons, activeSalonId]
  );

  const normalizedAllowedClasses = useMemo(() => {
    if (!selectedClasses || selectedClasses.length === 0) return null;
    const set = new Set();
    selectedClasses.forEach((cls) => {
      const normalized = normalizeClassCode(cls);
      if (normalized) set.add(normalized);
    });
    return set.size > 0 ? set : null;
  }, [selectedClasses, normalizeClassCode]);

  const filteredStudents = useMemo(() => {
    const q = query.trim();
    const targetClass = selectedClass === 'ALL' ? null : selectedClass;
    const base = ogrenciler.filter((o) => {
      const studentClass = normalizeClassCode(o?.sinif);
      if (targetClass) {
        return studentClass === targetClass;
      }
      if (!normalizedAllowedClasses) return true;
      return normalizedAllowedClasses.has(studentClass);
    });
    if (!q) return base;

    const normalizedQuery = normalizeText(q);
    const qLower = q.toLowerCase();

    return base.filter(o => {
      const ad = o.ad || '';
      const soyad = o.soyad || '';
      const numara = String(o.numara || '');

      const normalizedAd = normalizeText(ad);
      const normalizedSoyad = normalizeText(soyad);

      return normalizedAd.includes(normalizedQuery) ||
        normalizedSoyad.includes(normalizedQuery) ||
        ad.toLowerCase().includes(qLower) ||
        soyad.toLowerCase().includes(qLower) ||
        numara.includes(q);
    });
  }, [ogrenciler, query, selectedClasses, selectedClass, normalizeText, normalizeClassCode, normalizedAllowedClasses]);

  const getSalonAdi = useCallback((salonId) => {
    if (!salonId) return '-';
    const salonKey = String(salonId);
    const salonLookup = salonlar.find((x) => {
      const candidateId = x?.id != null ? String(x.id) : null;
      const candidateSalonId = x?.salonId != null ? String(x.salonId) : null;
      return candidateId === salonKey || candidateSalonId === salonKey;
    });

    if (salonLookup) {
      return salonLookup.salonAdi || salonLookup.ad || salonLookup.name || salonLookup.label || salonLookup.id || salonKey;
    }

    const fallbackSalon = salonlar.find((x) => (x?.salonAdi || x?.ad) && String(x?.salonAdi || x?.ad) === salonKey);
    if (fallbackSalon) {
      return fallbackSalon.salonAdi || fallbackSalon.ad;
    }

    return salonKey;
  }, [salonlar]);

  // Seçili salonda sabitli öğrenciler listesi
  const pinnedStudentsInSalon = useMemo(() => {
    if (!activeSalonId) return [];
    return ogrenciler.filter(o => o.pinned && String(o.pinnedSalonId) === String(activeSalonId));
  }, [ogrenciler, activeSalonId]);

  // Salon oturma düzeni oluşturma (SalonPlani.js ile birebir aynı grup numaralandırması ve sıralama)
  const sinifDuzeni = useMemo(() => {
    if (!activeSalon) return null;
    const sinif = activeSalon;

    const buildGroupedLayout = (masalarArray, satirCount, sutunCount) => {
      // 1) Masa numaralarını grup sırasına göre hesapla (SalonPlani/utils -> calculateGroupBasedDeskNumbers)
      const masalarWithGroupNumbers = calculateGroupBasedDeskNumbers(masalarArray);

      // 2) Numaralandırılmış masalardan grupları oluştur
      const grupMasalar = {};
      masalarWithGroupNumbers.forEach(masa => {
        const grup = masa.grup || 1;
        if (!grupMasalar[grup]) {
          grupMasalar[grup] = [];
        }
        grupMasalar[grup].push(masa);
      });

      // 3) Her grubun içindeki masaları satır ve sütun sırasına göre (masaNumarasi sırası) sırala
      Object.keys(grupMasalar).forEach(grupId => {
        grupMasalar[grupId].sort((a, b) => {
          if (a.satir !== b.satir) return a.satir - b.satir;
          return a.sutun - b.sutun;
        });
      });

      return {
        satirSayisi: satirCount,
        sutunSayisi: sutunCount,
        masalar: masalarWithGroupNumbers,
        gruplar: grupMasalar
      };
    };

    // 1) Eğer sinif.masalar varsa
    if (sinif.masalar && sinif.masalar.length > 0) {
      const mapped = sinif.masalar.map(m => ({
        ...m,
        pozisyon: getPozisyon(m.satir, m.sutun, 10, 10)
      }));
      return buildGroupedLayout(mapped, 10, 10);
    }

    // 2) Eğer sinif.siraTipi ve sinif.gruplar varsa
    if (sinif.siraTipi && sinif.gruplar && Array.isArray(sinif.gruplar) && sinif.gruplar.length > 0) {
      const { siraTipi, gruplar } = sinif;
      const masalar = [];
      let masaIndex = 0;
      const siraSayilari = gruplar.map(g => g?.siraSayisi || 0).filter(s => s > 0);
      const maxSiraSayisi = siraSayilari.length > 0 ? Math.max(...siraSayilari) : 6;

      for (let satir = 0; satir < maxSiraSayisi; satir++) {
        gruplar.forEach((grup, grupIndex) => {
          const grupSiraSayisi = grup?.siraSayisi || 0;
          if (grupSiraSayisi > 0 && satir < grupSiraSayisi) {
            if (siraTipi === 'tekli') {
              masalar.push({
                id: masaIndex++,
                satir: satir,
                sutun: grupIndex,
                grup: grup?.id || (grupIndex + 1),
                koltukTipi: 'tekli',
                grupSira: grupIndex,
                pozisyon: getPozisyon(satir, grupIndex, maxSiraSayisi, gruplar.length)
              });
            } else { // ikili
              masalar.push({
                id: masaIndex++,
                satir: satir,
                sutun: grupIndex * 2,
                grup: grup?.id || (grupIndex + 1),
                koltukTipi: 'ikili-sol',
                grupSira: grupIndex,
                pozisyon: getPozisyon(satir, grupIndex * 2, maxSiraSayisi, gruplar.length * 2)
              });
              masalar.push({
                id: masaIndex++,
                satir: satir,
                sutun: grupIndex * 2 + 1,
                grup: grup?.id || (grupIndex + 1),
                koltukTipi: 'ikili-sag',
                grupSira: grupIndex,
                pozisyon: getPozisyon(satir, grupIndex * 2 + 1, maxSiraSayisi, gruplar.length * 2)
              });
            }
          }
        });
      }

      return buildGroupedLayout(masalar, maxSiraSayisi, siraTipi === 'tekli' ? gruplar.length : gruplar.length * 2);
    }

    // 3) Fallback basit matris
    const kapasite = sinif.kapasite || 30;
    const satirSayisi = Math.ceil(Math.sqrt(kapasite));
    const sutunSayisi = Math.ceil(kapasite / satirSayisi);
    const masalar = [];
    for (let i = 0; i < satirSayisi; i++) {
      for (let j = 0; j < sutunSayisi; j++) {
        const masaIndex = i * sutunSayisi + j;
        if (masaIndex < kapasite) {
          masalar.push({
            id: masaIndex,
            satir: i,
            sutun: j,
            grup: 1,
            koltukTipi: 'normal',
            pozisyon: getPozisyon(i, j, satirSayisi, sutunSayisi)
          });
        }
      }
    }
    return buildGroupedLayout(masalar, satirSayisi, sutunSayisi);
  }, [activeSalon]);

  // Koltuk (masa.id) ile ona atanmış öğrenciyi eşleyen harita
  const seatStudentMap = useMemo(() => {
    const map = {};
    if (!sinifDuzeni || !sinifDuzeni.masalar) return map;

    // 1) Spesifik masaId'si olanları koltuğa koy
    const unassignedPinned = [];
    pinnedStudentsInSalon.forEach(o => {
      if (o.pinnedMasaId != null && o.pinnedMasaId !== '') {
        map[String(o.pinnedMasaId)] = { student: o, explicit: true };
      } else {
        unassignedPinned.push(o);
      }
    });

    // 2) Spesifik masaId'si olmayanları (salon bazlı sabitlenenleri) boş koltuklara sırayla koy
    let unassignedIndex = 0;
    sinifDuzeni.masalar.forEach(masa => {
      const key = String(masa.id);
      if (!map[key] && unassignedIndex < unassignedPinned.length) {
        map[key] = { student: unassignedPinned[unassignedIndex], explicit: false };
        unassignedIndex++;
      }
    });

    return map;
  }, [sinifDuzeni, pinnedStudentsInSalon]);

  // Koltuğa sabitleme aksiyonu
  const handlePinToSeat = useCallback((masaId) => {
    if (readOnly || !activeSalonId || !selectedStudentIds.length) return;
    const studentId = selectedStudentIds[0];
    ogrenciPin(studentId, activeSalonId, masaId);
    setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
  }, [readOnly, activeSalonId, selectedStudentIds, ogrenciPin]);

  // Boş ilk sıraya sabitleme
  const handlePinToFirstEmptySeat = useCallback(() => {
    if (readOnly || !selectedStudentIds.length || !activeSalonId || !sinifDuzeni) return;
    const studentId = selectedStudentIds[0];
    const emptyMasa = sinifDuzeni.masalar.find(m => !seatStudentMap[String(m.id)]);
    if (emptyMasa) {
      ogrenciPin(studentId, activeSalonId, emptyMasa.id);
    } else {
      ogrenciPin(studentId, activeSalonId, null);
    }
    setSelectedStudentIds([]);
  }, [readOnly, selectedStudentIds, activeSalonId, sinifDuzeni, seatStudentMap, ogrenciPin]);

  // Öğrencinin sabit atamasını kaldırma
  const handleUnpinStudent = useCallback((studentId) => {
    if (readOnly || !studentId) return;
    ogrenciUnpin(studentId);
  }, [readOnly, ogrenciUnpin]);

  // Salondaki tüm sabit atamaları temizleme
  const handleClearSalonPins = useCallback(() => {
    if (readOnly || !activeSalonId) return;
    pinnedStudentsInSalon.forEach(o => {
      ogrenciUnpin(o.id);
    });
    setConfirmClearSalon(false);
  }, [readOnly, activeSalonId, pinnedStudentsInSalon, ogrenciUnpin]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentIds || selectedStudentIds.length === 0) return null;
    return ogrenciler.find((o) => o.id === selectedStudentIds[0]) || null;
  }, [selectedStudentIds, ogrenciler]);

  const salonKapasite = activeSalon?.kapasite || sinifDuzeni?.masalar?.length || 0;
  const salonDolulukOrani = salonKapasite > 0 ? Math.round((pinnedStudentsInSalon.length / salonKapasite) * 100) : 0;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', mt: 2, px: { xs: 1, sm: 2 } }}>
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', mb: 3 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
          {/* Üst Başlık */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PushPinIcon sx={{ color: '#2563eb', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h6" component="h1" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' }, color: '#0f172a', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Sabit Atamalar & Görsel Oturma Şeması
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Özel durumlu veya ön sırada oturması gereken öğrencileri istediğiniz koltuğa kolayca sabitleyin
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<SchoolIcon fontSize="small" />}
                label={`Toplam Sabit: ${ogrenciler.filter(o => o.pinned).length} öğrenci`}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Box>
          </Box>

          {/* Salon Kapasite Sekmeleri / Kartları (Yatay Kaydırılabilir Bar) */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              pb: 1,
              mb: 2,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 3 }
            }}
          >
            {normalizedSalons.map((s) => {
              const isSelected = String(s.canonicalId) === String(activeSalonId);
              const pinnedCount = ogrenciler.filter(o => o.pinned && String(o.pinnedSalonId) === String(s.canonicalId)).length;
              const capacity = s.kapasite || 0;
              const isFull = capacity > 0 && pinnedCount >= capacity;

              return (
                <Paper
                  key={`salon-tab-${s.canonicalId}`}
                  onClick={() => setSelectedSalonId(s.canonicalId)}
                  elevation={isSelected ? 3 : 0}
                  sx={{
                    px: 1.75,
                    py: 1,
                    minWidth: 130,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: isSelected ? 'primary.main' : '#e2e8f0',
                    bgcolor: isSelected ? '#eff6ff' : '#ffffff',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: isSelected ? '#eff6ff' : '#f8fafc'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.82rem', color: isSelected ? 'primary.main' : 'text.primary' }}>
                      {s.label}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${pinnedCount}/${capacity || '?'}`}
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: isFull ? '#fee2e2' : (pinnedCount > 0 ? '#dbeafe' : '#f1f5f9'),
                        color: isFull ? '#b91c1c' : (pinnedCount > 0 ? '#1e40af' : '#64748b')
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.68rem', fontWeight: 500 }}>
                    {pinnedCount === 0 ? 'Boş salon' : `${pinnedCount} sabit öğrenci`}
                  </Typography>
                </Paper>
              );
            })}
          </Box>

          {readOnly && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Bu bölüm görüntüleme modundadır. Yönetici girişi yapmadan sabit atama ekleyemez veya silemezsiniz.
            </Alert>
          )}

          {/* Ana İki Kolonlu İçerik: Sol (Öğrenci Listesi) | Sağ (Salon Şeması) */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              alignItems: 'flex-start',
              gap: 2.5
            }}
          >
            {/* SOL KOLON: Öğrenci Arama & Liste (Kompaktlaştırıldı) */}
            <Box sx={{ width: { xs: '100%', lg: 310 }, flexShrink: 0 }}>
              <Card variant="outlined" sx={{ borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <CardContent sx={{ p: 1.75 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25, color: '#1e293b', fontSize: '0.85rem' }}>
                    1. Öğrenci Seçin
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                    <TextField
                      label="Öğrenci Ara (Ad, Soyad, No)"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      size="small"
                      fullWidth
                      disabled={readOnly}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    />
                    <TextField
                      select
                      label="Sınıf Filtresi"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      size="small"
                      fullWidth
                      disabled={readOnly && classOptions.length === 0}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    >
                      {classOptions.map((sinif) => (
                        <MenuItem key={`sinif-${sinif}`} value={sinif}>
                          {sinif === 'ALL' ? 'Tüm Sınıflar' : sinif}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  {/* Seçili Öğrenci İpucu Kutusu */}
                  {selectedStudent ? (
                    <Alert
                      severity="info"
                      icon={<PersonAddIcon fontSize="small" />}
                      sx={{ mb: 1.5, borderRadius: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', py: 0.25 }}
                      action={
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={handlePinToFirstEmptySeat}
                          disabled={readOnly}
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.72rem', px: 1.2 }}
                        >
                          İlk Boşa Koy
                        </Button>
                      }
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e3a8a', display: 'block', fontSize: '0.72rem' }}>
                        {selectedStudent.ad} {selectedStudent.soyad} ({selectedStudent.sinif})
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#3b82f6', fontSize: '0.68rem' }}>
                        Sağdaki şemadan boş koltuğa tıklayın.
                      </Typography>
                    </Alert>
                  ) : (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.25, fontStyle: 'italic', fontSize: '0.7rem' }}>
                      💡 Listeden öğrenci seçip şemadan koltuğa tıklayın.
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>
                      ÖĞRENCİLER ({filteredStudents.length})
                    </Typography>
                    {selectedStudentIds.length > 0 && (
                      <Button
                        size="small"
                        onClick={() => setSelectedStudentIds([])}
                        sx={{ fontSize: '0.7rem', p: 0, minWidth: 'auto', textTransform: 'none' }}
                      >
                        Seçimi İptal Et
                      </Button>
                    )}
                  </Box>

                  <List dense sx={{ maxHeight: 420, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 2 }}>
                    {filteredStudents.slice(0, 300).map((o) => {
                      const isPinnedHere = o.pinned && String(o.pinnedSalonId) === String(activeSalonId);
                      const isSelected = selectedStudentIds.includes(o.id);
                      const classStyle = getClassBadgeColor(o.sinif);

                      return (
                        <ListItem
                          key={`ogrenci-${o.id}`}
                          button
                          selected={isSelected}
                          onClick={() => setSelectedStudentIds([o.id])}
                          onDoubleClick={() => {
                            if (!readOnly) handlePinToFirstEmptySeat();
                          }}
                          sx={{
                            borderRadius: 1.5,
                            mb: 0.5,
                            borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                            bgcolor: isSelected ? '#eff6ff' : (isPinnedHere ? '#f0fdf4' : undefined),
                            '&:hover': { bgcolor: isSelected ? '#dbeafe' : '#f8fafc' }
                          }}
                          disabled={readOnly}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
                                  {o.ad} {o.soyad}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={o.sinif || '-'}
                                  sx={{
                                    height: 16,
                                    fontSize: '0.64rem',
                                    fontWeight: 700,
                                    bgcolor: classStyle.bgcolor,
                                    color: classStyle.color,
                                    border: `1px solid ${classStyle.border}`
                                  }}
                                />
                              </Box>
                            }
                            secondary={`Okul No: ${o.numara || '-'}`}
                            secondaryTypographyProps={{ fontSize: '0.68rem' }}
                          />
                          <ListItemSecondaryAction>
                            {o.pinned ? (
                              <Tooltip title={`${getSalonAdi(o.pinnedSalonId)} salonunda sabit${o.pinnedMasaId ? ` • Sıra #${o.pinnedMasaId}` : ''}`}>
                                <Chip
                                  size="small"
                                  color={isPinnedHere ? 'success' : 'default'}
                                  icon={isPinnedHere ? <CheckIcon fontSize="small" /> : <PushPinIcon fontSize="small" />}
                                  label={isPinnedHere ? (o.pinnedMasaId ? `#${o.pinnedMasaId}` : 'Salonda') : getSalonAdi(o.pinnedSalonId)}
                                  onDelete={!readOnly ? () => handleUnpinStudent(o.id) : undefined}
                                  sx={{ height: 20, fontSize: '0.66rem', fontWeight: 600 }}
                                />
                              </Tooltip>
                            ) : (
                              !readOnly && (
                                <Tooltip title="İlk boş koltuğa sabitle">
                                  <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStudentIds([o.id]);
                                      setTimeout(() => handlePinToFirstEmptySeat(), 50);
                                    }}
                                  >
                                    <PersonAddIcon fontSize="small" color="primary" />
                                  </IconButton>
                                </Tooltip>
                              )
                            )}
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <ListItem>
                        <ListItemText primary="Eşleşen öğrenci bulunamadı." sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.78rem' }} />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Box>

            {/* SAĞ KOLON: Salon Görsel Şeması (Tam Sığacak Şekilde Kompakt ve Esnek) */}
            <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
              <Card variant="outlined" sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {/* Şema Üst Bar */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'stretch', sm: 'center' },
                    gap: 1,
                    p: 1.75,
                    bgcolor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0'
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventSeatIcon sx={{ color: 'primary.main', fontSize: 19 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                        {activeSalon ? `${activeSalon.label} Oturma Şeması` : 'Salon Seçin'}
                      </Typography>
                    </Box>
                    {activeSalon && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.72rem' }}>
                        Kapasite: {salonKapasite} • Sabitlenen: {pinnedStudentsInSalon.length} • Boş: {Math.max(0, salonKapasite - pinnedStudentsInSalon.length)}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', p: 0.25, bgcolor: '#ffffff' }}>
                      <Tooltip title="Görsel Koltuk Şeması">
                        <IconButton
                          size="small"
                          onClick={() => setViewMode('schema')}
                          color={viewMode === 'schema' ? 'primary' : 'default'}
                          sx={{ bgcolor: viewMode === 'schema' ? '#eff6ff' : 'transparent', borderRadius: '6px', p: 0.5 }}
                        >
                          <ViewModuleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Klasik Liste Görünümü">
                        <IconButton
                          size="small"
                          onClick={() => setViewMode('list')}
                          color={viewMode === 'list' ? 'primary' : 'default'}
                          sx={{ bgcolor: viewMode === 'list' ? '#eff6ff' : 'transparent', borderRadius: '6px', p: 0.5 }}
                        >
                          <ViewListIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {!readOnly && pinnedStudentsInSalon.length > 0 && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteSweepIcon fontSize="small" />}
                        onClick={() => setConfirmClearSalon(true)}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', fontSize: '0.75rem' }}
                      >
                        Salonu Temizle
                      </Button>
                    )}
                  </Box>
                </Box>

                <CardContent sx={{ p: { xs: 1.25, sm: 2 }, minHeight: 400 }}>
                  {!activeSalon ? (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                      Lütfen üstten bir salon seçin.
                    </Alert>
                  ) : viewMode === 'schema' ? (
                    /* ================= GÖRSEL OTURMA ŞEMASI (EKRANA TAM SIĞAN KOMPAKT YAPIDA) ================= */
                    <Box>
                      {/* Sınıf dağılımı özet lejantı */}
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2, alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 0.25, fontSize: '0.72rem' }}>
                          Sınıf Dağılımı:
                        </Typography>
                        {['9', '10', '11', '12'].map((g) => {
                          const count = pinnedStudentsInSalon.filter(o => String(o.sinif || '').trim().startsWith(g)).length;
                          if (count === 0) return null;
                          const style = getClassBadgeColor(g);
                          return (
                            <Chip
                              key={`badge-${g}`}
                              size="small"
                              label={`${g}. Sınıf: ${count} öğrenci`}
                              sx={{
                                height: 20,
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                bgcolor: style.bgcolor,
                                color: style.color,
                                border: `1px solid ${style.border}`
                              }}
                            />
                          );
                        })}
                        {pinnedStudentsInSalon.length === 0 && (
                          <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.72rem' }}>
                            Henüz bu salona sabitlenmiş öğrenci bulunmamaktadır.
                          </Typography>
                        )}
                      </Box>

                      {/* Koltuk Grupları (Grup 1, Grup 2... Ekran Genişliğine Tam Sığacak Şekilde) */}
                      {sinifDuzeni?.gruplar && Object.keys(sinifDuzeni.gruplar).length > 0 ? (
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            flexWrap: 'wrap',
                            gap: { xs: 1, sm: 1.25 },
                            justifyContent: 'center',
                            alignItems: { xs: 'center', sm: 'flex-start' },
                            width: '100%',
                            minWidth: 0
                          }}
                        >
                          {Object.keys(sinifDuzeni.gruplar).map((grupId, index) => {
                            const grupMasalar = sinifDuzeni.gruplar[grupId];
                            if (!grupMasalar || !Array.isArray(grupMasalar)) return null;

                            return (
                              <Box
                                key={`grup-${grupId}`}
                                sx={{
                                  flex: '0 1 270px',
                                  minWidth: '220px',
                                  maxWidth: '270px',
                                  width: '100%',
                                  bgcolor: '#f8fafc',
                                  p: { xs: 0.75, sm: 1 },
                                  borderRadius: '10px',
                                  border: '1px solid #e2e8f0',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    textAlign: 'center',
                                    fontWeight: 800,
                                    color: '#475569',
                                    mb: 1,
                                    fontSize: '0.78rem',
                                    borderBottom: '1px solid #e2e8f0',
                                    pb: 0.5
                                  }}
                                >
                                  Grup {index + 1}
                                </Typography>

                                <Box
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                    gap: 0.6
                                  }}
                                >
                                  {grupMasalar.map((masa) => {
                                    const seatEntry = seatStudentMap[String(masa.id)];
                                    const student = seatEntry?.student || null;
                                    const isSelectedStudent = selectedStudentIds.includes(student?.id);
                                    const classStyle = student ? getClassBadgeColor(student.sinif) : null;

                                    return (
                                      <Paper
                                        key={`masa-${masa.id}`}
                                        elevation={student ? (isSelectedStudent ? 6 : 1) : 0}
                                        onClick={() => {
                                          if (!readOnly && !student && selectedStudent) {
                                            handlePinToSeat(masa.id);
                                          }
                                        }}
                                        sx={{
                                          p: 0.75,
                                          borderRadius: '8px',
                                          minHeight: 58,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          justifyContent: 'space-between',
                                          position: 'relative',
                                          cursor: !readOnly && !student && selectedStudent ? 'pointer' : 'default',
                                          border: '1.5px solid',
                                          borderColor: student
                                            ? classStyle.border
                                            : (!readOnly && selectedStudent ? '#93c5fd' : '#e2e8f0'),
                                          bgcolor: student
                                            ? classStyle.bgcolor
                                            : (!readOnly && selectedStudent ? '#eff6ff' : '#ffffff'),
                                          transition: 'all 0.15s ease',
                                          '&:hover': {
                                            transform: !readOnly && !student && selectedStudent ? 'scale(1.02)' : 'none',
                                            borderColor: !readOnly && !student && selectedStudent ? 'primary.main' : undefined,
                                            boxShadow: !readOnly && !student && selectedStudent ? 2 : undefined
                                          }
                                        }}
                                      >
                                        {/* Masa Numarası Badge (SalonPlani ile Birebir Aynı Sıralama) */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.62rem' }}>
                                            #Sıra {masa.masaNumarasi || (masa.id + 1)}
                                          </Typography>

                                          {/* Öğrenci var ise kaldır ikonu */}
                                          {student && !readOnly && (
                                            <Tooltip title="Sabit atamayı kaldır">
                                              <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUnpinStudent(student.id);
                                                }}
                                                sx={{ p: 0.15, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                              >
                                                <HighlightOffIcon sx={{ fontSize: 15 }} />
                                              </IconButton>
                                            </Tooltip>
                                          )}
                                        </Box>

                                        {/* Koltuk İçerik */}
                                        {student ? (
                                          <Box sx={{ mt: 0.35 }}>
                                            <Typography
                                              variant="body2"
                                              sx={{
                                                fontWeight: 800,
                                                fontSize: '0.72rem',
                                                color: '#0f172a',
                                                lineHeight: 1.15,
                                                mb: 0.35,
                                                wordBreak: 'break-word',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                              }}
                                              title={`${student.ad} ${student.soyad}`}
                                            >
                                              {student.ad} {student.soyad}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                              <Chip
                                                size="small"
                                                label={student.sinif || '-'}
                                                sx={{
                                                  height: 15,
                                                  fontSize: '0.6rem',
                                                  fontWeight: 700,
                                                  bgcolor: '#ffffff',
                                                  color: classStyle.color,
                                                  border: `1px solid ${classStyle.border}`
                                                }}
                                              />
                                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.6rem' }}>
                                                No: {student.numara || '-'}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        ) : (
                                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', my: 'auto', py: 0.25 }}>
                                            <ChairIcon sx={{ fontSize: 16, color: !readOnly && selectedStudent ? '#3b82f6' : '#cbd5e1', mb: 0.15 }} />
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                fontWeight: 700,
                                                fontSize: '0.63rem',
                                                color: !readOnly && selectedStudent ? '#1d4ed8' : '#94a3b8'
                                              }}
                                            >
                                              {!readOnly && selectedStudent ? '➕ Buraya Koy' : 'Boş'}
                                            </Typography>
                                          </Box>
                                        )}
                                      </Paper>
                                    );
                                  })}
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      ) : (
                        <Alert severity="info">Bu salon için oturma düzeni tanımlanmamış.</Alert>
                      )}
                    </Box>
                  ) : (
                    /* ================= KLASİK LİSTE GÖRÜNÜMÜ ================= */
                    <Box>
                      <List dense disablePadding>
                        {pinnedStudentsInSalon.map((o) => {
                          const classStyle = getClassBadgeColor(o.sinif);
                          return (
                            <ListItem
                              key={`list-pinned-${o.id}`}
                              sx={{
                                border: '1px solid #e2e8f0',
                                borderRadius: 2,
                                mb: 1,
                                bgcolor: '#ffffff'
                              }}
                              secondaryAction={
                                !readOnly && (
                                  <Tooltip title="Sabit atamayı kaldır">
                                    <IconButton edge="end" size="small" onClick={() => handleUnpinStudent(o.id)}>
                                      <HighlightOffIcon fontSize="small" color="error" />
                                    </IconButton>
                                  </Tooltip>
                                )
                              }
                            >
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                      {o.ad} {o.soyad}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={o.sinif || '-'}
                                      sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        bgcolor: classStyle.bgcolor,
                                        color: classStyle.color,
                                        border: `1px solid ${classStyle.border}`
                                      }}
                                    />
                                    {o.pinnedMasaId && (
                                      <Chip
                                        size="small"
                                        label={`Sıra #${o.pinnedMasaId}`}
                                        color="primary"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                      />
                                    )}
                                  </Box>
                                }
                                secondary={`Okul No: ${o.numara || '-'}`}
                              />
                            </ListItem>
                          );
                        })}
                        {pinnedStudentsInSalon.length === 0 && (
                          <ListItem>
                            <ListItemText primary="Henüz bu salona sabitlenmiş öğrenci bulunmuyor." sx={{ textAlign: 'center', color: 'text.secondary' }} />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Salonu Temizle Onay Dialogu */}
      <Dialog open={confirmClearSalon} onClose={() => setConfirmClearSalon(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Salondaki Sabit Atamaları Temizle
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{activeSalon?.label}</strong> salonundaki toplam <strong>{pinnedStudentsInSalon.length}</strong> sabit öğrenci atamasını kaldırmak istediğinizden emin misiniz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearSalon(false)} sx={{ fontWeight: 700 }}>
            Vazgeç
          </Button>
          <Button onClick={handleClearSalonPins} color="error" variant="contained" sx={{ fontWeight: 700 }}>
            Evet, Tümünü Kaldır
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SabitAtamalar;
