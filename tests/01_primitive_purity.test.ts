import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TopicCuratorService } from '../src/services/topic-curator.service.ts';

describe('🛡️ [Suite 1: 고증 방어] 현대 공산품 유입 완벽 차단 검증', () => {
  test('라이터, 건전지, 비닐, 알루미늄 등 현대 인공물이 감지되면 즉시 실패 처리해야 한다', () => {
    const forbiddenSamples = [
      ['마른 나뭇가지', '일회용 라이터', '부싯깃'],
      ['알루미늄 캔', '강모래', '숯'],
      ['플라스틱 페트병', '대나무 통'],
      ['합성섬유 밧줄', '차돌'],
      ['배터리', '철사'],
    ];

    for (const sample of forbiddenSamples) {
      const result = TopicCuratorService.auditNaturalPurity(sample);
      assert.equal(result.isPure, false, `현대 인공물(${result.detectedArtifact})이 감지되어야 함`);
    }
  });

  test('돌, 흙, 참나무 숯, 칡 섬유 등 100% 자연물만 들어왔을 때 통과해야 한다', () => {
    const pureSamples = [
      ['참나무 숯', '강모래', '직경 8cm 대나무', '말린 물이끼'],
      ['흑요석 파편', '사슴 뿔 망치', '소나무 송진'],
      ['마른 쐐기풀 줄기', '칡 껍질', '천연 목타르'],
    ];

    for (const sample of pureSamples) {
      const result = TopicCuratorService.auditNaturalPurity(sample);
      assert.equal(result.isPure, true, `순수 자연물(${sample.join(', ')})은 통과되어야 함`);
    }
  });
});
