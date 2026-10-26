import { parseExcelFile } from '../../utils/excelParser';
import { logger } from '../../utils/logger';

// Mock xlsx module so dynamic import('xlsx') returns the mock
const mockRead = vi.fn();
const mockSheetToJson = vi.fn();
vi.mock('xlsx', () => ({
  __esModule: true,
  default: {
    read: (...args) => mockRead(...args),
    utils: { sheet_to_json: (...args) => mockSheetToJson(...args) }
  },
  read: (...args) => mockRead(...args),
  utils: { sheet_to_json: (...args) => mockSheetToJson(...args) }
}));

// Mock logger to avoid console output during tests
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    log: vi.fn()
  },
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    log: vi.fn()
  }
}));

describe('Excel Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseExcelFile', () => {
    it('should reject when no file is provided', async () => {
      await expect(parseExcelFile(null)).rejects.toThrow('Dosya seçilmedi');
    });

    it('should reject when file is not Excel format', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      await expect(parseExcelFile(mockFile)).rejects.toThrow('Desteklenmeyen dosya formatı');
    });

    it('should parse valid Excel file structure', async () => {
      const mockWorkbook = {
        SheetNames: ['Sayfa1'],
        Sheets: {
          Sayfa1: { '!ref': 'A1:E3' }
        }
      };

      mockRead.mockReturnValue(mockWorkbook);
      // Use E_OKUL_NEW-like format with class header so it's detected correctly
      mockSheetToJson.mockReturnValue([
        ['T.C.', 'Öğrenci Listesi'],
        ['Sınıf:', '9-A'],
        ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['', 1001, 'Ahmet', 'Yılmaz', 'E'],
        ['', 1002, 'Ayşe', 'Kara', 'K']
      ]);

      const mockFile = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const result = await parseExcelFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.students).toHaveLength(2);
      expect(result.students[0]).toMatchObject({
        ad: 'Ahmet',
        soyad: 'Yılmaz',
        numara: expect.any(String),
        cinsiyet: 'E'
      });
    });

    it('should handle 12th grade students with confirmation', async () => {
      mockRead.mockReturnValue({
        SheetNames: ['Sayfa1'],
        Sheets: {
          Sayfa1: { '!ref': 'A1:E4' }
        }
      });

      mockSheetToJson.mockReturnValue([
        ['T.C.', 'Öğrenci Listesi'],
        ['Sınıf:', '12-A'],
        ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['', 12001, 'Mehmet', 'Demir', 'E']
      ]);

      const mockFile = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const result = await parseExcelFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.hasTwelfthGrade).toBe(true);
      expect(result.twelfthGradeCount).toBe(1);
      expect(result.students).toHaveLength(1);
    });

    it('should handle validation errors', async () => {
      mockRead.mockReturnValue({
        SheetNames: ['Sayfa1'],
        Sheets: {
          Sayfa1: { '!ref': 'A1:E4' }
        }
      });

      mockSheetToJson.mockReturnValue([
        ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['', '', 'Ahmet', 'Yılmaz', 'E'], // Missing student number
        ['', 1002, '', 'Kara', 'K'], // Missing first name
        ['', 1003, 'Ayşe', 'Kara', 'X'] // Invalid gender
      ]);

      const mockFile = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const result = await parseExcelFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.statistics.validStudents).toBeLessThan(result.statistics.parsedStudents);
      expect(result.statistics.invalidStudents).toBeGreaterThan(0);
    });

    it('should handle file read errors', async () => {
      // Mock FileReader to throw error
      const originalFileReader = global.FileReader;
      global.FileReader = vi.fn().mockImplementation(function() {
        this.onerror = null;
        this.onload = null;
        this.readAsArrayBuffer = vi.fn(() => {
          // Simulate error
          setTimeout(() => {
            if (this.onerror) {
              this.onerror({ target: { error: new Error('File read error') } });
            }
          }, 0);
        });
        return this;
      });

      const mockFile = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const result = await parseExcelFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Dosya okuma hatası');

      // Restore
      global.FileReader = originalFileReader;
    });
  });
});
