/**
 * [Utils Layer]
 * XSS 방어 및 HTML Entity 인코딩 유틸리티
 */
export function escapeHtml(str        )         {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
