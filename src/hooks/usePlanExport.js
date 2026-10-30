import { useState, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';

export const usePlanExport = (
    salonPlaniPrintRef,
    sinifListesiPrintRef,
    salonImzaListesiPrintRef,
    ayarlar = {}
) => {
    // Dosya adı için tarih-saat verisini hazırla
    const getFileSuffix = () => {
        const tarih = ayarlar.sinavTarihi ? new Date(ayarlar.sinavTarihi).toLocaleDateString('tr-TR') : '';
        const saat = ayarlar.sinavSaati || '';
        return `${tarih} ${saat}`.trim();
    };
    const [printMenuAnchor, setPrintMenuAnchor] = useState(null);

    const handlePrintMenuOpen = (event) => {
        setPrintMenuAnchor(event.currentTarget);
    };

    const handlePrintMenuClose = () => {
        setPrintMenuAnchor(null);
    };

    const handleSalonPlaniPrint = useReactToPrint({
        contentRef: salonPlaniPrintRef,
        documentTitle: `Salon Oturma Planı ${getFileSuffix()}`.trim(),
        pageStyle: `
            @page {
                size: A4 landscape;
                margin: 0;
            }
            @media print {
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    box-sizing: border-box !important;
                }
                * {
                    box-sizing: border-box !important;
                }
            }
        `
    });

    const handleSinifListesiPrint = useReactToPrint({
        contentRef: sinifListesiPrintRef,
        documentTitle: `Öğrenci Listesi ${getFileSuffix()}`.trim(),
        pageStyle: `
            @page {
                size: A4 portrait;
                margin: 0;
            }
            @media print {
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    box-sizing: border-box !important;
                }
                * {
                    box-sizing: border-box !important;
                }
                thead {
                    display: table-header-group !important;
                }
                tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
            }
        `
    });

    const handleSalonImzaListesiPrint = useReactToPrint({
        contentRef: salonImzaListesiPrintRef,
        documentTitle: `Sınav Yoklama ve İmza Listesi ${getFileSuffix()}`.trim(),
        pageStyle: `
            @page {
                size: A4 portrait;
                margin: 0;
            }
            @media print {
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    box-sizing: border-box !important;
                }
                * {
                    box-sizing: border-box !important;
                }
                thead {
                    display: table-header-group !important;
                }
                tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
            }
        `
    });

    const handleSalonPlaniPrintClick = useCallback(() => {
        handleSalonPlaniPrint();
        handlePrintMenuClose();
    }, [handleSalonPlaniPrint]);

    const handleSinifListesiPrintClick = useCallback(() => {
        handleSinifListesiPrint();
        handlePrintMenuClose();
    }, [handleSinifListesiPrint]);

    const handleSalonImzaListesiPrintClick = useCallback(() => {
        handleSalonImzaListesiPrint();
        handlePrintMenuClose();
    }, [handleSalonImzaListesiPrint]);

    return {
        printMenuAnchor,
        handlePrintMenuOpen,
        handlePrintMenuClose,
        handleSalonPlaniPrintClick,
        handleSinifListesiPrintClick,
        handleSalonImzaListesiPrintClick
    };
};
