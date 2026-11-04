// Scene language: the landing page passes ?lang=en; Turkish otherwise.
export const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'tr';
export const EN = LANG === 'en';
// t('Türkçe', 'English') picks the text for the current language.
export const t = (tr, en) => (EN ? en : tr);
// Decimal separator: comma in Turkish, point in English.
export const num = (v, d = 2) => (EN ? v.toFixed(d) : v.toFixed(d).replace('.', ','));
// Percent sign goes before the number in Turkish (%65), after it in English (65%).
export const pct = v => (EN ? `${v}%` : `%${v}`);
