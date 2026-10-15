import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SvgDesignAuditorService } from '../src/services/svg-design-auditor.service.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('📐 [Suite 12: 벡터 도면 기계공학 축 & 유클리드 좌표 정밀 감사 검증]', () => {
  it('완벽히 결합된 4자 결합도면은 수학적 공차 점수 100점을 기록해야 한다', () => {
    // 세움대 (x=130..158, top y=105), 빗장대 (top at 144, 105; bottom at 285, 246), 먹이대 (y=230..246)
    const perfectlyAlignedSvg = `<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
      <rect x="130" y="105" width="28" height="180" fill="#2d261e" stroke="#1c1917" />
      <polygon points="144,105 160,121 285,246 265,246" fill="#44382c" stroke="#1c1917" />
      <polygon points="100,230 400,230 400,246 100,246" fill="#524334" stroke="#1c1917" />
    </svg>`;

    const mathResult = SvgDesignAuditorService.auditMechanicalAxesMath(perfectlyAlignedSvg);
    assert.strictEqual(mathResult.score, 100);
    assert.strictEqual(mathResult.issues.filter(i => i.severity === 'CRITICAL').length, 0);
    assert.strictEqual(mathResult.joints.length >= 2, true);

    const jointA = mathResult.joints.find(j => j.name.includes('Joint A'));
    assert.ok(jointA, 'Joint A must exist');
    assert.strictEqual(jointA.passed, true);
    assert.strictEqual(jointA.gapDistance <= SvgDesignAuditorService.TOLERANCE_GAP_PX, true);

    const jointB = mathResult.joints.find(j => j.name.includes('Joint B'));
    assert.ok(jointB, 'Joint B must exist');
    assert.strictEqual(jointB.passed, true);
    assert.strictEqual(jointB.gapDistance <= SvgDesignAuditorService.TOLERANCE_GAP_PX, true);
  });

  it('상단 힌지 축이 허공에 20px 떨어져 있는 경우 AXIS_MISALIGNMENT 치명적 결함을 탐지해야 한다', () => {
    // 빗장대 상단이 (170, 80)에 있어 세움대 (144, 105)와 25px+ 이격
    const misalignedSvg = `<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
      <rect x="130" y="105" width="28" height="180" fill="#2d261e" stroke="#1c1917" />
      <polygon points="170,80 186,96 285,246 265,246" fill="#44382c" stroke="#1c1917" />
      <polygon points="100,230 400,230 400,246 100,246" fill="#524334" stroke="#1c1917" />
    </svg>`;

    const mathResult = SvgDesignAuditorService.auditMechanicalAxesMath(misalignedSvg);
    assert.strictEqual(mathResult.score < 100, true);
    const criticalIssues = mathResult.issues.filter(i => i.severity === 'CRITICAL');
    assert.strictEqual(criticalIssues.some(i => i.category === 'AXIS_MISALIGNMENT'), true);
  });

  it('하단 빗장대 끝이 먹이대와 30px 벌어져 떠 있는 경우 MECHANICAL_GAP 치명적 결함을 탐지해야 한다', () => {
    // 빗장대 하단이 y=200에서 끝나 먹이대(y=230)와 30px 이격
    const floatingJointSvg = `<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
      <rect x="130" y="105" width="28" height="180" fill="#2d261e" stroke="#1c1917" />
      <polygon points="144,105 160,121 240,200 220,200" fill="#44382c" stroke="#1c1917" />
      <polygon points="100,230 400,230 400,246 100,246" fill="#524334" stroke="#1c1917" />
    </svg>`;

    const mathResult = SvgDesignAuditorService.auditMechanicalAxesMath(floatingJointSvg);
    assert.strictEqual(mathResult.score < 100, true);
    const criticalIssues = mathResult.issues.filter(i => i.severity === 'CRITICAL');
    assert.strictEqual(criticalIssues.some(i => i.category === 'MECHANICAL_GAP'), true);
  });

  it('빗장대 기울기가 20도로 지나치게 누워있는 경우 ANGLE_DEVIATION 경고를 감지해야 한다', () => {
    // dx = 385 - 144 = 241, dy = 246 - 105 = 141 -> angle = atan(141/241) ≈ 30도 (45도 기준 15도 편차)
    const badAngleSvg = `<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
      <rect x="130" y="105" width="28" height="180" fill="#2d261e" stroke="#1c1917" />
      <polygon points="144,105 160,121 385,246 365,246" fill="#44382c" stroke="#1c1917" />
      <polygon points="100,230 400,230 400,246 100,246" fill="#524334" stroke="#1c1917" />
    </svg>`;

    const mathResult = SvgDesignAuditorService.auditMechanicalAxesMath(badAngleSvg);
    assert.strictEqual(mathResult.issues.some(i => i.category === 'ANGLE_DEVIATION'), true);
  });

  it('Protocol 08(Figure-4 Deadfall Trap)의 모든 도면은 수학적 기계 결합 검사에서 치명적 결함이 없어야 한다', () => {
    const svgs = [
      'pr08-step-01.svg',
      'pr08-step-02.svg',
      'pr08-step-03.svg',
      'pr08-step-04.svg',
      'pr08-outcome.svg',
    ];

    for (const file of svgs) {
      const filePath = path.join(rootDir, 'content', 'svgs', file);
      if (!fs.existsSync(filePath)) {
        continue;
      }
      const svgCode = fs.readFileSync(filePath, 'utf-8');
      const mathResult = SvgDesignAuditorService.auditMechanicalAxesMath(svgCode);

      const criticals = mathResult.issues.filter(i => i.severity === 'CRITICAL');
      assert.strictEqual(
        criticals.length,
        0,
        `[${file}] 수학적 결합 검사에서 CRITICAL 이슈가 발견되었습니다: ${JSON.stringify(criticals)}`
      );

      // step-03, 04, outcome은 조립된 상태이므로 수학 점수가 90점 이상이어야 함
      if (file.includes('step-03') || file.includes('step-04') || file.includes('outcome')) {
        assert.strictEqual(
          mathResult.score >= 90,
          true,
          `[${file}] 조립 도면의 수학 정합성 점수가 90점 이상이어야 합니다 (현재: ${mathResult.score}점)`
        );
      }
    }
  });
});
