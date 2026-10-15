import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PlainKoreanEditorService } from '../src/services/plain-korean-editor.service.ts';
import type { Protocol } from '../src/types/protocol.types.ts';

describe('🧒 [Suite 14: 초등학생 눈높이 생존 문체 감수 엔진]', () => {
  it('난해한 학술·전문 용어(다공성, 흡착, 비등 멸균, 플러싱 등)를 정확히 탐지해야 한다', () => {
    const difficultText = '다공성 활성탄 흡착 표면을 거친 후 100℃ 비등 멸균과 플러싱을 수행합니다.';
    const result = PlainKoreanEditorService.auditText(difficultText);

    assert.strictEqual(result.passed, false);
    assert.ok(result.issues.length >= 3);
    assert.ok(result.issues.some(i => i.word.includes('다공성')));
    assert.ok(result.issues.some(i => i.word.includes('비등')));
    assert.ok(result.issues.some(i => i.word.includes('플러싱')));
  });

  it('초등학생도 이해할 수 있는 쉬운 일상어로 작성된 문장은 감수를 통과해야 한다', () => {
    const easyText = '나뭇가지 3개를 묶어 삼발이를 세우고, 숯가루를 씻어내기 위해 첫 2컵은 버린 뒤 큰 거품이 솟구치도록 펄펄 끓입니다.';
    const result = PlainKoreanEditorService.auditText(easyText);

    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.issues.length, 0);
  });

  it('auditProtocol은 난해한 전문 용어가 다수 포함된 프로토콜에 대해 REJECTED 또는 감점을 판정해야 한다', () => {
    const sampleProtocol: Partial<Protocol> = {
      protocolId: 'PR-TEST',
      category: 'WATER',
      title: '다공성 활성탄 여과와 비등 멸균',
      summary: '플러싱을 통해 수인성 전염병 병원체를 차단합니다.',
      materials: [{ id: 'm1', name: '활성탄', desc: '다공성 흡착재' }],
      steps: [
        {
          stepNumber: '01',
          title: '3점 지지 삼각대 가설',
          description: '열분해로 생성된 숯을 충진합니다.',
          actionNote: '백드래프트에 주의하세요.',
          svgFileName: 'test.svg',
          svgLabels: ['label1']
        }
      ]
    };

    const report = PlainKoreanEditorService.auditProtocol(sampleProtocol as Protocol);
    assert.strictEqual(report.passed, false);
    assert.ok(report.score < 60);
    assert.strictEqual(report.grade, 'REJECTED');
  });

  it('autoFixKnownJargon은 알려진 난해어를 쉬운 일상어 권장어로 자동 변환해야 한다', () => {
    const text = '다공성 숯을 넣고 플러싱 후 100℃ 비등 멸균을 합니다.';
    const fixed = PlainKoreanEditorService.autoFixKnownJargon(text);

    assert.ok(!fixed.includes('플러싱'));
    assert.ok(!fixed.includes('비등 멸균'));
    assert.ok(fixed.includes('첫 1~2컵 버리기'));
    assert.ok(fixed.includes('펄펄 끓여서 세균 죽이기'));
  });
});
