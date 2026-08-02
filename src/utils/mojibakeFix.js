/**
 * Mojibake normalization for common UTF-8 Türkçe patterns
 * Example: "Kayıtlı" -> "Kayıtlı" (Ã/Ä/Å + â€“/â€¢ etc.)
 *
 * Notes:
 * - This is a best-effort normalization (heuristic). It should be applied only to
 *   user-facing plain text coming from persistence (DB/storage) rather than to code.
 */

const REPLACEMENTS = [
  // Düzeltmeler (en sık)
  ['Ü', 'Ü'],
  ['ö', 'ö'],
  ['Ö', 'Ö'],
  ['Ã¤', 'ä'], // fallback (rare)
  ['Ã¤', 'ä'],
  ['Ã±', 'ñ'],

  ['Ç', 'Ç'],
  ['Ş', 'Ş'],
  ['Ş', 'Ş'],
  ['ş', 'ş'],

  ['İ', 'İ'],
  ['ı', 'ı'],
  ['İ', 'İ'],
  ['ş', 'ş'],

  ['ÃŸ', 'ß'],
  ['ğ', 'ğ'],
  ['ÃŸ', 'ß'],

  ['â€“', '–'],
  ['â€™', '’'],
  ['â€œ', '“'],
  ['â€�', '”'],
  ['â€¦', '…'],
  ['â€¢', '•'],

  ['ş', 'ş'],
  ['Ş', 'Ş'],
  ['İ', 'İ'],

  // Sık görülen UI Türkçe örnekleri (tam dönüşüm hedef)
  ['Kayıtlı', 'Kayıtlı'], // no-op, keep for clarity
];

// More accurate explicit sequence fixes (high precision)
const SEQUENCE_REPLACEMENTS = [
  ['Kayıtlı', 'Kayıtlı'],
  ['Henüz', 'Henüz'],
  ['AKTİF', 'AKTİF'],
  ['ARÅİV', 'ARŞİF'],
  ['Planı', 'Planı'],
  ['Plan Adı', 'Plan Adı'],
  ['Yeni Plan Adı', 'Yeni Plan Adı'],
  ['DB Yedeği', 'DB Yedeği'],
  ['DB yedeği', 'DB yedeği'],
  ['DB yedeği', 'DB yedeği'],
  ['Arşivden Çıkar', 'Arşivden Çıkar'],
  ['Arşivlenmiş', 'Arşivlenmiş'],
  ['Plan yüklendi', 'Plan yüklendi'],
  ['Planı Arşivle', 'Planı Arşivle'],
  ['Plan Adını Değiştir', 'Plan Adını Değiştir'],
  ['Plan adı güncelleniyor', 'Plan adı güncelleniyor'],
  ['işlem', 'işlem'],
  ['Bu planı silmek', 'Bu planı silmek'],
  ['İptal', 'İptal'],
  ['İsimsiz', 'İsimsiz'],
  ['Geçici Plan', 'Geçici Plan'],
  ['Tüm planlar', 'Tüm planlar'],
];

// General heuristic: apply sequence replacements then simple char replacements.
// Also handle some remaining Ã/Ä/Å patterns by mapping common ones.
function fixText(input) {
  if (input == null) return input;
  if (typeof input !== 'string') return input;

  let out = input;

  // Early exits
  if (!/[ÃÄÅâ]/.test(out)) return out;

  for (const [from, to] of SEQUENCE_REPLACEMENTS) {
    out = out.split(from).join(to);
  }

  // Generic replacements
  // Use direct mapping for common UTF-8 Türkçe mojibake fragments.
  out = out
    .replace(/Kayıtlı/g, 'Kayıtlı')
    .replace(/Henüz/g, 'Henüz')
    .replace(/AKTİF/g, 'AKTİF')
    .replace(/ARÅİV/g, 'ARŞİF')
    .replace(/İ/g, 'İ')
    .replace(/ı/g, 'ı')
    .replace(/ş/g, 'ş')
    .replace(/Ş/g, 'Ş')
    .replace(/Ü/g, 'Ü')
    .replace(/ü/g, 'ü')
    .replace(/Ö/g, 'Ö')
    .replace(/ö/g, 'ö')
    .replace(/Ç/g, 'Ç')
    .replace(/â€“/g, '–')
    .replace(/â€™/g, '’')
    .replace(/â€œ/g, '“')
    .replace(/â€�/g, '”')
    .replace(/â€¦/g, '…')
    .replace(/â€¢/g, '•')
    .replace(/â€¢/g, '•')
    .replace(/Geçici/g, 'Geçici');

  return out;
}

function deepFix(value) {
  if (value == null) return value;

  if (typeof value === 'string') return fixText(value);

  if (Array.isArray(value)) return value.map(deepFix);

  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepFix(v);
    }
    return out;
  }

  return value;
}

/**
 * Fix common fields in a plan row.
 * @param {object} plan
 */
export function fixPlanRow(plan) {
  if (!plan || typeof plan !== 'object') return plan;

  const fixed = { ...plan };

  fixed.name = fixText(fixed.name);

  if (fixed.archiveMetadata && typeof fixed.archiveMetadata === 'object') {
    fixed.archiveMetadata = deepFix(fixed.archiveMetadata);
  }

  // plan.data içi çok büyük olabilir; burada yalnızca metadata alanlarını düzeltmek daha risk azalttığı için
  // sabit metinler üzerinden ilerliyoruz.
  return fixed;
}

export function fixAnyText(value) {
  return deepFix(value);
}
