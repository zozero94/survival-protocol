import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  collectProtocolAssetPaths,
  getLatestGitCommitTime,
  getUncommittedLatestMtime,
  resolveProtocolTimestamps,
} from '../src/utils/protocol-timestamp.ts';
import { SeoService } from '../src/services/seo.service.ts';
import { ProtocolGeneratorService } from '../src/services/protocol-generator.service.ts';
import type { Protocol } from '../src/types/protocol.types.ts';

describe('⏱️ [Suite 13: 타임스탬프 자동 감지 & 동기화 엔진] Git 커밋/파일시스템 기반 최종 수정 일시 전수 검증', () => {
  const rootDir = process.cwd();
  const pr08Path = path.join(rootDir, 'content/protocols/08-figure-four-deadfall.json');
  const pr08Proto: Protocol = JSON.parse(fs.readFileSync(pr08Path, 'utf-8'));

  it('collectProtocolAssetPaths는 마스터 JSON, 모든 스텝 SVG/이미지, 결과물 및 6개국어 번역본을 전수 수집해야 한다', () => {
    const assets = collectProtocolAssetPaths(pr08Proto, pr08Path, rootDir);

    assert.ok(assets.length >= 10, `에셋 개수가 최소 10개 이상이어야 함 (현재: ${assets.length}개)`);
    assert.ok(assets.some((p) => p.includes('08-figure-four-deadfall.json')), '마스터 JSON 포함 필수');
    assert.ok(assets.some((p) => p.includes('pr08-step-01.svg')), '스텝 1 SVG 포함 필수');
    assert.ok(assets.some((p) => p.includes('pr08-step-04.svg')), '스텝 4 SVG 포함 필수');
    assert.ok(assets.some((p) => p.includes('pr08-outcome')), '결과물 도면 또는 이미지 포함 필수');
    assert.ok(assets.some((p) => p.includes('.en.json')), '영어 번역본 포함 필수');
    assert.ok(assets.some((p) => p.includes('.ja.json')), '일본어 번역본 포함 필수');
  });

  it('getLatestGitCommitTime은 유효한 ISO 8601 타임스탬프를 반환해야 한다', () => {
    const assets = collectProtocolAssetPaths(pr08Proto, pr08Path, rootDir);
    const gitTime = getLatestGitCommitTime(assets, rootDir);

    assert.ok(gitTime !== null, 'Git 커밋 타임스탬프가 조회되어야 함');
    assert.ok(!isNaN(new Date(gitTime!).getTime()), '유효한 날짜여야 함');
    assert.ok(gitTime!.includes('2026-10-15'), '2026-10-15 일자의 커밋이어야 함');
  });

  it('resolveProtocolTimestamps는 PR-08의 최종 수정 일시를 최신 커밋 일시로 자동 산출해야 한다', () => {
    const result = resolveProtocolTimestamps(pr08Proto, pr08Path, rootDir);

    assert.ok(result.createdAt, '등록 일시가 존재해야 함');
    assert.ok(result.updatedAt, '수정 일시가 존재해야 함');
    assert.strictEqual(result.isModified, true, '수정 이력이 식별되어야 함');
    assert.ok(
      new Date(result.updatedAt!).getTime() >= new Date('2026-10-15T10:00:00+09:00').getTime(),
      '최종 수정 일시가 2026-10-15 오전 10시 이후여야 함'
    );
  });

  it('최초 생성 직후(수정 없음)의 프로토콜은 updatedAt이 정의되지 않아야 한다', () => {
    const mockNow = new Date().toISOString();
    const mockProto: Protocol = {
      ...pr08Proto,
      protocolId: 'PR-99',
      createdAt: mockNow,
      updatedAt: undefined,
    };

    // 가상의 파일 경로
    const result = resolveProtocolTimestamps(mockProto, 'content/protocols/99-mock.json', rootDir);
    assert.strictEqual(result.isModified, false);
    assert.strictEqual(result.updatedAt, undefined);
  });

  it('SeoService.generateSitemap은 각 프로토콜의 updatedAt 또는 createdAt을 lastmod로 정확히 출력해야 한다', () => {
    const protocols = ProtocolGeneratorService.listProtocols();
    const protoObjects = protocols.map(
      (p) => ProtocolGeneratorService.getProtocolById(p.protocolId)!.data
    );

    // PR-08에 updatedAt이 설정된 상태로 sitemap 생성
    const target08 = protoObjects.find((p) => p.protocolId === 'PR-08');
    if (target08) {
      target08.updatedAt = '2026-10-15T10:57:11+09:00';
    }

    const sitemap = SeoService.generateSitemap(protoObjects, 'https://survival-protocol.com');

    // PR-08의 URL 블록 검증
    assert.ok(sitemap.includes('https://survival-protocol.com/protocol-08'));
    assert.ok(sitemap.includes('<lastmod>2026-10-15</lastmod>'));
  });
});
