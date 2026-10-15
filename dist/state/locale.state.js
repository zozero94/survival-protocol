import { SUPPORTED_LOCALES, CLIENT_LOCALE_DETECTOR_BODY } from '../i18n/locales.js';
import { UI_STRINGS } from '../i18n/ui-strings.js';

/**
 * [State / ViewModel Layer]
 * 100% 선언적(Declarative) data-i18n & data-proto 범용 데이터 바인딩 핫스왑 엔진 (SSOT)
 */
export function getLocaleRuntimeScript()         {
  return `
    window.__SUPPORTED_LOCALES__ = ${JSON.stringify(Object.keys(SUPPORTED_LOCALES))};
    window.__UI_STRINGS__ = ${JSON.stringify(UI_STRINGS)};

    /**
     * W3C 표준 브라우저 헤더 및 환경 감지 (URL -> localStorage -> navigator.language -> 기본값)
     */
    function detectInitialLocale() {
      ${CLIENT_LOCALE_DETECTOR_BODY}
      return (lang && window.__PROTOCOLS__[lang]) ? lang : 'ko';
    }

    function renderHighlightTermsClient(text) {
      if (!text) return '';
      return text.replace(/\*\*(.*?)\*\*/g, function(_m, p1) {
        var isMetric = /\d+|cm|mm|kg|℃|도|분|초|방울|리터|L|ml|컵/i.test(p1);
        if (isMetric) {
          return '<strong class="text-[#fde68a] font-mono font-bold bg-[#221f14] px-1 py-0.5 border border-[#4a3b1a] select-text">' + p1 + '</strong>';
        }
        return '<strong class="text-white font-bold bg-[#262626] px-1 py-0.5 border border-[#383838] select-text">' + p1 + '</strong>';
      });
    }

    function renderStepDescriptionClient(desc) {
      if (!desc) return '';
      var lines = desc.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(Boolean);
      var isNumbered = lines.some(function(l) { return /^(?:\d+[\.\)]|\(\d+\))\s+/.test(l); });
      if (!isNumbered) {
        return renderHighlightTermsClient(desc);
      }
      var curNum = 1;
      return lines.map(function(line) {
        var match = line.match(/^(?:\d+[\.\)]|\(\d+\))\s+(.*)$/);
        var content = match ? match[1] : line;
        var numStr = String(curNum++).padStart(2, '0');
        var actionTitle = '';
        var actionDetail = content;
        var tm = content.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
        if (tm) {
          actionTitle = tm[1];
          actionDetail = tm[2];
        }
        return '<div class="bg-[#121212] border border-[#262626] hover:border-[#383838] p-3 sm:p-3.5 flex items-start space-x-3 transition-colors">' +
          '<span class="text-[#fde68a] font-mono font-bold text-xs bg-[#080808] px-2 py-0.5 border border-[#383838] select-none flex-shrink-0 mt-0.5">' + numStr + '</span>' +
          '<div class="flex-1 text-xs sm:text-sm leading-relaxed space-y-0.5">' +
          (actionTitle ? '<div class="text-white font-bold tracking-tight font-sans">' + actionTitle + '</div>' : '') +
          '<div class="text-[#cfcfcf] font-sans leading-relaxed">' + renderHighlightTermsClient(actionDetail) + '</div>' +
          '</div></div>';
      }).join('\n');
    }

    /**
     * 100% 선언적 범용 데이터 바인딩 0.01초 핫스왑 엔진
     */
    function switchLocale(targetLocale) {
      try {
        var proto = window.__PROTOCOLS__[targetLocale];
        var ui = window.__UI_STRINGS__[targetLocale];
        if (!proto || !ui) {
          showToast('해당 언어는 현재 준비 중입니다.');
          return;
        }

        document.documentElement.lang = targetLocale;

        // 1. [선언적 엔진] UI 정적 문자열 자동 매핑 (data-i18n)
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
          var key = el.getAttribute('data-i18n');
          if (ui[key] !== undefined) el.innerText = ui[key];
        });

        // 2. [선언적 엔진] 프로토콜 단일 필드 자동 매핑 (data-proto) 및 브라우저 탭 <title> 갱신
        document.querySelectorAll('[data-proto]').forEach(function(el) {
          var field = el.getAttribute('data-proto');
          if (proto[field] !== undefined) {
            if (el.tagName === 'TITLE') {
              el.textContent = (ui.brandShort || '[SURVIVAL PROTOCOL]') + ' // ' + proto[field];
            } else if (field === 'createdAt') {
              var cd = new Date(proto[field]);
              if (!isNaN(cd.getTime())) {
                var ckst = new Date(cd.getTime() + 9 * 3600000);
                var cy = ckst.getUTCFullYear();
                var cm = String(ckst.getUTCMonth() + 1).padStart(2, '0');
                var cday = String(ckst.getUTCDate()).padStart(2, '0');
                el.innerText = cy + '.' + cm + '.' + cday;
              } else {
                el.innerText = String(proto[field]).slice(0, 10).replace(/-/g, '.');
              }
            } else if (field === 'updatedAt') {
              var ud = new Date(proto[field]);
              var uContainer = document.getElementById('proto-updated-container');
              if (proto[field] && !isNaN(ud.getTime())) {
                var ukst = new Date(ud.getTime() + 9 * 3600000);
                var uy = ukst.getUTCFullYear();
                var um = String(ukst.getUTCMonth() + 1).padStart(2, '0');
                var uday = String(ukst.getUTCDate()).padStart(2, '0');
                var uhh = String(ukst.getUTCHours()).padStart(2, '0');
                var umm = String(ukst.getUTCMinutes()).padStart(2, '0');
                el.innerText = uy + '.' + um + '.' + uday + ' ' + uhh + ':' + umm;
                if (uContainer) {
                  uContainer.classList.remove('hidden');
                  uContainer.classList.add('flex');
                }
              } else {
                el.innerText = '';
                if (uContainer) {
                  uContainer.classList.remove('flex');
                  uContainer.classList.add('hidden');
                }
              }
            } else {
              el.innerText = proto[field];
            }
          }
        });
        if (proto.title) {
          document.title = (ui.brandShort || '[SURVIVAL PROTOCOL]') + ' // ' + proto.title;
        }

        // 3. [선언적 엔진] 배열 반복 아이템 범용 자동 매핑 (data-proto-item, data-proto-prop, data-index)
        document.querySelectorAll('[data-proto-item]').forEach(function(el) {
          var itemKey = el.getAttribute('data-proto-item');
          var prop = el.getAttribute('data-proto-prop');
          var idx = parseInt(el.getAttribute('data-index'), 10);
          if (proto[itemKey] && proto[itemKey][idx] && proto[itemKey][idx][prop] !== undefined) {
            var val = proto[itemKey][idx][prop];
            if (prop === 'description' && el.id && el.id.startsWith('step-desc-')) {
              el.innerHTML = renderStepDescriptionClient(val);
            } else if (prop === 'actionNote' && el.id && el.id.startsWith('step-note-')) {
              el.innerHTML = renderHighlightTermsClient(val);
            } else {
              el.innerText = val;
            }
          }
        });

        // 4. [선언적 엔진] 치명적 실수(Fatal Mistake) 중첩 객체 자동 매핑 (data-proto-fatal)
        document.querySelectorAll('[data-proto-fatal]').forEach(function(el) {
          var prop = el.getAttribute('data-proto-fatal');
          if (proto.fatalMistake && proto.fatalMistake[prop] !== undefined) {
            el.innerText = proto.fatalMistake[prop];
          }
        });

        // 4-2. [선언적 엔진] 최종 결과물(Outcome) 중첩 객체 자동 매핑 (data-proto-outcome)
        document.querySelectorAll('[data-proto-outcome]').forEach(function(el) {
          var prop = el.getAttribute('data-proto-outcome');
          if (proto.outcome && proto.outcome[prop] !== undefined) {
            el.innerText = proto.outcome[prop];
          }
        });

        // 5. [선언적 엔진] 인라인 벡터 도면(SVG) 내부 <text> 다국어 핫스왑 (data-svg-step, data-svg-label)
        document.querySelectorAll('text[data-svg-step]').forEach(function(el) {
          var sIdx = parseInt(el.getAttribute('data-svg-step'), 10);
          var lIdx = parseInt(el.getAttribute('data-svg-label'), 10);
          if (
            proto.steps &&
            proto.steps[sIdx] &&
            Array.isArray(proto.steps[sIdx].svgLabels) &&
            proto.steps[sIdx].svgLabels[lIdx] !== undefined
          ) {
            el.textContent = proto.steps[sIdx].svgLabels[lIdx];
          }
        });

        // 6. 언어 스위처 UI 버튼 액티브 스타일 동기화
        document.querySelectorAll('[data-locale-btn]').forEach(function(btn) {
          var code = btn.getAttribute('data-locale-btn');
          btn.className = (code === targetLocale)
            ? 'px-1.5 py-0.5 text-[11px] font-mono font-bold transition-all bg-white text-black'
            : 'px-1.5 py-0.5 text-[11px] font-mono font-bold transition-all text-neutral-400 hover:text-white';
        });

        // 7. 체크리스트 카운터 실시간 재연산
        if (typeof updateChecklist === 'function') updateChecklist();

        // 8. 내부 네비게이션 링크(메인 복귀, 다음 프로토콜) 언어 파라미터 동기화
        document.querySelectorAll('a[href^="/"]').forEach(function(link) {
          var baseHref = link.getAttribute('href').split('?')[0];
          link.setAttribute('href', targetLocale === 'ko' ? baseHref : (baseHref + '?lang=' + targetLocale));
        });

        // 9. URL 파라미터 무새로고침 동기화
        if (window.history && window.history.replaceState) {
          var newUrl = window.location.pathname + '?lang=' + targetLocale;
          window.history.replaceState(null, '', newUrl);
        }
      } catch (err) {
        console.error('[i18n] Switch error:', err);
      } finally {
        // 8. FOUC 쉴드 해제 (어떤 경우에도 화면 노출 보장)
        document.documentElement.removeAttribute('data-fouc');
      }
    }
  `.trim();
}
