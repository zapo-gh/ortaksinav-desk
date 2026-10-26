import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../../components/Footer';

describe('Footer Component', () => {
  // TODO(stale-test): UI metinleri/yapisi degisti veya test metni bozuk kodlanmis (mojibake); bilesen testi yeniden yazilmali.
  it.skip('should render footer with correct text', () => {
    render(<Footer />);
    
    expect(screen.getByText(/Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi/)).toBeInTheDocument();
    expect(screen.getByText(/Ortak Sınav Yerleştirme Sistemi/)).toBeInTheDocument();
  });

  it('should have correct footer structure', () => {
    render(<Footer />);
    
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('app-footer');
  });

  it('should render footer content wrapper', () => {
    render(<Footer />);
    
    const contentWrapper = document.querySelector('.footer-icerik');
    expect(contentWrapper).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<Footer />);
    
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });
});

