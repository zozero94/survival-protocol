import fs from 'node:fs';
import path from 'node:path';
import { SvgDesignAuditorService } from '../src/services/svg-design-auditor.service.ts';
import type { SvgStepContext } from '../src/services/svg-audit.service.ts';

try {
  process.loadEnvFile();
} catch {}

async function main() {
  const args = process.argv.slice(2);
  const targetFilter = args[0]?.toUpperCase() || 'PR-08';
  const apiKey = process.env.GEMINI_API_KEY;

  console.log('===========================================================');
  console.log(`📐 [SVG Design Auditor] 기계역학 및 비전 도면 정밀 감사 (${targetFilter})`);
  console.log('===========================================================');

  const protocolsDir = path.resolve('content/protocols');
  const files = fs.readdirSync(protocolsDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));

  let totalChecked = 0;
  let totalPassed = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(protocolsDir, file), 'utf-8');
    const data = JSON.parse(raw);
    const pid = data.protocolId || file.slice(0, 2);

    if (targetFilter !== 'ALL' && !pid.includes(targetFilter.replace('PR-', '')) && pid !== targetFilter) {
      continue;
    }

    console.log(`\n📂 [프로토콜 검사]: ${pid} - ${data.title}`);

    // Steps 검사
    for (const step of data.steps || []) {
      const svgFileName = step.svgFileName;
      if (!svgFileName) continue;

      const svgPath = path.resolve('content/svgs', svgFileName);
      if (!fs.existsSync(svgPath)) continue;

      const svgCode = fs.readFileSync(svgPath, 'utf-8');
      const ctx: SvgStepContext = {
        topicTitle: data.title,
        stepNumber: step.stepNumber,
        stepTitle: step.title,
        actionDescription: step.description,
        actionNote: step.actionNote,
      };

      totalChecked++;
      const report = await SvgDesignAuditorService.auditSvgDesign(svgCode, ctx, apiKey);

      console.log(`\n  🎨 [${svgFileName}] Step ${step.stepNumber}: ${step.title}`);
      console.log(`     종합 점수: ${report.score}점 (수학: ${report.mathematicalScore}점, 비전: ${report.visionScore}점) | 판정: ${report.passed ? '✅ 통과 (PASS)' : '❌ 불합격 (FAIL)'}`);

      if (report.joints.length > 0) {
        console.log('     [기계역학 결합부 정합성 실측치]:');
        for (const j of report.joints) {
          const mark = j.passed ? '✓' : '✗';
          console.log(`       ${mark} ${j.name}: 이격 거리 = ${j.gapDistance}px (허용: <= 2.0px)`);
        }
      }

      if (report.issues.length > 0) {
        console.log('     [감지된 결함 목록]:');
        for (const iss of report.issues) {
          console.log(`       ⚠️ [${iss.category}] ${iss.reason}`);
          console.log(`          ↳ 교정: ${iss.fixInstruction}`);
        }
      }

      if (report.passed) {
        totalPassed++;
      }
    }

    // Outcome 검사
    if (data.outcome && data.outcome.svgFileName) {
      const svgFileName = data.outcome.svgFileName;
      const svgPath = path.resolve('content/svgs', svgFileName);
      if (fs.existsSync(svgPath)) {
        const svgCode = fs.readFileSync(svgPath, 'utf-8');
        const ctx: SvgStepContext = {
          topicTitle: data.title,
          stepNumber: 'FINAL',
          stepTitle: data.outcome.title || '완성 형태',
          actionDescription: data.outcome.description || '',
        };

        totalChecked++;
        const report = await SvgDesignAuditorService.auditSvgDesign(svgCode, ctx, apiKey);

        console.log(`\n  🌟 [${svgFileName}] Outcome: ${ctx.stepTitle}`);
        console.log(`     종합 점수: ${report.score}점 (수학: ${report.mathematicalScore}점, 비전: ${report.visionScore}점) | 판정: ${report.passed ? '✅ 통과 (PASS)' : '❌ 불합격 (FAIL)'}`);

        if (report.joints.length > 0) {
          console.log('     [기계역학 결합부 정합성 실측치]:');
          for (const j of report.joints) {
            const mark = j.passed ? '✓' : '✗';
            console.log(`       ${mark} ${j.name}: 이격 거리 = ${j.gapDistance}px (허용: <= 2.0px)`);
          }
        }

        if (report.issues.length > 0) {
          console.log('     [감지된 결함 목록]:');
          for (const iss of report.issues) {
            console.log(`       ⚠️ [${iss.category}] ${iss.reason}`);
            console.log(`          ↳ 교정: ${iss.fixInstruction}`);
          }
        }

        if (report.passed) {
          totalPassed++;
        }
      }
    }
  }

  console.log('\n===========================================================');
  console.log(`📊 [최종 검수 집계]: 총 ${totalChecked}개 도면 중 ${totalPassed}개 통과 (${Math.round((totalPassed / (totalChecked || 1)) * 100)}%)`);
  console.log('===========================================================');

  if (totalPassed < totalChecked) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('실행 중 에러 발생:', err);
  process.exit(1);
});
