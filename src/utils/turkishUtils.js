/**
 * Türkçe Karakter ve Dil Desteği Yardımcıları (Turkish Language Utilities)
 * Büyük/küçük harf dönüşümleri (İ/i, I/ı), normalizasyon, sıralama ve cinsiyet tespiti
 */

export const trCollator = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' });

/**
 * Türkçe metinleri arama ve karşılaştırma için ASCII tabanına normalize eder.
 * Kullanıcı 'ismail' yazdığında 'İSMAİL', 'cagla' yazdığında 'ÇAĞLA',
 * 'sukru' yazdığında 'ŞÜKRÜ', 'isil' yazdığında 'IŞIL' eşleşir.
 * 
 * @param {string} text 
 * @returns {string}
 */
export function turkishNormalize(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLocaleLowerCase('tr-TR')
    .trim();
}

/**
 * Türkçe kurallarına uygun güvenli büyük harfe çevirme
 * 'i' -> 'İ', 'ı' -> 'I'
 * 
 * @param {string} text 
 * @returns {string}
 */
export function turkishToUpper(text) {
  if (!text) return '';
  return String(text).toLocaleUpperCase('tr-TR').trim();
}

/**
 * Türkçe kurallarına uygun güvenli küçük harfe çevirme
 * 'İ' -> 'i', 'I' -> 'ı'
 * 
 * @param {string} text 
 * @returns {string}
 */
export function turkishToLower(text) {
  if (!text) return '';
  return String(text).toLocaleLowerCase('tr-TR').trim();
}

/**
 * Cinsiyet bilgisini Türkçe ve uluslararası varyantlardan güvenle 'E' veya 'K' olarak normalize eder.
 * 
 * Kız varyantları: 'K', 'KIZ', 'KADIN', 'FEMALE', 'F', 'BAYAN', 'kız', 'kadın', 'kadin', 'bayan'
 * Erkek varyantları: 'E', 'ERKEK', 'MALE', 'M', 'BAY', 'erkek', 'bay'
 * 
 * @param {string|any} cinsiyet 
 * @returns {'E'|'K'|null}
 */
export function normalizeGender(cinsiyet) {
  if (!cinsiyet) return null;
  const raw = String(cinsiyet).trim().toLocaleUpperCase('tr-TR');
  if (
    ['K', 'KIZ', 'KADIN', 'F', 'FEMALE', 'BAYAN'].includes(raw) ||
    raw.startsWith('K') ||
    raw.startsWith('KAD')
  ) {
    return 'K';
  }
  if (
    ['E', 'ERKEK', 'M', 'MALE', 'BAY'].includes(raw) ||
    raw.startsWith('E') ||
    raw.startsWith('ERK')
  ) {
    return 'E';
  }
  return null;
}

/**
 * Öğrencinin kız olup olmadığını güvenle kontrol eder
 * @param {object} ogrenci 
 * @returns {boolean}
 */
export function isStudentFemale(ogrenci) {
  if (!ogrenci) return false;
  const c = ogrenci.cinsiyet ?? ogrenci.gender;
  return normalizeGender(c) === 'K';
}

/**
 * Türkçe alfabetik karşılaştırma (A -> Z, Ç, Ğ, I, İ, Ö, Ş, Ü dahil)
 * @param {string} a 
 * @param {string} b 
 * @returns {number}
 */
export function turkishCompare(a, b) {
  const strA = a !== null && a !== undefined ? String(a) : '';
  const strB = b !== null && b !== undefined ? String(b) : '';
  return trCollator.compare(strA, strB);
}

/**
 * Sınıf kodunu Türkçe karakterleri (İ, Ç, Ö, Ş, vb.) koruyarak normalize eder
 * Örnek: '9A' -> '9/A', '10-i' -> '10/İ', '11 AMP' -> '11/AMP'
 * 
 * @param {string} sinifStr 
 * @returns {string}
 */
export function normalizeClassCode(sinifStr) {
  if (!sinifStr) return '';
  const raw = String(sinifStr).trim().toLocaleUpperCase('tr-TR');
  // Ayırıcıları tek tipe çevir ("-", " ", "_" -> "/")
  const unified = raw.replace(/[- _]+/g, '/');
  // "11A" gibi durumları "11/A" yap
  const m = unified.match(/^(\d{1,2})\/?\s*([A-ZÇĞİÖŞÜ0-9]+)?$/i);
  if (!m) return unified;
  const level = m[1];
  const section = (m[2] || '').toLocaleUpperCase('tr-TR');
  return section ? `${level}/${section}` : `${level}`;
}

export default {
  trCollator,
  turkishNormalize,
  turkishToUpper,
  turkishToLower,
  normalizeGender,
  isStudentFemale,
  turkishCompare,
  normalizeClassCode
};

