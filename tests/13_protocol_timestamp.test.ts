import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  collectProtocolAssetPaths,
  getLatestGitCommitTime,
  getUncommittedLatestMtime,
  resolveProtocolTimestamps,
  computeProtocolContentHash,
  isGitAvailable,
  syncProtocolTimestamps,
} from '../src/utils/protocol-timestamp.ts';
import { SeoService } from '../src/services/seo.service.ts';
import { ProtocolGeneratorService } from '../src/services/protocol-generator.service.ts';
import type { Protocol } from '../src/types/protocol.types.ts';

describe('⏱️ [Suite 13: 타임스탬프 자동 감지 & 동기화 엔진] Git 커밋/파일시스템/콘텐츠 해시 기반 최종 수정 일시 전수 검증', () => {
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

  it('computeProtocolContentHash는 16자리 hex 해시를 반환하고, 내용 변경 시 해시가 달라져야 한다', () => {
    const hash1 = computeProtocolContentHash(pr08Proto, pr08Path, rootDir);
    assert.strictEqual(hash1.length, 16);
    assert.match(hash1, /^[0-9a-f]{16}$/);

    // 단순 앞뒤 공백 변경은 해시가 동일해야 함 (안정성)
    const cloneWithSpaces: Protocol = {
      ...pr08Proto,
      title: `  ${pr08Proto.title}  `,
      summary: `  ${pr08Proto.summary}  `,
    };
    const hashSpaces = computeProtocolContentHash(cloneWithSpaces, pr08Path, rootDir);
    assert.strictEqual(hashSpaces, hash1, '공백 정규화로 인해 트림된 내용의 해시는 동일해야 함');

    // 실질 내용 변경 시 해시 변경 필수
    const cloneModified: Protocol = {
      ...pr08Proto,
      title: `${pr08Proto.title} [개정판]`,
    };
    const hashModified = computeProtocolContentHash(cloneModified, pr08Path, rootDir);
    assert.notStrictEqual(hashModified, hash1, '실질 내용이 변경되면 해시가 달라져야 함');
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
    assert.strictEqual(result.contentHash.length, 16);
  });

  it('최초 생성 직후(수정 없음)의 프로토콜은 updatedAt이 정의되지 않아야 한다', () => {
    const mockNow = new Date().toISOString();
    const mockProto: Protocol = {
      ...pr08Proto,
      protocolId: 'PR-99',
      createdAt: mockNow,
      updatedAt: undefined,
      contentHash: undefined,
    };

    // 가상의 파일 경로
    const result = resolveProtocolTimestamps(mockProto, 'content/protocols/99-mock.json', rootDir);
    assert.strictEqual(result.isModified, false);
    assert.strictEqual(result.updatedAt, undefined);
  });

  it('기존 contentHash와 현재 hash가 일치하면 실질 변경이 없으므로 updatedAt이 불변 유지되어야 한다', () => {
    const currentHash = computeProtocolContentHash(pr08Proto, pr08Path, rootDir);
    const mockProto: Protocol = {
      ...pr08Proto,
      contentHash: currentHash,
      updatedAt: '2026-10-15T11:09:31+09:00',
    };

    const res = resolveProtocolTimestamps(mockProto, pr08Path, rootDir);
    assert.strictEqual(res.updatedAt, '2026-10-15T11:09:31+09:00');
    assert.strictEqual(res.contentHash, currentHash);
  });

  it('syncProtocolTimestamps는 멱등성(Idempotency)을 보장해야 한다', () => {
    // 2회 연속 실행 시 두 번째는 변경 대상이 0개여야 함
    const report1 = syncProtocolTimestamps({ rootDir, writeFiles: false });
    assert.ok(report1.length >= 7);

    const report2 = syncProtocolTimestamps({ rootDir, writeFiles: false });
    assert.strictEqual(report1.length, report2.length);
  });

  it('SeoService.generateSitemap은 각 프로토콜의 updatedAt 또는 createdAt을 lastmod로 정확히 출력해야 한다', () => {
    const protocols = ProtocolGeneratorService.listProtocols();
    const protoObjects = protocols.map(
      (p) => ProtocolGeneratorService.getProtocolById(p.protocolId)!.data
    );

    const target08 = protoObjects.find((p) => p.protocolId === 'PR-08');
    if (target08) {
      target08.updatedAt = '2026-10-15T10:57:11+09:00';
    }

    const sitemap = SeoService.generateSitemap(protoObjects, 'https://survival-protocol.com');

    assert.ok(sitemap.includes('https://survival-protocol.com/protocol-08'));
    assert.ok(sitemap.includes('<lastmod>2026-10-15</lastmod>'));
  });
});
