/**
 * [State / ViewModel Layer]
 * 테마 상태 관리 및 클라이언트 런타임 스크립트 생성기 (Single Source of Truth)
 */
export type ThemeMode = 'dark' | 'light';

export const THEME_CONFIG = {
  dark: {
    label: '야간 전술 모드 [다크]',
    icon: '◐',
    bodyBg: 'bg-black',
    bodyText: 'text-white',
  },
  light: {
    label: '재생지 모드 [라이트]',
    icon: '☼',
    bodyBg: 'bg-[#f4f3ee]',
    bodyText: 'text-black',
  },
} as const;

export function getThemeRuntimeScript(): string {
  return `
    window.__THEME_CONFIG__ = ${JSON.stringify(THEME_CONFIG)};

    function applyTheme(isDark) {
      const html = document.documentElement;
      const cfg = window.__THEME_CONFIG__[isDark ? 'dark' : 'light'];
      const other = window.__THEME_CONFIG__[isDark ? 'light' : 'dark'];
      
      if (isDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }

      document.body.classList.remove(other.bodyBg, other.bodyText);
      document.body.classList.add(cfg.bodyBg, cfg.bodyText);

      const label = document.getElementById('mode-label');
      const icon = document.getElementById('mode-icon');
      if (label) label.innerText = cfg.label;
      if (icon) icon.innerText = cfg.icon;
    }

    function toggleTheme() {
      const isDark = !document.documentElement.classList.contains('dark');
      applyTheme(isDark);
      showToast(isDark ? '야간 전술 모드로 전환되었습니다.' : '고대비 재생지 모드로 전환되었습니다.');
    }
  `.trim();
}
