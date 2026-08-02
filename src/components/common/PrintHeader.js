import React from 'react';
import { Box, Typography } from '@mui/material';

const PrintHeader = ({ 
  schoolName = "T.C. MİLLİ EĞİTİM BAKANLIĞI", 
  subTitle = "Okul Adı", 
  documentTitle = "Sınav Yoklama Listesi",
  date = new Date().toLocaleDateString('tr-TR')
}) => {
  return (
    <Box sx={{ 
      display: 'none', 
      '@media print': { 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        mb: 4,
        borderBottom: '2px solid #000',
        pb: 2,
        width: '100%'
      } 
    }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '14pt', textAlign: 'center', fontFamily: '"Times New Roman", Times, serif' }}>
        {schoolName}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: '12pt', textAlign: 'center', fontFamily: '"Times New Roman", Times, serif' }}>
        {subTitle}
      </Typography>
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mt: 2, px: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11pt', fontFamily: '"Times New Roman", Times, serif' }}>
          {documentTitle}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '11pt', fontFamily: '"Times New Roman", Times, serif' }}>
          Tarih: {date}
        </Typography>
      </Box>
    </Box>
  );
};

export default PrintHeader;
