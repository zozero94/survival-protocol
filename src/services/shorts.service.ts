import type { Protocol } from '../types/protocol.types.ts';
import type { ShortsStoryboard } from '../types/shorts.types.ts';
import fs from 'fs';
import path from 'path';

/**
 * [Service Layer]
 * 프로토콜 엔티티를 45초 유튜브 쇼츠 대본 및 스토리보드로 자동 변환하는 서비스 (OSMU)
 */
export class ShortsService {
  public static convertProtocolToShorts(protocol: Protocol, outputDir: string): ShortsStoryboard {
    const storyboard: ShortsStoryboard = {
      protocolId: protocol.protocolId,
      title: `[쇼츠 45초] ${protocol.title}`,
      totalDurationSeconds: 45,
      aspectRatio: '9:16',
      scenes: [
        {
          sceneNumber: 1,
          startSecond: 0,
          endSecond: 5,
          screenType: 'HOOK',
          visualAsset: 'hero-stamp.svg',
          caption: '⚠️ 인류 멸망 시 흙탕물 그냥 마시면 72시간 내 사망합니다.',
          voiceoverScript: '문명이 붕괴했을 때, 야생 흙탕물을 그냥 마시면 72시간 안에 사망합니다. 원시인들은 어떻게 살아남았을까요?',
          motionDirection: 'Slow zoom in on danger badge with glitch flicker effect',
        },
        {
          sceneNumber: 2,
          startSecond: 5,
          endSecond: 10,
          screenType: 'CHECKLIST',
          visualAsset: 'materials-grid.svg',
          caption: '필수 재료 3가지: 페트병, 숯, 모래와 자갈',
          voiceoverScript: '주변에서 딱 세 가지만 확보하세요. 자른 페트병, 모닥불에서 건진 숯, 그리고 모래와 자갈입니다.',
          motionDirection: 'Quick horizontal slide-in for 3 item cards',
        },
        {
          sceneNumber: 3,
          startSecond: 10,
          endSecond: 18,
          screenType: 'STEP_1',
          visualAsset: protocol.steps[0]?.svgFileName || 'step-01.svg',
          caption: '1단계: 페트병 바닥을 자르고 주둥이를 천으로 밀봉',
          voiceoverScript: '먼저 페트병 바닥을 잘라 깔때기 모양을 만들고, 주둥이에 면 천이나 물이끼를 꽉 채워 마개를 만듭니다.',
          motionDirection: 'Ken-Burns pan down along the cut line schematic',
        },
        {
          sceneNumber: 4,
          startSecond: 18,
          endSecond: 26,
          screenType: 'STEP_2',
          visualAsset: protocol.steps[1]?.svgFileName || 'step-02.svg',
          caption: '2단계: [숯 ➔ 모래 ➔ 자갈] 역피라미드 적층',
          voiceoverScript: '가장 중요한 층별 적층입니다. 맨 아래 숯, 중간에 모래, 맨 위에 자갈을 채워 다층 필터를 완성합니다.',
          motionDirection: 'Bottom-to-top staggered reveal of layers',
        },
        {
          sceneNumber: 5,
          startSecond: 26,
          endSecond: 34,
          screenType: 'STEP_3',
          visualAsset: protocol.steps[2]?.svgFileName || 'step-03.svg',
          caption: '3단계: 흙탕물을 붓고 맑게 걸러진 물 수거',
          voiceoverScript: '이제 흙탕물을 부으면 중력에 의해 불순물이 걸러지며 투명한 물이 한 방울씩 떨어집니다.',
          motionDirection: 'Subtle vertical pan tracking the clear water drops',
        },
        {
          sceneNumber: 6,
          startSecond: 34,
          endSecond: 42,
          screenType: 'FATAL_WARNING',
          visualAsset: 'fatal-warning.svg',
          caption: '🚨 반전: 맑아 보여도 절대 바로 마시지 마세요! 1분 이상 끓여야 생존',
          voiceoverScript: '하지만 절대 그냥 마시면 안 됩니다! 눈에 보이지 않는 기생충과 바이러스 때문에, 반드시 1분 이상 끓여야 진짜 식수가 됩니다.',
          motionDirection: 'High-contrast black screen flash with pulsing red/white border',
        },
        {
          sceneNumber: 7,
          startSecond: 42,
          endSecond: 45,
          screenType: 'OUTRO',
          visualAsset: 'archive-logo.svg',
          caption: '생존 좌표 저장 ➔ 프로필 링크 [ARCHIVE-0]',
          voiceoverScript: '살아남으려면 이 프로토콜을 지금 저장해 두세요.',
          motionDirection: 'Center stamp zoom with URL display',
        },
      ],
    };

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'storyboard.json'), JSON.stringify(storyboard, null, 2), 'utf-8');

    const mdScript = `# 🎬 45초 쇼츠 대본: ${protocol.title}
**예상 러닝타임**: 45초 | **화면 비율**: 9:16 세로

${storyboard.scenes
  .map(
    (s) => `
### [${s.startSecond}s ~ ${s.endSecond}s] Scene ${s.sceneNumber}: ${s.screenType}
- **도면 에셋**: \`${s.visualAsset}\`
- **모션 연출**: ${s.motionDirection}
- **화면 자막**: **${s.caption}**
- **내레이션(TTS)**: "${s.voiceoverScript}"
`
  )
  .join('\n---\n')}
`;
    fs.writeFileSync(path.join(outputDir, 'script.md'), mdScript, 'utf-8');

    return storyboard;
  }
}
