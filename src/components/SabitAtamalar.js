import React, { useState, useMemo, useCallback, useEffect } from 'react';
import PageHeader from './common/PageHeader';
import DialogHeader from './common/DialogHeader';
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
  ListItemButton,
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
  Delete as DeleteIcon,
  School as SchoolIcon,
  EventSeat as EventSeatIcon
} from '@mui/icons-material';
import { useExamSelector } from '../context/ExamContext';
import { getPozisyon, calculateGroupBasedDeskNumbers } from './SalonPlani/utils';

const SabitAtamalar = () => {
  const ogrenciler = useExamSelector((state) => state.ogrenciler);
  const salonlar = useExamSelector((state) => state.salonlar);
  const ayarlar = useExamSelector((state) => state.ayarlar);
  const ogrenciPin = useExamSelector((state) => state.pinOgrenci);
  const ogrenciUnpin = useExamSelector((state) => state.unpinOgrenci);
  const role = useExamSelector((state) => state.role);
  const isWriteAllowed = role === 'admin';
  const readOnly = !isWriteAllowed;

  const [query, setQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedSalonId, setSelectedSalonId] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [viewMode, setViewMode] = useState('schema'); // 'schema' | 'list'
  const [confirmClearSalon, setConfirmClearSalon] = useState(false);

  const normalizeId = useCallback((value) => (value != null ? String(value) : ''), []);
  const getStudentKey = useCallback((student) => normalizeId(student?.id ?? student?.numara), [normalizeId]);

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

  // Kendi kendini onaran güvenlik ağı: Farklı nedenlerle (eski/bozuk veri, geçmiş
  // sürüm hataları vb.) iki öğrenci aynı koltuğa (pinnedMasaId) atanmış durumda
  // kalırsa, bunu tespit edip çakışan (ilk öğrenci dışındaki) atamaları otomatik
  // olarak kaldırır. Böylece kullanıcının elle silip yeniden atama yapmasına
  // gerek kalmaz.
  useEffect(() => {
    if (readOnly || !activeSalonId || pinnedStudentsInSalon.length === 0) return;
    const seenMasaIds = new Set();
    const duplicateStudentKeys = [];
    pinnedStudentsInSalon.forEach(o => {
      if (o.pinnedMasaId == null || o.pinnedMasaId === '') return;
      const key = String(o.pinnedMasaId);
      if (seenMasaIds.has(key)) {
        duplicateStudentKeys.push(getStudentKey(o));
      } else {
        seenMasaIds.add(key);
      }
    });
    if (duplicateStudentKeys.length > 0) {
      duplicateStudentKeys.forEach(studentKey => ogrenciUnpin(studentKey));
    }
  }, [pinnedStudentsInSalon, activeSalonId, readOnly, ogrenciUnpin, getStudentKey]);

  // Koltuk (masa) id'lerinin TEKİL olmasını garanti eder.
  // Bazı eski/kayıtlı salon verilerinde (Kayıtlı Planlar, yerleştirme algoritması vb.
  // farklı kaynaklardan üretilmiş masa dizileri) birden fazla koltuk aynı .id değerine
  // sahip olabiliyor. Bu durum, sabit atamada iki farklı öğrencinin aynı koltuğa
  // atanmış gibi görünmesine (veri çakışmasına) yol açıyordu. Burada, orijinal id
  // korunur ama tekil değilse dizideki konumuna (index) göre güvenli bir id atanır.
  const ensureUniqueMasaIds = useCallback((masalarArray) => {
    if (!Array.isArray(masalarArray)) return masalarArray;
    const seenIds = new Set();
    return masalarArray.map((masa, idx) => {
      const originalKey = masa?.id != null ? String(masa.id) : null;
      let safeId = masa?.id;
      if (originalKey == null || seenIds.has(originalKey)) {
        safeId = idx;
      }
      seenIds.add(String(safeId));
      return { ...masa, id: safeId };
    });
  }, []);

  // Salon oturma düzeni oluşturma (SalonPlani.js ile birebir aynı grup numaralandırması ve sıralama)
  const sinifDuzeni = useMemo(() => {
    if (!activeSalon) return null;
    const sinif = activeSalon;

    const buildGroupedLayout = (masalarArray, satirCount, sutunCount) => {
      // 0) Koltuk id'lerinin tekil olduğundan emin ol (bkz. ensureUniqueMasaIds açıklaması)
      const uniqueMasalarArray = ensureUniqueMasaIds(masalarArray);

      // 1) Masa numaralarını grup sırasına göre hesapla (SalonPlani/utils -> calculateGroupBasedDeskNumbers)
      const masalarWithGroupNumbers = calculateGroupBasedDeskNumbers(uniqueMasalarArray);

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
  }, [activeSalon, ensureUniqueMasaIds]);

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
    const studentId = normalizeId(selectedStudentIds[0]);
    if (!studentId) return;
    ogrenciPin(studentId, activeSalonId, masaId);
    setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
  }, [readOnly, activeSalonId, selectedStudentIds, ogrenciPin, normalizeId]);

  // Boş ilk sıraya sabitleme (öğrenci anahtarı doğrudan parametre olarak alınır;
  // component state/selectedStudentIds'e bağımlı olmadığı için stale closure riski yoktur)
  const pinStudentToFirstEmptySeat = useCallback((studentKey) => {
    if (readOnly || !studentKey || !activeSalonId || !sinifDuzeni) return;
    const emptyMasa = sinifDuzeni.masalar.find(m => !seatStudentMap[String(m.id)]);
    if (emptyMasa) {
      ogrenciPin(studentKey, activeSalonId, emptyMasa.id);
    } else {
      ogrenciPin(studentKey, activeSalonId, null);
    }
    setSelectedStudentIds(prev => prev.filter(id => id !== studentKey));
  }, [readOnly, activeSalonId, sinifDuzeni, seatStudentMap, ogrenciPin]);

  const handlePinToFirstEmptySeat = useCallback(() => {
    if (!selectedStudentIds.length) return;
    const studentId = normalizeId(selectedStudentIds[0]);
    pinStudentToFirstEmptySeat(studentId);
  }, [selectedStudentIds, normalizeId, pinStudentToFirstEmptySeat]);

  // Öğrencinin sabit atamasını kaldırma
  const handleUnpinStudent = useCallback((studentId) => {
    if (readOnly || !studentId) return;
    ogrenciUnpin(studentId);
  }, [readOnly, ogrenciUnpin]);

  // Salondaki tüm sabit atamaları temizleme
  const handleClearSalonPins = useCallback(() => {
    if (readOnly || !activeSalonId) return;
    pinnedStudentsInSalon.forEach(o => {
      ogrenciUnpin(getStudentKey(o));
    });
    setConfirmClearSalon(false);
  }, [readOnly, activeSalonId, pinnedStudentsInSalon, ogrenciUnpin, getStudentKey]);

  const hasSelectedStudent = selectedStudentIds.length > 0 && normalizeId(selectedStudentIds[0]) !== '';

  const selectedStudent = useMemo(() => {
    if (!selectedStudentIds || selectedStudentIds.length === 0) return null;
    const selectedId = normalizeId(selectedStudentIds[0]);
    return ogrenciler.find((o) => getStudentKey(o) === selectedId) || null;
  }, [selectedStudentIds, ogrenciler, normalizeId, getStudentKey]);

  const salonKapasite = activeSalon?.kapasite || sinifDuzeni?.masalar?.length || 0;
  const salonDolulukOrani = salonKapasite > 0 ? Math.round((pinnedStudentsInSalon.length / salonKapasite) * 100) : 0;

  return (
    <Box sx={{ width: '100%', mt: 0, mb: 4 }}>
      <PageHeader
        icon={<PushPinIcon sx={{ color: '#4F46E5', fontSize: 24 }} />}
        title="Sabit Atamalar & Görsel Oturma Şeması"
        actions={
          <Chip
            icon={<SchoolIcon fontSize="small" />}
            label={`Toplam Sabit: ${ogrenciler.filter(o => o.pinned).length} öğrenci`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        }
      />
      <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', mb: 4 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>

          {/* Salon Kapasite Sekmeleri / Kartları (Yatay Kaydırılabilir Bar) */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              mb: 3
            }}
          >
            {normalizedSalons.map((s) => {
              const isSelected = String(s.canonicalId) === String(activeSalonId);
              const pinnedCount = ogrenciler.filter(o => o.pinned && String(o.pinnedSalonId) === String(s.canonicalId)).length;
              const capacity = s.kapasite || 0;
              const isFull = capacity > 0 && pinnedCount >= capacity;

              return (
                <Box
                  key={`salon-tab-${s.canonicalId}`}
                  onClick={() => setSelectedSalonId(s.canonicalId)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: isSelected ? 'primary.main' : '#e2e8f0',
                    bgcolor: isSelected ? '#eff6ff' : '#ffffff',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: isSelected ? '#eff6ff' : '#f8fafc'
                    }
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? 'primary.main' : 'text.primary' }}>
                    {s.label}
                  </Typography>
                  <Box
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '4px',
                      bgcolor: isFull ? '#fee2e2' : (pinnedCount > 0 ? '#dbeafe' : '#f1f5f9'),
                      color: isFull ? '#b91c1c' : (pinnedCount > 0 ? '#1e40af' : '#64748b'),
                      fontSize: '0.7rem',
                      fontWeight: 700
                    }}
                  >
                    {pinnedCount}/{capacity || '?'}
                  </Box>
                </Box>
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
                      const isSelected = selectedStudentIds.includes(getStudentKey(o));
                      const classStyle = getClassBadgeColor(o.sinif);

                      return (
                        <ListItem
                          key={`ogrenci-${o.id}`}
                          disablePadding
                          sx={{
                            borderRadius: 1.5,
                            mb: 0.5,
                            overflow: 'hidden'
                          }}
                        >
                          <ListItemButton
                            selected={isSelected}
                            onClick={() => setSelectedStudentIds([getStudentKey(o)])}
                            onDoubleClick={() => {
                              if (!readOnly) pinStudentToFirstEmptySeat(getStudentKey(o));
                            }}
                            disabled={readOnly}
                            sx={{
                              borderRadius: 1.5,
                              borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                              bgcolor: isSelected ? '#eff6ff' : (isPinnedHere ? '#f0fdf4' : undefined),
                              '&:hover': { bgcolor: isSelected ? '#dbeafe' : '#f8fafc' }
                            }}
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
                                  onDelete={!readOnly ? () => handleUnpinStudent(getStudentKey(o)) : undefined}
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
                                      pinStudentToFirstEmptySeat(getStudentKey(o));
                                    }}
                                  >
                                    <PersonAddIcon fontSize="small" color="primary" />
                                  </IconButton>
                                </Tooltip>
                              )
                            )}
                          </ListItemSecondaryAction>
                          </ListItemButton>
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
                            display: 'grid',
                            gridTemplateColumns: {
                              xs: '1fr',
                              sm: 'repeat(2, minmax(0, 1fr))',
                              md: 'repeat(4, minmax(0, 1fr))'
                            },
                            gap: { xs: 1, sm: 1, md: 0.85 },
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
                                  width: '100%',
                                  bgcolor: '#f8fafc',
                                  p: { xs: 0.7, sm: 0.85, md: 0.75 },
                                  borderRadius: '9px',
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
                                    mb: 0.75,
                                    fontSize: { xs: '0.76rem', md: '0.74rem' },
                                    borderBottom: '1px solid #e2e8f0',
                                    pb: 0.4
                                  }}
                                >
                                  Grup {index + 1}
                                </Typography>

                                <Box
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                    gap: { xs: 0.6, md: 0.5 }
                                  }}
                                >
                                  {grupMasalar.map((masa) => {
                                    const seatEntry = seatStudentMap[String(masa.id)];
                                    const student = seatEntry?.student || null;
                                    const isSelectedStudent = selectedStudentIds.includes(getStudentKey(student));
                                    const classStyle = student ? getClassBadgeColor(student.sinif) : null;

                                    return (
                                      <Paper
                                        key={`masa-${masa.id}`}
                                        elevation={student ? (isSelectedStudent ? 6 : 1) : 0}
                                        onClick={() => {
                                          if (!readOnly && !student && hasSelectedStudent) {
                                            handlePinToSeat(masa.id);
                                          }
                                        }}
                                        sx={{
                                          p: { xs: 0.7, md: 0.6 },
                                          borderRadius: '7px',
                                          minHeight: { xs: 56, md: 52 },
                                          display: 'flex',
                                          flexDirection: 'column',
                                          justifyContent: 'space-between',
                                          position: 'relative',
                                          cursor: !readOnly && !student && hasSelectedStudent ? 'pointer' : 'default',
                                          border: '1.5px solid',
                                          borderColor: student
                                            ? classStyle.border
                                            : (!readOnly && hasSelectedStudent ? '#93c5fd' : '#e2e8f0'),
                                          bgcolor: student
                                            ? classStyle.bgcolor
                                            : (!readOnly && hasSelectedStudent ? '#eff6ff' : '#ffffff'),
                                          transition: 'all 0.15s ease',
                                          '&:hover': {
                                            transform: !readOnly && !student && hasSelectedStudent ? 'scale(1.02)' : 'none',
                                            borderColor: !readOnly && !student && hasSelectedStudent ? 'primary.main' : undefined,
                                            boxShadow: !readOnly && !student && hasSelectedStudent ? 2 : undefined
                                          }
                                        }}
                                      >
                                        {/* Masa Numarası Badge (SalonPlani ile Birebir Aynı Sıralama) */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: { xs: '0.62rem', md: '0.6rem' } }}>
                                            #Sıra {masa.masaNumarasi || (masa.id + 1)}
                                          </Typography>

                                          {/* Öğrenci var ise kaldır ikonu */}
                                          {student && !readOnly && (
                                            <Tooltip title="Sabit atamayı kaldır">
                                              <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUnpinStudent(getStudentKey(student));
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
                                                fontSize: { xs: '0.72rem', md: '0.69rem' },
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
                                                  height: 14,
                                                  fontSize: { xs: '0.6rem', md: '0.57rem' },
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
                                            <ChairIcon sx={{ fontSize: 16, color: !readOnly && hasSelectedStudent ? '#3b82f6' : '#cbd5e1', mb: 0.15 }} />
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                fontWeight: 700,
                                                fontSize: '0.63rem',
                                                color: !readOnly && hasSelectedStudent ? '#1d4ed8' : '#94a3b8'
                                              }}
                                            >
                                              {!readOnly && hasSelectedStudent ? '➕ Buraya Koy' : 'Boş'}
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
                                    <IconButton edge="end" size="small" onClick={() => handleUnpinStudent(getStudentKey(o))}>
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
        <DialogTitle>
          <DialogHeader icon={<DeleteIcon />} title="Salondaki Sabit Atamaları Temizle" variant="danger" />
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
