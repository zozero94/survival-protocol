import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const protocolsDir = path.resolve(__dirname, '../content/protocols');

describe('📦 [Suite 2: 확장성] 전체 발행 프로토콜 데이터 무결성 전수 감사', () => {
  const files = fs.readdirSync(protocolsDir).filter((f) => f.endsWith('.json'));

  assert.ok(files.length > 0, '최소 1개 이상의 마스터 프로토콜 JSON 파일이 존재해야 함');

  for (const file of files) {
    test(`[데이터 규격 감사] ${file} 파일의 필수 킬러 포맷 규격 검증`, () => {
      const filePath = path.join(protocolsDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // 1. 프로토콜 식별 메타데이터
      assert.ok(content.protocolId, `${file}: protocolId 누락`);
      assert.ok(content.title, `${file}: title 누락`);
      assert.ok(content.threatLevel, `${file}: threatLevel 누락`);

      // 2. 도면 3단계 필수성
      assert.equal(content.steps.length, 3, `${file}: 단계(steps)는 반드시 정확히 3개여야 함`);
      content.steps.forEach((step: any, idx: number) => {
        assert.ok(step.stepNumber, `${file} [Step ${idx + 1}]: stepNumber 누락`);
        assert.ok(step.title, `${file} [Step ${idx + 1}]: title 누락`);
        assert.ok(step.description, `${file} [Step ${idx + 1}]: description 누락`);
        assert.ok(step.svgFileName, `${file} [Step ${idx + 1}]: svgFileName 매핑 누락`);
      });

      // 3. 치명적 실수 3대 요소 필수성
      assert.ok(content.fatalMistake, `${file}: fatalMistake 누락`);
      assert.ok(content.fatalMistake.title, `${file}: fatalMistake.title 누락`);
      assert.ok(content.fatalMistake.description, `${file}: fatalMistake.description 누락`);
      assert.ok(content.fatalMistake.consequence, `${file}: fatalMistake.consequence 누락`);
    });
  }
});
