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
        mb: 2,
        width: '100%'
      } 
    }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '13pt', lineHeight: 1.2, textAlign: 'center', fontFamily: '"Times New Roman", Times, serif' }}>
        {schoolName}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: '11pt', lineHeight: 1.2, textAlign: 'center', fontFamily: '"Times New Roman", Times, serif' }}>
        {subTitle}
      </Typography>
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 0.5 }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '11pt', lineHeight: 1.2, textAlign: 'center', fontFamily: '"Times New Roman", Times, serif', mb: 0.2 }}>
          {documentTitle}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '10pt', lineHeight: 1.2, textAlign: 'center', fontFamily: '"Times New Roman", Times, serif' }}>
          Tarih: {date}
        </Typography>
      </Box>
    </Box>
  );
};

export default PrintHeader;
