import { useCallback } from 'react';
import { gelismisYerlestirme } from '../algorithms/gelismisYerlestirmeAlgoritmasi';
import planManager from '../utils/planManager';
import { calculateDeskNumber } from '../utils/deskUtils';

export const usePlacementAlgorithm = (
    ogrenciler,
    salonlar,
    ayarlar,
    readOnly,
    yerlestirmeYap,
    onPlacementSuccess,
    hataAyarla,
    setActivePlanMeta,
    showError,
    yukleme
) => {

    // Yerleştirme sonucunu eski sistemle uyumlu hale getirir
    const formatYerlestirmeSonucu = useCallback((sonuc) => {
        // İlk salonun öğrencilerini al (varsayılan olarak)
        const ilkSalon = sonuc.salonlar[0];
        if (!ilkSalon) {
            return {
                salon: {
                    id: 'A-101',
                    kapasite: ogrenciler.length,
                    siraDizilimi: {
                        satir: Math.ceil(Math.sqrt(ogrenciler.length)),
                        sutun: Math.ceil(ogrenciler.length / Math.ceil(Math.sqrt(ogrenciler.length)))
                    },
                    ad: 'Sınav Salonu'
                },
                kalanOgrenciler: sonuc.yerlesilemeyenOgrenciler || [],
                yerlesilemeyenOgrenciler: sonuc.yerlesilemeyenOgrenciler || [],
                istatistikler: sonuc.istatistikler,
                tumSalonlar: []
            };
        }

        // Tüm salonları formatla
        const formatlanmisSalonlar = sonuc.salonlar.map(salon => {
            const uniqueOgrenciler = [];
            const seenIds = new Set();

            if (salon.ogrenciler && Array.isArray(salon.ogrenciler)) {
                salon.ogrenciler.forEach(ogrenci => {
                    if (ogrenci && ogrenci.id && !seenIds.has(String(ogrenci.id))) {
                        uniqueOgrenciler.push(ogrenci);
                        seenIds.add(String(ogrenci.id));
                    }
                });
            }

            const gercekKapasite = salon.koltukMatrisi?.masalar?.length || salon.koltukMatrisi?.satirSayisi * salon.koltukMatrisi?.sutunSayisi || 0;

            const formatlanmisSalon = {
                id: salon.salonId,
                salonId: salon.salonId,
                salonAdi: salon.salonAdi,
                kapasite: gercekKapasite,
                siraDizilimi: salon.siraDizilimi || (salon.koltukMatrisi?.satirSayisi && salon.koltukMatrisi?.sutunSayisi ? {
                    satir: salon.koltukMatrisi.satirSayisi,
                    sutun: salon.koltukMatrisi.sutunSayisi
                } : {
                    satir: Math.ceil(Math.sqrt(gercekKapasite || 30)) || 6,
                    sutun: Math.ceil((gercekKapasite || 30) / (Math.ceil(Math.sqrt(gercekKapasite || 30)) || 6)) || 5
                }),
                ogrenciler: uniqueOgrenciler,
                masalar: [],
                plan: salon.plan || []
            };

            const masalar = salon.koltukMatrisi?.masalar || [];
            formatlanmisSalon.masalar = masalar.map((koltuk) => {
                const ogrenci = salon.plan?.find(p =>
                    p.satir === koltuk.satir &&
                    p.sutun === koltuk.sutun &&
                    p.grup === koltuk.grup
                )?.ogrenci || null;

                return {
                    id: koltuk.id,
                    masaNumarasi: koltuk.masaNumarasi || calculateDeskNumber(koltuk, masalar),
                    ogrenci: ogrenci,
                    satir: koltuk.satir,
                    sutun: koltuk.sutun,
                    grup: koltuk.grup,
                    koltukTipi: koltuk.koltukTipi
                };
            });

            return formatlanmisSalon;
        });

        const varsayilanSalon = formatlanmisSalonlar[0];

        return {
            salon: varsayilanSalon,
            kalanOgrenciler: sonuc.yerlesilemeyenOgrenciler || [],
            yerlesilemeyenOgrenciler: sonuc.yerlesilemeyenOgrenciler || [],
            istatistikler: sonuc.istatistikler,
            tumSalonlar: formatlanmisSalonlar
        };
    }, [ogrenciler.length]);

    const handleYerlestirmeYap = useCallback(async () => {
        if (readOnly) {
            showError('Yerleştirme yapmak için yönetici olarak giriş yapmalısınız.');
            return;
        }
        if (ogrenciler.length === 0) {
            hataAyarla('Lütfen öğrenci ekleyin!');
            return;
        }

        if (!salonlar || salonlar.length === 0) {
            hataAyarla('Lütfen salon ekleyin!');
            return;
        }

        if (!ayarlar.dersler || ayarlar.dersler.length === 0) {
            hataAyarla('Lütfen ders ekleyin!');
            return;
        }

        try {
            if (typeof yukleme === 'function') {
                yukleme(true);
            }
            // Tarayıcının arayüzü çizmesine izin ver (non-blocking yield)
            await new Promise(resolve => setTimeout(resolve, 25));

            planManager.invalidateCurrentPlan('yerlestirme_yap');
            setActivePlanMeta(null);

            const aktifSalonlar = (salonlar || []).filter(salon => salon.aktif !== false);

            if (aktifSalonlar.length === 0) {
                throw new Error('Aktif salon bulunamadı! Lütfen en az bir salonu aktif hale getirin.');
            }

            const seciliSiniflar = [];
            if (ayarlar?.dersler && ayarlar.dersler.length > 0) {
                ayarlar.dersler.forEach(ders => {
                    if (ders.siniflar && ders.siniflar.length > 0) {
                        seciliSiniflar.push(...ders.siniflar);
                    }
                });
            }

            const benzersizSeciliSiniflar = [...new Set(seciliSiniflar)];
            const seciliSinifOgrencileri = ogrenciler.filter(ogrenci =>
                benzersizSeciliSiniflar.includes(ogrenci.sinif)
            );

            // Kısıtlamaları ayarlardan al
            const kisitlar = ayarlar?.kisitlar || {
                cinsiyetKisiti: true,
                sinifSeviyesiKisiti: true,
                arkaArkaSinifKisiti: true
            };

            if (seciliSinifOgrencileri.length === 0) {
                throw new Error('Seçili sınıflarda öğrenci bulunamadı! Lütfen ders ayarlarında sınıf seçimi yapın.');
            }

            // Arka plan iş parçacığında (Web Worker) çalıştır, desteklenmezse yedeğe (fallback) dön
            const sonuc = await new Promise((resolve, reject) => {
                let worker = null;
                try {
                    worker = new Worker(new URL('../workers/placementWorker.js', import.meta.url), { type: 'module' });
                } catch (err) {
                    console.warn('Web Worker oluşturulamadı, ana thread yedek mekanizması çalıştırılıyor:', err);
                }

                if (worker) {
                    const id = String(Date.now());
                    worker.onmessage = (e) => {
                        const { type, id: resId, sonuc: workerResult, error } = e.data || {};
                        if (resId === id) {
                            worker.terminate();
                            if (type === 'PLACEMENT_COMPLETE') {
                                resolve(workerResult);
                            } else {
                                reject(new Error(error || 'Worker yerleştirme hatası'));
                            }
                        }
                    };
                    worker.onerror = (err) => {
                        worker.terminate();
                        console.warn('Web Worker hatası, ana thread yedeğe dönülüyor:', err);
                        try {
                            const fallbackResult = gelismisYerlestirme(seciliSinifOgrencileri, aktifSalonlar, ayarlar, kisitlar);
                            resolve(fallbackResult);
                        } catch (fallbackErr) {
                            reject(fallbackErr);
                        }
                    };
                    worker.postMessage({
                        type: 'START_PLACEMENT',
                        id,
                        data: { seciliSinifOgrencileri, aktifSalonlar, ayarlar, kisitlar }
                    });
                } else {
                    try {
                        const fallbackResult = gelismisYerlestirme(seciliSinifOgrencileri, aktifSalonlar, ayarlar, kisitlar);
                        resolve(fallbackResult);
                    } catch (fallbackErr) {
                        reject(fallbackErr);
                    }
                }
            });

            if (sonuc && sonuc.istatistikler) {
                sonuc.istatistikler.toplamOgrenci = ogrenciler.length;
                sonuc.istatistikler.yerlesemeyenOgrenci = ogrenciler.length - (sonuc.istatistikler.yerlesenOgrenci || 0);
            }

            if (!sonuc || !sonuc.salonlar || sonuc.salonlar.length === 0) {
                throw new Error('Algoritma geçerli sonuç döndürmedi');
            }

            const formatlanmisSonuc = formatYerlestirmeSonucu(sonuc);
            yerlestirmeYap(formatlanmisSonuc);

            // Success Modal çağrısı (önceden tabDegistir idi)
            if (onPlacementSuccess) {
                onPlacementSuccess(sonuc.istatistikler);
            }
        } catch (error) {
            console.error('Yerleştirme hatası:', error);
            hataAyarla(`Yerleştirme sırasında bir hata oluştu: ${error.message}`);
        } finally {
            if (typeof yukleme === 'function') {
                yukleme(false);
            }
        }
    }, [
        readOnly,
        ogrenciler,
        salonlar,
        ayarlar,
        hataAyarla,
        setActivePlanMeta,
        formatYerlestirmeSonucu,
        yerlestirmeYap,
        onPlacementSuccess,
        showError
    ]);

    return {
        handleYerlestirmeYap,
        formatYerlestirmeSonucu
    };
};
