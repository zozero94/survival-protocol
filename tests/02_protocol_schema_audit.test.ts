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

      // 2. 도면 단계 필수성 (주제 난이도에 따라 3~8단계 가변 구성)
      assert.ok(
        content.steps.length >= 3 && content.steps.length <= 8,
        `${file}: 단계(steps)는 최소 3개 이상 8개 이하여야 함 (현재: ${content.steps.length})`
      );
      const imagesDir = path.resolve(__dirname, '../content/images');

      content.steps.forEach((step: any, idx: number) => {
        assert.ok(step.stepNumber, `${file} [Step ${idx + 1}]: stepNumber 누락`);
        assert.ok(step.title, `${file} [Step ${idx + 1}]: title 누락`);
        assert.ok(step.description, `${file} [Step ${idx + 1}]: description 누락`);
        assert.ok(step.svgFileName, `${file} [Step ${idx + 1}]: svgFileName 매핑 누락`);

        if (step.deepDive?.fieldSpecs) {
          step.deepDive.fieldSpecs.forEach((spec: any, sIdx: number) => {
            if (spec.imageFileName) {
              assert.ok(
                fs.existsSync(path.join(imagesDir, spec.imageFileName)),
                `${file} [Step ${idx + 1} Spec ${sIdx + 1}]: 실물 이미지 파일 누락 -> content/images/${spec.imageFileName} 파일이 실제로 존재해야 합니다 (엑스박스 방지)`
              );
            }
          });
        }
      });

      // 3. 치명적 실수 3대 요소 필수성
      assert.ok(content.fatalMistake, `${file}: fatalMistake 누락`);
      assert.ok(content.fatalMistake.title, `${file}: fatalMistake.title 누락`);
      assert.ok(content.fatalMistake.description, `${file}: fatalMistake.description 누락`);
      assert.ok(content.fatalMistake.consequence, `${file}: fatalMistake.consequence 누락`);

      // 4. 완성 결과물 프리뷰(outcome) 필수성 및 도면 파일 실존 검증
      const svgsDir = path.resolve(__dirname, '../content/svgs');
      assert.ok(content.outcome, `${file}: outcome(완성 결과물 프리뷰) 누락`);
      assert.ok(content.outcome.title, `${file}: outcome.title 누락`);
      assert.ok(content.outcome.description, `${file}: outcome.description 누락`);
      assert.ok(content.outcome.svgFileName, `${file}: outcome.svgFileName 누락`);
      assert.ok(
        fs.existsSync(path.join(svgsDir, content.outcome.svgFileName)),
        `${file}: outcome 도면 파일 누락 -> content/svgs/${content.outcome.svgFileName}`
      );

      // 5. FAQ 트러블슈팅 스키마 무결성 검증 (question, causeDiagnostic, resolution 필수)
      if (content.faqs) {
        assert.ok(
          Array.isArray(content.faqs) && content.faqs.length >= 2,
          `${file}: faqs 배열은 최소 2개 이상의 항목을 포함해야 함`
        );
        content.faqs.forEach((faq: any, fIdx: number) => {
          assert.ok(faq.question, `${file} [FAQ ${fIdx + 1}]: question 누락`);
          assert.ok(
            faq.causeDiagnostic,
            `${file} [FAQ ${fIdx + 1}]: causeDiagnostic 누락 (answer 단일 필드 사용 금지)`
          );
          assert.ok(
            faq.resolution,
            `${file} [FAQ ${fIdx + 1}]: resolution 누락 (answer 단일 필드 사용 금지)`
          );
        });
      }

      // 6. 다국어 로케일 파일(6개국어)의 outcome 및 faqs 스키마 동기화 검증
      const localesDir = path.resolve(__dirname, '../content/protocols/locales');
      const baseSlug = file.replace(/\.json$/, '');
      for (const lang of ['en', 'ja', 'es', 'de', 'pt', 'zh-TW']) {
        const localeFile = `${baseSlug}.${lang}.json`;
        const localePath = path.join(localesDir, localeFile);
        if (fs.existsSync(localePath)) {
          const localeContent = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
          assert.ok(localeContent.outcome, `${localeFile}: outcome 누락`);
          assert.ok(localeContent.outcome.title, `${localeFile}: outcome.title 누락`);
          assert.ok(localeContent.outcome.description, `${localeFile}: outcome.description 누락`);
          if (localeContent.faqs) {
            localeContent.faqs.forEach((faq: any, fIdx: number) => {
              assert.ok(faq.question, `${localeFile} [FAQ ${fIdx + 1}]: question 누락`);
              assert.ok(
                faq.causeDiagnostic,
                `${localeFile} [FAQ ${fIdx + 1}]: causeDiagnostic 누락 (answer 단일 필드 사용 금지)`
              );
              assert.ok(
                faq.resolution,
                `${localeFile} [FAQ ${fIdx + 1}]: resolution 누락 (answer 단일 필드 사용 금지)`
              );
            });
          }
        }
      }
    });
  }
});
