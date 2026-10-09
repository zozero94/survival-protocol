import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ProtocolGeneratorService } from '../src/services/protocol-generator.service.ts';
import { SvgGeneratorService } from '../src/services/svg-generator.service.ts';
import { DeployService } from '../src/services/deploy.service.ts';
import type { Protocol } from '../src/types/index.ts';

describe('⚡ [Suite 8: 프로토콜 자동 생성 & 고증 엔진] 유효성 감사, 도면 합성 및 배포 엔진 검증', () => {
  it('원시 고증 및 필수 스키마를 만족하는 정상 프로토콜은 통과해야 한다', () => {
    const validProto: Protocol = {
      protocolId: 'PR-99',
      category: 'TOOLS',
      title: '프로토콜 #99: 차돌 격지 화살촉 제작법',
      threatLevel: 'HIGH',
      threatLevelText: '[위험 등급: 높음(HIGH)]',
      summary: '사냥을 위한 차돌 직접 타격 박편 가공법',
      timeRequired: '1시간',
      successRate: '80%',
      difficulty: '1등급',
      outputPerHour: '화살촉 4개/시간',
      materials: [
        { id: 'm-1', name: '차돌 원석', desc: '경도 높은 규암 또는 흑요석' },
        { id: 'm-2', name: '사슴 뿔 망치', desc: '압진 박편용 단단한 사슴 뿔' },
      ],
      steps: [
        { stepNumber: '01', title: '직접 타격', description: '망치돌로 원석 타격', actionNote: '각도 45도', svgFileName: 'pr99-01.svg' },
        { stepNumber: '02', title: '날 가공', description: '뿔로 가장자리 압진', actionNote: '미세 날 형성', svgFileName: 'pr99-02.svg' },
        { stepNumber: '03', title: '화살대 결합', description: '동물 힘줄로 고정', actionNote: '송진 접착', svgFileName: 'pr99-03.svg' },
      ],
      fatalMistake: {
        title: '치명적 착각: 결을 무시하고 강타하면 돌이 산산조각 납니다.',
        description: '파편이 눈에 튀어 실명하거나 손바닥 정맥이 절단될 수 있습니다.',
        consequence: '작업 중단 및 과다 출혈',
      },
    };

    const res = ProtocolGeneratorService.validateProtocol(validProto);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors.length, 0);
  });

  it('현대 공산품(라이터, 건전지, 알루미늄 등)이 유입되면 고증 위반 에러를 발생시켜야 한다', () => {
    const pollutedProto: Partial<Protocol> = {
      protocolId: 'PR-99',
      category: 'FIRE',
      title: '라이터로 불피우기',
      threatLevel: 'CRITICAL',
      summary: '편리한 플라스틱 라이터 사용',
      materials: [{ id: 'm-1', name: '일회용 라이터', desc: '편의점 구매' }],
      steps: [
        { stepNumber: '01', title: '점화', description: '부싯돌 휠을 굴린다', actionNote: '', svgFileName: '' },
        { stepNumber: '02', title: '가스 조절', description: '가스 밸브 확인', actionNote: '', svgFileName: '' },
        { stepNumber: '03', title: '불 옮겨붙이기', description: '화염 전달', actionNote: '', svgFileName: '' },
      ],
      fatalMistake: { title: '가스 폭발', description: '주의', consequence: '화상' },
    };

    const res = ProtocolGeneratorService.validateProtocol(pollutedProto);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('현대 공산품')));
  });

  it('steps가 3개가 아니거나 필수 필드가 누락되면 유효성 실패해야 한다', () => {
    const invalidProto: Partial<Protocol> = {
      protocolId: 'PR-99',
      title: '미완성 프로토콜',
      steps: [
        { stepNumber: '01', title: '1단계', description: '설명', actionNote: '', svgFileName: '' },
      ],
    };

    const res = ProtocolGeneratorService.validateProtocol(invalidProto);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('steps는 정확히 3단계')));
  });

  it('getProtocolById는 "PR-01", "01", "pr-01" 등 다양한 식별자를 모두 찾아내야 한다', () => {
    const p1 = ProtocolGeneratorService.getProtocolById('PR-01');
    const p2 = ProtocolGeneratorService.getProtocolById('01');
    const p3 = ProtocolGeneratorService.getProtocolById('pr-01');

    assert.ok(p1 !== null);
    assert.ok(p2 !== null);
    assert.ok(p3 !== null);
    assert.strictEqual(p1?.data.protocolId, 'PR-01');
    assert.strictEqual(p2?.data.protocolId, 'PR-01');
    assert.strictEqual(p3?.data.protocolId, 'PR-01');
  });

  it('SvgGeneratorService는 마크다운 백틱으로 둘러싸인 AI 응답에서 순수 SVG만 추출해야 한다', () => {
    const rawAiOutput = `\`\`\`xml
<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="400" fill="#000000"/>
  <circle cx="200" cy="200" r="50" stroke="#FFFFFF"/>
</svg>
\`\`\``;

    const cleanSvg = SvgGeneratorService.extractCleanSvg(rawAiOutput);
    assert.ok(cleanSvg.startsWith('<svg'));
    assert.ok(cleanSvg.endsWith('</svg>'));
    assert.ok(!cleanSvg.includes('```'));
  });

  it('DeployService는 dryRun 옵션 시 실제 git 명령을 실행하지 않고 안전하게 결과를 반환해야 한다', async () => {
    const res = await DeployService.commitAndPush('test commit', { dryRun: true });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.commitHash, 'dry-run-hash-0000000');
    assert.strictEqual(res.pushed, false);
  });
});
