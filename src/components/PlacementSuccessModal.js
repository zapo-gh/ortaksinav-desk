import React, { useEffect, useState, memo } from 'react';
import {
    Dialog,
    DialogContent,
    Typography,
    Box,
    LinearProgress,
    Fade,
    Button,
    useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    CheckCircle as CheckCircleIcon,
    People as PeopleIcon,
    Chair as ChairIcon,
    PersonOff as PersonOffIcon,
    ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

const PlacementSuccessModal = ({ open, onClose, statistics, title, message }) => {
    const theme = useTheme();
    const [progress, setProgress] = useState(100);
    const [isPaused, setIsPaused] = useState(false);
    const DURATION = 5000; // 5 saniye - kullanıcı istatistikleri rahatça inceleyebilsin

    useEffect(() => {
        if (!open) return;

        setProgress(100);
        let elapsed = 0;
        const intervalTime = 50;

        const timer = setInterval(() => {
            if (!isPaused) {
                elapsed += intervalTime;
                const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
                setProgress(remaining);

                if (elapsed >= DURATION) {
                    clearInterval(timer);
                    onClose();
                }
            }
        }, intervalTime);

        return () => clearInterval(timer);
    }, [open, onClose, isPaused]);

    // if (!statistics) return null; // İstatistik olmasa da modal açılsın (başarı mesajı için)

    return (
        <Dialog
            open={open}
            onClose={onClose}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    minWidth: 320,
                    maxWidth: 400,
                    textAlign: 'center',
                    p: 2,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.2)'
                }
            }}
            TransitionComponent={Fade}
            transitionDuration={400}
        >
            <DialogContent sx={{ p: 2 }}>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                    <CheckCircleIcon
                        sx={{
                            fontSize: 80,
                            color: 'success.main',
                            filter: `drop-shadow(0 4px 6px ${alpha(theme.palette.success.main, 0.3)})`
                        }}
                    />
                </Box>

                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {title || "Yerleştirme Tamamlandı!"}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {message || "Öğrenciler başarıyla salonlara yerleştirildi."}
                </Typography>

                {statistics && (
                    <Box sx={{
                        bgcolor: 'background.default',
                        borderRadius: 3,
                        p: 2,
                        mb: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }}>
                        <StatRow
                            icon={<PeopleIcon color="primary" />}
                            label="Toplam Öğrenci"
                            value={statistics.toplamOgrenci || 0}
                        />
                        <StatRow
                            icon={<ChairIcon color="success" />}
                            label="Yerleşen"
                            value={statistics.yerlesenOgrenci || 0}
                        />
                        <StatRow
                            icon={<PersonOffIcon color="error" />}
                            label="Yerleşemeyen"
                            value={statistics.yerlesemeyenOgrenci || 0}
                            warning={statistics.yerlesemeyenOgrenci > 0}
                        />
                    </Box>
                )}

                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="medium"
                    endIcon={<ArrowForwardIcon />}
                    onClick={onClose}
                    sx={{
                        borderRadius: '10px',
                        py: 1,
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        mb: 2
                    }}
                >
                    Salon Planına Git
                </Button>

                <Box sx={{ width: '100%' }}>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 5,
                            borderRadius: 3,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor: isPaused ? 'warning.main' : 'success.main'
                            }
                        }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.8, display: 'block' }}>
                        {isPaused ? 'Bekletiliyor (İncelemek için fareyi üzerinde tutun)' : '5 saniye içinde otomatik yönlendiriliyorsunuz...'}
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

const StatRow = ({ icon, label, value, warning }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {icon}
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {label}
            </Typography>
        </Box>
        <Typography
            variant="body1"
            sx={{
                fontWeight: 600,
                color: warning ? 'error.main' : 'text.primary'
            }}
        >
            {value}
        </Typography>
    </Box>
);

export default memo(PlacementSuccessModal);
