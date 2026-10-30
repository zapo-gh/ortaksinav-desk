import React from 'react';
import { Box, Typography } from '@mui/material';

const PrintHeader = ({ 
  schoolName = "T.C. MİLLİ EĞİTİM BAKANLIĞI", 
  subTitle = "", 
  documentTitle = "",
  date = new Date().toLocaleDateString('tr-TR'),
  compact = false
}) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      pt: compact ? '1mm' : '2mm',
      mt: 0,
      mb: compact ? '2.5mm' : '5mm',
      width: '100%',
      textAlign: 'center'
    }}>
      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: compact ? '12pt' : '13pt', lineHeight: 1.25, textAlign: 'center', color: '#000', fontFamily: '"Times New Roman", Times, serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {schoolName}
      </Typography>
      {subTitle && (
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: compact ? '10pt' : '11pt', lineHeight: 1.25, textAlign: 'center', color: '#111', fontFamily: '"Times New Roman", Times, serif', mt: compact ? 0.2 : 0.3 }}>
          {subTitle}
        </Typography>
      )}
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: compact ? 0.3 : 0.5 }}>
        {documentTitle && (
          <Typography variant="body1" sx={{ fontWeight: 800, fontSize: compact ? '11pt' : '12pt', lineHeight: 1.25, textAlign: 'center', color: '#000', fontFamily: '"Times New Roman", Times, serif', mb: compact ? 0.2 : 0.3 }}>
            {documentTitle}
          </Typography>
        )}
        {date && (
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: compact ? '9pt' : '9.5pt', lineHeight: 1.2, textAlign: 'center', color: '#333', fontFamily: '"Times New Roman", Times, serif' }}>
            Tarih: {date}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PrintHeader;
