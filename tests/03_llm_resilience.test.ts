import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TopicCuratorService } from '../src/services/topic-curator.service.ts';

describe('🤖 [Suite 3: 실제 검증력] 불완전/오염된 LLM 응답 정규화 및 복원력 검증', () => {
  test('마크다운 백틱(```json ... ```)과 앞뒤 잡담 텍스트가 섞여 있어도 순수 JSON을 안전하게 파싱해야 한다', () => {
    const dirtyLlmResponse = `
      Certainly! Here is the tactical primitive survival protocol:
      \`\`\`json
      {
        "protocolId": "PR-02",
        "domain": "열 & 발화 공학",
        "branch": "마찰열 고속 회전 발화",
        "tier": 1,
        "koreanTitle": "프로토콜 #02: 마찰열 활비비 발화법",
        "threatOrUrgency": "CRITICAL",
        "coreKnowledge": {
          "problemContext": "저체온증 방지",
          "naturalResources": ["참나무 판", "회전축 가지"],
          "scientificPrinciple": "마찰 발화"
        }
      }
      \`\`\`
      Keep this safe in your archive!
    `;

    const parsed = TopicCuratorService.extractCleanJson(dirtyLlmResponse);
    assert.equal(parsed.protocolId, 'PR-02');
    assert.equal(parsed.domain, '열 & 발화 공학');
    assert.equal(parsed.koreanTitle, '프로토콜 #02: 마찰열 활비비 발화법');
    assert.equal(parsed.coreKnowledge.naturalResources.length, 2);
  });

  test('비정상적이거나 빈 텍스트가 전달되면 적절한 에러를 발생시켜야 한다', () => {
    assert.throws(() => {
      TopicCuratorService.extractCleanJson('');
    }, /LLM 응답 텍스트가 비어 있습니다/);
  });

  test('기존에 1편이 발행된 상태에서 다음 주제 요청 시 중복되지 않는 새로운 프로토콜을 도출해야 한다', async () => {
    const nextTopic = await TopicCuratorService.planNextTopic();
    assert.ok(nextTopic.protocolId, 'protocolId가 존재해야 함');
    assert.notEqual(nextTopic.koreanTitle, '프로토콜 #01: 오염된 물 마시는 방법 (야생 숯 여과)', '1편과 다른 새로운 주제여야 함');
    assert.equal(nextTopic.steps.length, 3, '단계는 정확히 3단계여야 함');
    assert.ok(nextTopic.fatalMistake.trap, '치명적 착각이 명시되어야 함');
    assert.ok(nextTopic.fatalMistake.consequence, '파국적 결과가 명시되어야 함');
  });
});
