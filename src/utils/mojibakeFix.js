/**
 * Mojibake normalization for common UTF-8 Türkçe patterns
 * Example: "KayÄ±tlÄ±" -> "Kayıtlı" (Ã/Ä/Å + â€“/â€¢ etc.)
 *
 * Notes:
 * - This is a best-effort normalization (heuristic). It should be applied only to
 *   user-facing plain text coming from persistence (DB/storage) rather than to code.
 */

const REPLACEMENTS = [
  // Düzeltmeler (en sık)
  ['Ãœ', 'Ü'],
  ['Ã¶', 'ö'],
  ['Ã–', 'Ö'],
  ['Ã¤', 'ä'], // fallback (rare)
  ['Ã¤', 'ä'],
  ['Ã±', 'ñ'],

  ['Ã‡', 'Ç'],
  ['Åž', 'Ş'],
  ['Åž', 'Ş'],
  ['ÅŸ', 'ş'],

  ['Ä°', 'İ'],
  ['Ä±', 'ı'],
  ['Ä°', 'İ'],
  ['ÅŸ', 'ş'],

  ['ÃŸ', 'ß'],
  ['ÄŸ', 'ğ'],
  ['ÃŸ', 'ß'],

  ['â€“', '–'],
  ['â€™', '’'],
  ['â€œ', '“'],
  ['â€�', '”'],
  ['â€¦', '…'],
  ['â€¢', '•'],

  ['ÅŸ', 'ş'],
  ['Åž', 'Ş'],
  ['Ä°', 'İ'],

  // Sık görülen UI Türkçe örnekleri (tam dönüşüm hedef)
  ['Kayıtlı', 'Kayıtlı'], // no-op, keep for clarity
];

// More accurate explicit sequence fixes (high precision)
const SEQUENCE_REPLACEMENTS = [
  ['KayÄ±tlÄ±', 'Kayıtlı'],
  ['HenÃ¼z', 'Henüz'],
  ['AKTÄ°F', 'AKTİF'],
  ['ARÅÄ°V', 'ARŞİF'],
  ['PlanÄ±', 'Planı'],
  ['Plan AdÄ±', 'Plan Adı'],
  ['Yeni Plan AdÄ±', 'Yeni Plan Adı'],
  ['DB YedeÄŸi', 'DB Yedeği'],
  ['DB yedeÄŸi', 'DB yedeği'],
  ['DB yedeÄŸi', 'DB yedeği'],
  ['ArÅŸivden Ã‡Ä±kar', 'Arşivden Çıkar'],
  ['ArÅŸivlenmiÅŸ', 'Arşivlenmiş'],
  ['Plan yÃ¼klendi', 'Plan yüklendi'],
  ['PlanÄ± ArÅŸivle', 'Planı Arşivle'],
  ['Plan AdÄ±nÄ± DeÄŸiÅŸtir', 'Plan Adını Değiştir'],
  ['Plan adÄ± gÃ¼ncelleniyor', 'Plan adı güncelleniyor'],
  ['iÅŸlem', 'işlem'],
  ['Bu planÄ± silmek', 'Bu planı silmek'],
  ['Ä°ptal', 'İptal'],
  ['Ä°simsiz', 'İsimsiz'],
  ['GeÃ§ici Plan', 'Geçici Plan'],
  ['TÃ¼m planlar', 'Tüm planlar'],
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
    .replace(/KayÄ±tlÄ±/g, 'Kayıtlı')
    .replace(/HenÃ¼z/g, 'Henüz')
    .replace(/AKTÄ°F/g, 'AKTİF')
    .replace(/ARÅÄ°V/g, 'ARŞİF')
    .replace(/Ä°/g, 'İ')
    .replace(/Ä±/g, 'ı')
    .replace(/ÅŸ/g, 'ş')
    .replace(/Åž/g, 'Ş')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ã–/g, 'Ö')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã‡/g, 'Ç')
    .replace(/â€“/g, '–')
    .replace(/â€™/g, '’')
    .replace(/â€œ/g, '“')
    .replace(/â€�/g, '”')
    .replace(/â€¦/g, '…')
    .replace(/â€¢/g, '•')
    .replace(/â€¢/g, '•')
    .replace(/GeÃ§ici/g, 'Geçici');

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
