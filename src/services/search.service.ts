import Fuse, { type IFuseOptions } from 'fuse.js';
import fs from 'node:fs';
import path from 'node:path';
import type { Protocol } from '../types/protocol.types.ts';
import type { SupportedLocale } from '../i18n/locales.ts';
import { extractChosung, isPureChosung, cleanSearchText } from '../utils/hangul.util.ts';
import { UI_STRINGS } from '../i18n/ui-strings.ts';

/**
 * [Data Layer]
 * 검색 전용 경량 슬림 인덱스 문서
 * 대용량 SVG 벡터 도면, 실사 이미지, 타임스탬프 등을 완전 배제하여
 * 메모리 80% 이상 절감 및 100% 오프라인 고속 탐색을 지원한다.
 */
export interface SearchDocument {
  id: string;               // "PR-01"
  url: string;              // "/protocol-01"
  category: string;         // "WATER"
  categoryName: string;     // "[물 구하기]"
  title: string;            // "오염된 물 100% 정수하는 3단계 페트병 필터"
  titleChosung?: string;    // "ㅇㅇㄷ ㅁ 100% ㅈㅅㅎㄴ 3ㄷㄱ ㅍㅌㅂ ㅍㅌ"
  summary: string;          // 요약문
  summaryChosung?: string;  // 요약문 초성
  materials: string;        // "참나무, 고운 모래, 굵은 모래, 숯"
  materialsChosung?: string;// 재료 초성
  steps: string;            // 단계별 제목 및 본문 결합
  deepDives: string;        // 스티치 딥다이브 뱃지 및 과학적 원리
}

export interface SearchResultItem {
  id: string;
  url: string;
  category: string;
  categoryName: string;
  title: string;
  titleHighlighted: string;
  snippet: string;
  score: number;
}

export const REGULAR_FUSE_OPTIONS: IFuseOptions<SearchDocument> = {
  includeMatches: true,
  includeScore: true,
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 1,
  keys: [
    { name: 'title', weight: 0.35 },
    { name: 'titleChosung', weight: 0.15 },
    { name: 'summary', weight: 0.20 },
    { name: 'materials', weight: 0.15 },
    { name: 'steps', weight: 0.10 },
    { name: 'deepDives', weight: 0.05 },
  ],
};

export const CHOSUNG_FUSE_OPTIONS: IFuseOptions<SearchDocument> = {
  includeMatches: true,
  includeScore: true,
  threshold: 0.25,
  ignoreLocation: true,
  minMatchCharLength: 1,
  keys: [
    { name: 'titleChosung', weight: 0.50 },
    { name: 'summaryChosung', weight: 0.30 },
    { name: 'materialsChosung', weight: 0.20 },
  ],
};

/**
 * [Service Layer]
 * 클라이언트 및 서버 공용 인메모리 검색 엔진 서비스
 */
export class SearchService {
  /**
   * 원본 프로토콜 배열로부터 검색 전용 슬림 인덱스를 추출·구축한다.
   */
  public static buildSlimIndex(
    protocols: Protocol[],
    locale: SupportedLocale = 'ko'
  ): SearchDocument[] {
    return protocols.map((p) => {
      const num = p.protocolId.replace(/\D/g, '').padStart(2, '0');
      const url = locale === 'ko' ? `/protocol-${num}` : `/protocol-${num}?lang=${locale}`;

      const cleanTitle = cleanSearchText(p.title);
      const cleanSummary = cleanSearchText(p.summary);

      const matList = (p.materials || []).map((m) => cleanSearchText(m.name)).join(', ');
      const stepTextList = (p.steps || [])
        .map((s) => `${cleanSearchText(s.title)} ${cleanSearchText(s.description)} ${cleanSearchText(s.actionNote || '')}`)
        .join(' ');

      const deepDivesList = (p.steps || [])
        .filter((s) => s.deepDive)
        .map((s) => {
          const specsText = (s.deepDive?.fieldSpecs || [])
            .map((fs) => {
              const traitsStr = (fs.traits || []).map((t) => `${cleanSearchText(t.label)} ${cleanSearchText(t.value)}`).join(' ');
              return `${cleanSearchText(fs.name)} ${cleanSearchText(fs.scientificName || '')} ${traitsStr} ${cleanSearchText(fs.fieldUse || '')}`;
            })
            .join(' ');
          return `${cleanSearchText(s.deepDive?.badge || '')} ${cleanSearchText(s.deepDive?.title || '')} ${cleanSearchText(s.deepDive?.text || '')} ${specsText}`.trim();
        })
        .join(' ');

      const ui = UI_STRINGS[locale] || UI_STRINGS.ko;
      const catKey = (`cat_${p.category}`) as keyof typeof ui;
      const categoryName = (ui[catKey] as string) || `[${p.category}]`;

      const doc: SearchDocument = {
        id: p.protocolId,
        url,
        category: p.category,
        categoryName,
        title: cleanTitle,
        summary: cleanSummary,
        materials: matList,
        steps: stepTextList,
        deepDives: deepDivesList,
      };

      if (locale === 'ko') {
        doc.titleChosung = extractChosung(cleanTitle);
        doc.summaryChosung = extractChosung(cleanSummary);
        doc.materialsChosung = extractChosung(matList);
      }

      return doc;
    });
  }

  /**
   * Fuse.js 인스턴스를 생성한다.
   */
  public static createFuseInstance(
    docs: SearchDocument[],
    isChosung: boolean = false
  ): Fuse<SearchDocument> {
    const options = isChosung ? CHOSUNG_FUSE_OPTIONS : REGULAR_FUSE_OPTIONS;
    return new Fuse(docs, options);
  }

  /**
   * 검색어에 따라 일반 검색 또는 초성 검색을 분기 실행하여 결과를 가공·반환한다.
   */
  public static search(
    docs: SearchDocument[],
    rawQuery: string,
    limit: number = 10
  ): SearchResultItem[] {
    const query = rawQuery.trim();
    if (!query) return [];

    const isChosung = isPureChosung(query);
    const fuse = this.createFuseInstance(docs, isChosung);
    const fuseResults = fuse.search(query, { limit });

    return fuseResults.map((result) => {
      const doc = result.item;
      const score = result.score ?? 1.0;
      const matches = result.matches || [];

      // 1. 제목 하이라이팅 추출
      let titleHighlighted = doc.title;
      const titleMatch = matches.find(
        (m) => m.key === 'title' || (isChosung && m.key === 'titleChosung')
      );

      if (titleMatch && titleMatch.indices && titleMatch.indices.length > 0) {
        // titleChosung 매칭의 경우 글자 수가 1:1 대응하므로 title 원본에 그대로 하이라이트 투영
        titleHighlighted = this.highlightText(doc.title, titleMatch.indices);
      } else {
        // 퍼지 일치로 놓쳤거나 직접 매칭된 경우 보조 검색
        titleHighlighted = this.highlightFallback(doc.title, query);
      }

      // 2. 스니펫 발췌 (요약문 -> 재료 -> 스텝 순으로 매칭 탐색)
      let snippet = '';
      const summaryMatch = matches.find(
        (m) => m.key === 'summary' || (isChosung && m.key === 'summaryChosung')
      );
      const materialsMatch = matches.find(
        (m) => m.key === 'materials' || (isChosung && m.key === 'materialsChosung')
      );
      const stepsMatch = matches.find((m) => m.key === 'steps');
      const deepDivesMatch = matches.find((m) => m.key === 'deepDives');

      if (summaryMatch && summaryMatch.indices && summaryMatch.indices.length > 0) {
        snippet = this.extractSnippet(doc.summary, summaryMatch.indices);
      } else if (materialsMatch && materialsMatch.indices && materialsMatch.indices.length > 0) {
        snippet = `[재료] ${this.extractSnippet(doc.materials, materialsMatch.indices)}`;
      } else if (stepsMatch && stepsMatch.indices && stepsMatch.indices.length > 0) {
        snippet = `[스텝] ${this.extractSnippet(doc.steps, stepsMatch.indices)}`;
      } else if (deepDivesMatch && deepDivesMatch.indices && deepDivesMatch.indices.length > 0) {
        snippet = `[원리] ${this.extractSnippet(doc.deepDives, deepDivesMatch.indices)}`;
      } else {
        // 매칭 정보가 없으면 기본 요약문 앞부분 발췌
        snippet = doc.summary.length > 80 ? `${doc.summary.slice(0, 80)}...` : doc.summary;
      }

      return {
        id: doc.id,
        url: doc.url,
        category: doc.category,
        categoryName: doc.categoryName,
        title: doc.title,
        titleHighlighted,
        snippet,
        score,
      };
    });
  }

  /**
   * Fuse.js 매칭 인덱스 구간을 택티컬 옐로우(#fde68a) 하이라이트 태그로 변환한다.
   */
  public static highlightText(
    text: string,
    rawIndices: readonly [number, number][]
  ): string {
    if (!text) return '';
    if (!rawIndices || rawIndices.length === 0) return this.escapeHtml(text);

    // 인덱스 정렬 및 겹치는 구간 병합
    const sorted = [...rawIndices].sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prev = merged[merged.length - 1];
      const cur = sorted[i];
      if (cur[0] <= prev[1] + 1) {
        prev[1] = Math.max(prev[1], cur[1]);
      } else {
        merged.push(cur);
      }
    }

    let result = '';
    let lastIndex = 0;

    for (const [start, end] of merged) {
      if (start > lastIndex) {
        result += this.escapeHtml(text.slice(lastIndex, start));
      }
      const matchedSlice = text.slice(start, end + 1);
      result += `<mark class="bg-[#fde68a]/20 text-[#fde68a] font-bold px-0.5 border-b border-[#fde68a]/60">${this.escapeHtml(matchedSlice)}</mark>`;
      lastIndex = end + 1;
    }

    if (lastIndex < text.length) {
      result += this.escapeHtml(text.slice(lastIndex));
    }

    return result;
  }

  /**
   * 긴 본문에서 매칭 위치 중심 앞뒤 40자를 발췌하고 스니펫을 생성한다.
   */
  public static extractSnippet(
    text: string,
    indices: readonly [number, number][],
    radius: number = 35
  ): string {
    if (!text) return '';
    if (!indices || indices.length === 0) {
      return text.length > radius * 2 ? `${this.escapeHtml(text.slice(0, radius * 2))}...` : this.escapeHtml(text);
    }

    const firstMatch = indices[0];
    const matchStart = firstMatch[0];
    const matchEnd = firstMatch[1];

    const sliceStart = Math.max(0, matchStart - radius);
    const sliceEnd = Math.min(text.length, matchEnd + radius);

    // 스니펫 내부의 인덱스로 재계산
    const adjustedIndices: [number, number][] = indices
      .filter(([s, e]) => s >= sliceStart && e <= sliceEnd)
      .map(([s, e]) => [s - sliceStart, e - sliceStart]);

    const snippetRaw = text.slice(sliceStart, sliceEnd);
    const highlighted = this.highlightText(snippetRaw, adjustedIndices);

    const prefix = sliceStart > 0 ? '...' : '';
    const suffix = sliceEnd < text.length ? '...' : '';

    return `${prefix}${highlighted}${suffix}`;
  }

  /**
   * 브라우저 환경에서 window.Fuse로 즉시 실행 가능한 번들 스크립트를 반환한다.
   */
  public static getBrowserFuseScript(): string {
    const candidatePaths = [
      path.join(process.cwd(), 'node_modules/fuse.js/dist/fuse.basic.min.cjs'),
      path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../node_modules/fuse.js/dist/fuse.basic.min.cjs'),
    ];
    let rawCjs = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        rawCjs = fs.readFileSync(p, 'utf-8');
        break;
      }
    }
    if (!rawCjs) {
      throw new Error('fuse.basic.min.cjs 파일을 찾을 수 없습니다.');
    }
    return `/* Fuse.js v7.5.0 Browser Runtime Wrapper (100% Offline) */
(function(global) {
  var module = { exports: {} };
${rawCjs}
  global.Fuse = module.exports;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
`;
  }

  /**
   * Fuse matches가 없을 때 검색어 직접 부분 문자열 매칭 폴백
   * HTML 엔티티 파괴를 방지하기 위해 원본 텍스트 매칭 인덱스를 기반으로 슬라이스 후 이스케이프한다.
   */
  private static highlightFallback(text: string, query: string): string {
    if (!text) return '';
    if (!query) return this.escapeHtml(text);
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const indices: [number, number][] = [];
    let pos = 0;
    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
      indices.push([pos, pos + query.length - 1]);
      pos += query.length;
    }
    if (indices.length > 0) {
      return this.highlightText(text, indices);
    }
    return this.escapeHtml(text);
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
