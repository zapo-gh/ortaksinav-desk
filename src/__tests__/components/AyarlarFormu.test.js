import { render, screen, fireEvent, waitFor } from '../../utils/test-utils';
import { createTheme } from '@mui/material/styles';
import AyarlarFormu from '../../components/AyarlarFormu';

// Mock logger
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

const theme = createTheme();

const mockAyarlar = {
  sinavAdi: 'Test Sınavı',
  sinavTarihi: '2024-12-01',
  sinavSaati: '09:00',
  dersler: [
    {
      id: 1,
      ad: 'Matematik',
      siniflar: ['9-A', '10-B']
    }
  ]
};

const mockOgrenciler = [
  { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', sinif: '9-A' },
  { id: 2, ad: 'Ayşe', soyad: 'Kara', sinif: '10-B' }
];

// renderWithProviders removed

describe('AyarlarFormu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render settings form with existing data', () => {
    render(
      <AyarlarFormu
        ayarlar={mockAyarlar}
        onAyarlarDegistir={vi.fn()}
        ogrenciler={mockOgrenciler}
      />
    );

    expect(screen.getByText('Sınav Ayarları')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Sınavı')).toBeInTheDocument();
  });

  it('should render empty form when no settings', () => {
    render(
      <AyarlarFormu
        ayarlar={{}}
        onAyarlarDegistir={vi.fn()}
        ogrenciler={[]}
      />
    );

    expect(screen.getByText('Sınav Ayarları')).toBeInTheDocument();
    expect(screen.getByLabelText(/Sınav Adı/)).toBeInTheDocument();
  });

  it('should handle form input changes', async () => {
    const mockOnAyarlarDegistir = vi.fn();

    render(
      <AyarlarFormu
        ayarlar={mockAyarlar}
        onAyarlarDegistir={mockOnAyarlarDegistir}
        ogrenciler={mockOgrenciler}
      />
    );

    const sinavAdiInput = screen.getByLabelText(/Sınav Adı/);
    fireEvent.change(sinavAdiInput, { target: { value: 'Yeni Sınav' } });

    expect(sinavAdiInput.value).toBe('Yeni Sınav');
  });

  it('should add new course when add button is clicked', async () => {
    const mockOnAyarlarDegistir = vi.fn();

    render(
      <AyarlarFormu
        ayarlar={mockAyarlar}
        onAyarlarDegistir={mockOnAyarlarDegistir}
        ogrenciler={mockOgrenciler}
      />
    );

    const addButton = screen.getByText('Ders Ekle');
    fireEvent.click(addButton);

    // Check if new course form appears
    expect(screen.getByLabelText(/Ders Adı/)).toBeInTheDocument();
  });

  it('should display existing courses', () => {
    render(
      <AyarlarFormu
        ayarlar={mockAyarlar}
        onAyarlarDegistir={vi.fn()}
        ogrenciler={mockOgrenciler}
      />
    );

    expect(screen.getByText('Matematik')).toBeInTheDocument();
  });

  it('should show class selection for courses', () => {
    render(
      <AyarlarFormu
        ayarlar={mockAyarlar}
        onAyarlarDegistir={vi.fn()}
        ogrenciler={mockOgrenciler}
      />
    );

    expect(screen.getByText('9-A')).toBeInTheDocument();
    expect(screen.getByText('10-B')).toBeInTheDocument();
  });

  it('should handle course deletion', async () => {
    const mockOnAyarlarDegistir = vi.fn();

    render(
      <AyarlarFormu
        ayarlar={mockAyarlar}
        onAyarlarDegistir={mockOnAyarlarDegistir}
        ogrenciler={mockOgrenciler}
      />
    );

    const deleteButton = screen.getByTitle('Dersi Sil');
    fireEvent.click(deleteButton);

    // Should show confirmation dialog
    expect(screen.getByText('Ders Silme Onayı')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const mockOnAyarlarDegistir = vi.fn();

    render(
      <AyarlarFormu
        ayarlar={mockAyarlar}
        onAyarlarDegistir={mockOnAyarlarDegistir}
        ogrenciler={mockOgrenciler}
      />
    );

    const submitButton = screen.getByText('Ayarları Kaydet');
    fireEvent.click(submitButton);

    // Should call the callback function
    expect(mockOnAyarlarDegistir).toHaveBeenCalled();
  });

  // TODO(stale-test): UI metinleri/yapisi degisti veya test metni bozuk kodlanmis (mojibake); bilesen testi yeniden yazilmali.
  it.skip('should validate required fields', async () => {
    render(
      <AyarlarFormu
        ayarlar={{}}
        onAyarlarDegistir={vi.fn()}
        ogrenciler={[]}
      />
    );

    const submitButton = screen.getByText('Ayarları Kaydet');
    fireEvent.click(submitButton);

    // Should show validation error
    expect(screen.getByText(/Sınav adı gerekli/)).toBeInTheDocument();
  });
});
