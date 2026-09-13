import React from 'react';
import { Box, Typography, Tooltip, Zoom } from '@mui/material';
import { DroppableSeat, DraggableStudent } from './SeatItem';

const SeatGrid = ({
  sinifDuzeni,
  seciliOgrenciId,
  hoveredOgrenci,
  getGenderColor,
  handleMasaClick,
  handleOgrenciHover,
  handleOgrenciLeave,
  handleStudentMove,
  handleTransferClick,
  currentSalon,
  tumSalonlar,
  readOnly,
  getConstraintConflictInfo,
  calculateDeskNumberForMasa,
  plan2D,
  hasConstraintConflict,
  dndJustEnded
}) => {
  if (sinifDuzeni.gruplar) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          gap: { xs: 1, sm: 1.25 },
          justifyContent: 'center',
          alignItems: { xs: 'center', sm: 'flex-start' },
          width: '100%',
          minWidth: 0,
          mb: 2
        }}
      >
        {Object.keys(sinifDuzeni.gruplar).map((grupId, index) => {
          const grupMasalar = sinifDuzeni.gruplar[grupId];
          if (!grupMasalar || !Array.isArray(grupMasalar)) {
            return null;
          }

          return (
            <Box
              key={grupId}
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
                  gap: 0.6,
                  maxWidth: '100%',
                  mx: 'auto'
                }}
              >
                {grupMasalar.map((masa) => {
                  const isSecili = seciliOgrenciId && masa.ogrenci?.id === seciliOgrenciId;
                  const isHovered = hoveredOgrenci && masa.ogrenci?.id === hoveredOgrenci.id;

                  return (
                    <Tooltip
                      key={masa.id}
                      title={
                        masa.ogrenci ? (
                          <Box sx={{ p: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                              {masa.ogrenci.ad} {masa.ogrenci.soyad}
                            </Typography>
                            <Typography variant="caption" display="block">
                              <strong>Okul No:</strong> {masa.ogrenci.numara || masa.ogrenci.okulNo}
                            </Typography>
                            <Typography variant="caption" display="block">
                              <strong>Şube:</strong> {masa.ogrenci.sinif || masa.ogrenci.sube}
                            </Typography>
                            {masa.ogrenci.kitapcik && (
                              <Typography variant="caption" display="block">
                                <strong>Kitapçık:</strong> {masa.ogrenci.kitapcik}
                              </Typography>
                            )}
                            {masa.ogrenci.dersler && masa.ogrenci.dersler.length > 0 && (
                              <Typography variant="caption" display="block">
                                <strong>Dersler:</strong> {masa.ogrenci.dersler.join(', ')}
                              </Typography>
                            )}
                            {masa.ogrenci.ozelDurum && (
                              <Typography variant="caption" display="block" color="warning.main">
                                <strong>Özel Durum:</strong> {masa.ogrenci.ozelDurum}
                              </Typography>
                            )}
                            {masa.ogrenci.esnekYerlestirme && (
                              <Typography variant="caption" display="block" color="info.main">
                                <strong>Esnek Yerleştirme:</strong> {masa.ogrenci.kuralIhlali || 'Kurallar esnetildi'}
                              </Typography>
                            )}
                          </Box>
                        ) : 'Boş masa'
                      }
                      arrow
                      TransitionComponent={Zoom}
                      enterDelay={300}
                      leaveDelay={100}
                    >
                      <DroppableSeat masa={masa} onStudentMove={handleStudentMove} readOnly={readOnly}>
                        <DraggableStudent
                          masa={masa}
                          getGenderColor={getGenderColor}
                          onMasaClick={handleMasaClick}
                          onStudentHover={handleOgrenciHover}
                          onStudentLeave={handleOgrenciLeave}
                          isSecili={isSecili}
                          isHovered={isHovered}
                          onStudentMove={handleStudentMove}
                          onTransferClick={handleTransferClick}
                          currentSalon={currentSalon}
                          allSalons={tumSalonlar || []}
                          readOnly={readOnly}
                          sinifDuzeni={sinifDuzeni}
                          getConstraintConflictInfo={getConstraintConflictInfo}
                          calculateDeskNumberForMasa={calculateDeskNumberForMasa}
                          plan2D={plan2D}
                          conflict={hasConstraintConflict(masa, plan2D)}
                          dndJustEnded={dndJustEnded}
                        />
                      </DroppableSeat>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  // Fallback: Normal grid görüntüleme
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${sinifDuzeni.sutunSayisi}, 1fr)`,
        gap: 1,
        maxWidth: '100%',
        mx: 'auto',
        mb: 2
      }}
    >
      {sinifDuzeni.masalar.map((masa) => {
        const isSecili = seciliOgrenciId && masa.ogrenci?.id === seciliOgrenciId;
        const isHovered = hoveredOgrenci && masa.ogrenci?.id === hoveredOgrenci.id;

        return (
          <Tooltip
            key={masa.id}
            title={
              masa.ogrenci ? (
                <Box sx={{ p: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    {masa.ogrenci.ad} {masa.ogrenci.soyad}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Okul No:</strong> {masa.ogrenci.numara || masa.ogrenci.okulNo}
                  </Typography>
                  <Typography variant="caption" display="block">
                    <strong>Şube:</strong> {masa.ogrenci.sinif || masa.ogrenci.sube}
                  </Typography>
                  {masa.ogrenci.kitapcik && (
                    <Typography variant="caption" display="block">
                      <strong>Kitapçık:</strong> {masa.ogrenci.kitapcik}
                    </Typography>
                  )}
                  {masa.ogrenci.dersler && masa.ogrenci.dersler.length > 0 && (
                    <Typography variant="caption" display="block">
                      <strong>Dersler:</strong> {masa.ogrenci.dersler.join(', ')}
                    </Typography>
                  )}
                  {masa.ogrenci.ozelDurum && (
                    <Typography variant="caption" display="block" color="warning.main">
                      <strong>Özel Durum:</strong> {masa.ogrenci.ozelDurum}
                    </Typography>
                  )}
                  {masa.ogrenci.esnekYerlestirme && (
                    <Typography variant="caption" display="block" color="info.main">
                      <strong>Esnek Yerleştirme:</strong> {masa.ogrenci.kuralIhlali || 'Kurallar esnetildi'}
                    </Typography>
                  )}
                </Box>
              ) : 'Boş masa'
            }
            arrow
            TransitionComponent={Zoom}
            enterDelay={300}
            leaveDelay={100}
          >
            <DroppableSeat
              masa={masa}
              onStudentMove={handleStudentMove}
              readOnly={readOnly}
            >
              <DraggableStudent
                masa={masa}
                getGenderColor={getGenderColor}
                onMasaClick={handleMasaClick}
                onStudentHover={handleOgrenciHover}
                onStudentLeave={handleOgrenciLeave}
                isSecili={isSecili}
                isHovered={isHovered}
                onStudentMove={handleStudentMove}
                onTransferClick={handleTransferClick}
                currentSalon={currentSalon}
                allSalons={tumSalonlar || []}
                readOnly={readOnly}
                sinifDuzeni={sinifDuzeni}
                getConstraintConflictInfo={getConstraintConflictInfo}
                calculateDeskNumberForMasa={calculateDeskNumberForMasa}
                plan2D={plan2D}
                conflict={hasConstraintConflict(masa, plan2D)}
                dndJustEnded={dndJustEnded}
              />
            </DroppableSeat>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default SeatGrid;
