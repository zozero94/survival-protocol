/**
 * [State Layer]
 * 인라인 하이퍼텍스트 크로스링크(`a[data-proto="crosslink"]`) 호버 프리뷰 런타임 스크립트
 * - 이벤트 위임(Event Delegation) 기반으로 작동하여 기존 PR-01 ~ PR-12 및 향후 모든 프로토콜,
 *   그리고 7개국어 실시간 언어 전환(Hot-Swap) 후에도 재바인딩 없이 100% 동작합니다.
 * - 외장 슬림 인덱스(`window.__SEARCH_DOCS__`)를 재활용하여 추가 네트워크 요청 없이 0ms 즉시 렌더링합니다.
 */
export function getCrosslinkRuntimeScript(): string {
  return `
    (function() {
      var hideTimer = null;
      var activeAnchor = null;
      var domCache = null;

      function getDom() {
        if (domCache && domCache.popover) return domCache;
        var popover = document.getElementById('tactical-crosslink-popover');
        if (!popover) return null;
        domCache = {
          popover: popover,
          cardLink: document.getElementById('popover-card-link'),
          catEl: document.getElementById('popover-category'),
          timeEl: document.getElementById('popover-time'),
          rateEl: document.getElementById('popover-rate'),
          hudEl: document.getElementById('popover-hud-code'),
          thumbEl: document.getElementById('popover-thumb'),
          titleEl: document.getElementById('popover-title'),
          sumEl: document.getElementById('popover-summary'),
          matEl: document.getElementById('popover-materials'),
          ctaEl: document.getElementById('popover-cta')
        };
        return domCache;
      }

      function getCurrentLocale() {
        var htmlLang = document.documentElement.getAttribute('lang');
        if (htmlLang && window.__SEARCH_DOCS__ && window.__SEARCH_DOCS__[htmlLang]) {
          return htmlLang;
        }
        try {
          var saved = localStorage.getItem('survival_lang');
          if (saved && window.__SEARCH_DOCS__ && window.__SEARCH_DOCS__[saved]) {
            return saved;
          }
        } catch (e) {}
        return 'ko';
      }

      function getCrosslinkLabels(lang) {
        var uiMap = window.__UI_STRINGS__;
        var ui = (uiMap && (uiMap[lang] || uiMap['ko'])) || {};
        return {
          matPrefix: ui.crosslinkMaterialsPrefix || (lang === 'ko' ? '준비물: ' : 'Materials: '),
          cta: ui.crosslinkCta || (lang === 'ko' ? '교범 보기 ↗' : 'OPEN ↗')
        };
      }

      function extractProtocolNum(href) {
        if (!href) return null;
        var m = String(href).match(/protocol-(\\d+)/i);
        if (!m || !m[1]) return null;
        return m[1].padStart(2, '0');
      }

      function findProtocolDoc(num, lang) {
        var docsByLocale = window.__SEARCH_DOCS__;
        if (!docsByLocale) return null;
        var list = docsByLocale[lang] || docsByLocale['ko'] || [];
        if (!Array.isArray(list)) return null;
        var targetId = 'PR-' + num;
        for (var i = 0; i < list.length; i++) {
          if (list[i] && list[i].id === targetId) {
            return list[i];
          }
        }
        return null;
      }

      function positionPopover(popover, anchor) {
        var rect = anchor.getBoundingClientRect();
        var vw = window.innerWidth || document.documentElement.clientWidth;
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var popW = popover.offsetWidth || 340;
        var popH = popover.offsetHeight || 285;
        var margin = 12;

        var left = rect.left + (rect.width / 2) - (popW / 2);
        if (left < margin) left = margin;
        if (left + popW > vw - margin) left = Math.max(margin, vw - popW - margin);

        // 상단 공간이 충분하면 앵커 위에 배치, 부족하면 앵커 바로 아래에 배치하여 앵커 자체를 덮지 않도록 보장
        var spaceAbove = rect.top - margin;
        var spaceBelow = vh - rect.bottom - margin;
        var top;
        if (spaceAbove >= popH + 10 || spaceAbove >= spaceBelow) {
          top = Math.max(margin, rect.top - popH - 10);
        } else {
          top = Math.max(margin, rect.bottom + 10);
        }

        popover.style.left = Math.round(left) + 'px';
        popover.style.top = Math.round(top) + 'px';
      }

      function showPopoverForAnchor(anchor) {
        var dom = getDom();
        if (!dom) return;

        var href = anchor.getAttribute('href') || '';
        var num = extractProtocolNum(href);
        if (!num) return;

        var lang = getCurrentLocale();
        var doc = findProtocolDoc(num, lang);
        if (!doc) return;

        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
        activeAnchor = anchor;

        var labels = getCrosslinkLabels(lang);

        if (dom.cardLink) {
          var targetHref = doc.url || (lang === 'ko' ? '/protocol-' + num + '.html' : '/protocol-' + num + '.html?lang=' + encodeURIComponent(lang));
          dom.cardLink.setAttribute('href', targetHref);
        }
        if (dom.catEl) dom.catEl.textContent = doc.categoryName || ('[' + doc.category + ']');
        if (dom.timeEl) dom.timeEl.textContent = doc.timeRequired ? ('⏱ ' + doc.timeRequired) : '';
        if (dom.rateEl) {
          dom.rateEl.textContent = doc.successRate || '';
          dom.rateEl.style.display = doc.successRate ? 'inline-block' : 'none';
        }
        if (dom.hudEl) dom.hudEl.textContent = 'FIG. ' + doc.id + ' // TARGET OUTCOME';
        if (dom.thumbEl) {
          var rawThumb = doc.thumbnailUrl || ('/svgs/pr' + num + '-outcome.svg');
          var thumbSrc = /^\\/(svgs|images)\\//.test(rawThumb) ? rawThumb : ('/svgs/pr' + num + '-outcome.svg');
          if (dom.thumbEl.getAttribute('src') !== thumbSrc) {
            dom.thumbEl.removeAttribute('src');
            dom.thumbEl.setAttribute('src', thumbSrc);
          }
          dom.thumbEl.setAttribute('alt', doc.title || '');
        }
        if (dom.titleEl) dom.titleEl.textContent = doc.title || '';
        if (dom.sumEl) dom.sumEl.textContent = doc.summary || '';
        if (dom.matEl) dom.matEl.textContent = doc.materials ? (labels.matPrefix + doc.materials) : '';
        if (dom.ctaEl) dom.ctaEl.textContent = labels.cta;

        dom.popover.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        dom.popover.classList.add('opacity-100', 'pointer-events-auto');
        dom.popover.setAttribute('aria-hidden', 'false');

        positionPopover(dom.popover, anchor);
      }

      function scheduleHidePopover() {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(function() {
          hidePopoverImmediate();
        }, 130);
      }

      function hidePopoverImmediate() {
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
        activeAnchor = null;
        var dom = getDom();
        if (!dom) return;
        dom.popover.classList.remove('opacity-100', 'pointer-events-auto');
        dom.popover.classList.add('hidden', 'opacity-0', 'pointer-events-none');
        dom.popover.setAttribute('aria-hidden', 'true');
      }

      document.addEventListener('mouseover', function(e) {
        if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
        var target = e.target;
        if (!target || typeof target.closest !== 'function') return;

        var crosslink = target.closest('a[data-proto="crosslink"]');
        if (crosslink) {
          if (crosslink === activeAnchor) {
            if (hideTimer) {
              clearTimeout(hideTimer);
              hideTimer = null;
            }
            return;
          }
          showPopoverForAnchor(crosslink);
          return;
        }

        if (activeAnchor && target.closest('#tactical-crosslink-popover')) {
          if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
          }
        }
      });

      document.addEventListener('mouseout', function(e) {
        if (!activeAnchor) return;
        var target = e.target;
        if (!target || typeof target.closest !== 'function') return;

        var crosslink = target.closest('a[data-proto="crosslink"]');
        var insidePopover = target.closest('#tactical-crosslink-popover');
        if (crosslink || insidePopover) {
          var related = e.relatedTarget;
          if (related && typeof related.closest === 'function') {
            if (related.closest('#tactical-crosslink-popover') || related.closest('a[data-proto="crosslink"]') === activeAnchor) {
              return;
            }
          }
          scheduleHidePopover();
        }
      });

      document.addEventListener('focusin', function(e) {
        var target = e.target;
        if (!target || typeof target.closest !== 'function') return;
        var crosslink = target.closest('a[data-proto="crosslink"]');
        if (crosslink) {
          showPopoverForAnchor(crosslink);
        }
      });

      document.addEventListener('focusout', function(e) {
        if (!activeAnchor) return;
        var target = e.target;
        if (!target || typeof target.closest !== 'function') return;
        if (target.closest('a[data-proto="crosslink"]') || target.closest('#tactical-crosslink-popover')) {
          var related = e.relatedTarget;
          if (related && typeof related.closest === 'function') {
            if (related.closest('#tactical-crosslink-popover') || related.closest('a[data-proto="crosslink"]') === activeAnchor) {
              return;
            }
          }
          scheduleHidePopover();
        }
      });

      window.addEventListener('scroll', function() {
        if (activeAnchor) hidePopoverImmediate();
      }, { passive: true });

      window.addEventListener('pagehide', function() {
        if (activeAnchor) hidePopoverImmediate();
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && activeAnchor) {
          hidePopoverImmediate();
        }
      });
    })();
  `.trim();
}
