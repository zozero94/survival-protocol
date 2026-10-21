import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
                                                                         
                                                          
             
                   
              
                    
                       
                                  
import { TtsService } from './tts.service.js';

/**
 * [Service Layer]
 * 프로토콜 엔티티를 구글 플로우(Veo 엔진) 7대 표준 규격 프롬프트 및
 * 1소스 7다국어 쇼츠 패키지(SRT 자막, 대본, Gemini TTS 음성, 레퍼런스 플레이트)로 변환하는 서비스 (OSMU)
 */
export class ShortsService {
  /**
   * 초 단위를 SRT 타임코드 포맷(HH:MM:SS,mmm)으로 변환
   */
         static formatSrtTimestamp(seconds        )         {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    const pad = (n        , z = 2) => String(n).padStart(z, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(millis, 3)}`;
  }

  /**
   * 구글 플로우(Veo) 전용 글자 없는 공용 시네마틱 7대 프롬프트 패키지 생성
   * - enProtocol이 주어지면 영문 메타데이터를 사용하여 Veo가 가장 잘 이해하는 영문 프롬프트 생성
   */
         static buildGoogleFlowPackage(protocol          , enProtocol           )                    {
    const p = enProtocol || protocol;
    const title = p.title;
    const step1 = p.steps[0]?.title || 'Assembling primary structure';
    const step2 = p.steps[1]?.title || 'Layering core functional media';
    const step3 = p.steps[2]?.title || 'Initiating operational filtration or reaction';
    const fatal = p.fatalMistake?.title || 'Crucial non-negotiable survival rule';
    const materialsSummary = (p.materials || [])
      .slice(0, 3)
      .map((m) => m.name.replace(/\s*\(.*?\)\s*/g, '').trim())
      .join(', ');

    const outcomeSvg = protocol.outcome?.svgFileName || `${protocol.protocolId.toLowerCase()}-outcome.svg`;

    const scenes                         = [
      {
        sceneNumber: 1,
        startSecond: 0,
        endSecond: 5,
        durationSeconds: 5,
        screenType: 'HOOK',
        referencePlate: outcomeSvg,
        flowPrompt: `Vertical 9:16 macro low-angle shot, slow cinematic zoom in. Gritty tactical survival manual documentary style, muted natural tones, razor-sharp focus. Harsh dramatic natural sunlight filtering through dark forest canopy. Weathered survivalist hands confronting life-or-death crisis of ${title}. Character says: "Survival emergency hook warning." (no subtitles). Audio: environmental wilderness wind, tension | Background music: low-frequency suspenseful drone.`,
      },
      {
        sceneNumber: 2,
        startSecond: 5,
        endSecond: 10,
        durationSeconds: 5,
        screenType: 'CHECKLIST',
        referencePlate: protocol.steps[0]?.svgFileName || 'step-01.svg',
        flowPrompt: `Vertical 9:16 eye-level knolling layout shot, smooth camera slide from left to right. Crisp survival field manual aesthetic. Neutral overcast soft daylight. Natural raw materials neatly arranged on dark slate stone: ${materialsSummary}. Hands selecting and inspecting the first item. (no subtitles). Audio: gentle rustling of wood and stone handling | Background music: steady building tactical rhythm.`,
      },
      {
        sceneNumber: 3,
        startSecond: 10,
        endSecond: 18,
        durationSeconds: 8,
        screenType: 'STEP_1',
        referencePlate: protocol.steps[0]?.svgFileName || 'step-01.svg',
        flowPrompt: `Vertical 9:16 medium close-up shot, slow downward tilt following hands. Gritty authentic survival documentary style. Directional morning side-lighting. Hands carefully executing step 1: ${step1}. (no subtitles). Audio: tactile craft foley, wood clicking, cordage binding | Background music: focused rhythmic pacing.`,
      },
      {
        sceneNumber: 4,
        startSecond: 18,
        endSecond: 26,
        durationSeconds: 8,
        screenType: 'STEP_2',
        referencePlate: protocol.steps[1]?.svgFileName || 'step-02.svg',
        flowPrompt: `Vertical 9:16 dynamic 45-degree angle shot, subtle upward pedestal camera movement. Hyper-realistic tactile manual aesthetic. Warm directional sunlight. Hands assembling step 2: ${step2}. (no subtitles). Audio: friction scraping, crisp material layering sound | Background music: confident problem-solving melody.`,
      },
      {
        sceneNumber: 5,
        startSecond: 26,
        endSecond: 34,
        durationSeconds: 8,
        screenType: 'STEP_3',
        referencePlate: protocol.steps[2]?.svgFileName || outcomeSvg,
        flowPrompt: `Vertical 9:16 close-up tracking shot, steady camera tracking physical transformation. Tactical documentary visual. Golden hour warm glow. Key mechanical operation in progress: ${step3}. Clear visible functional result emerging. (no subtitles). Audio: satisfying mechanical lock, flow of air or liquid | Background music: triumphant tactical swell.`,
      },
      {
        sceneNumber: 6,
        startSecond: 34,
        endSecond: 42,
        durationSeconds: 8,
        screenType: 'FATAL_WARNING',
        referencePlate: outcomeSvg,
        flowPrompt: `Vertical 9:16 high-contrast warning shot, sudden subtle camera shake and slow dramatic push-in. High-tension survival aesthetic with deep shadows. Flickering red firelight and stark cold shadows. Hands hesitating before common fatal error: ${fatal}. (no subtitles). Audio: sharp warning heartbeat thud, crackling tension | Background music: urgent low pulse with sharp cut.`,
      },
      {
        sceneNumber: 7,
        startSecond: 42,
        endSecond: 45,
        durationSeconds: 3,
        screenType: 'OUTRO',
        referencePlate: outcomeSvg,
        flowPrompt: `Vertical 9:16 wide establishing hero shot, slow pull-back revealing complete finished ${title} in dark wilderness. Dark utilitarian brutalist tone. Moody dusk lighting. Final functional outcome operating autonomously. (no subtitles). Audio: calm evening forest breeze | Background music: resolute fading outro chord.`,
      },
    ];

    return {
      protocolId: protocol.protocolId,
      title: protocol.title,
      aspectRatio: '9:16',
      totalDurationSeconds: 45,
      scenes,
    };
  }

          static extractStepVoice(step               )                                   {
    if (!step) return { title: '', voice: '' };
    const cleanTitle = step.title.replace(/^(\d+단계|step\s*\d+)[:\s-]*/i, '').trim();
    let note = '';
    if (step.actionNote) {
      note = step.actionNote.replace(/^>\s*/, '').replace(/\*\*.*?\*\*:?/g, '').trim();
    }
    if (!note && step.description) {
      const firstLine = step.description.split('\n')[0];
      note = firstLine
        .replace(/^\d+\.\s*/, '')
        .replace(/\*\*.*?\*\*:?/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .trim();
    }
    const voice = note ? `${cleanTitle}. ${note}` : cleanTitle;
    return { title: step.title, voice };
  }

  /**
   * 특정 로케일의 45초 쇼츠 대본 및 SRT 자막 생성
   */
         static buildLocalizedScriptAndSrt(
    protocol          ,
    flowPackage                   
  )   
                           
                       
                                                                              
    {
    const hook = protocol.shortsScript?.hook || `${protocol.title}`;
    const matList = (protocol.materials || [])
      .slice(0, 3)
      .map((m) => m.name.replace(/\s*\(.*?\)\s*/g, '').trim())
      .join(', ');
    const matVoice = matList || protocol.title;

    const s1 = this.extractStepVoice(protocol.steps[0]);
    const s2 = this.extractStepVoice(protocol.steps[1]);
    const s3 = this.extractStepVoice(protocol.steps[2]);

    const fatalVoice = protocol.fatalMistake?.description || protocol.fatalMistake?.title || '';
    const fatalCaption = protocol.fatalMistake?.title || 'WARNING';

    const outroVoice = protocol.shortsScript?.outro || 'Access full offline survival blueprints via the profile link.';
    const outroCaption = protocol.shortsScript?.outro || 'Survival Protocol';

    const sceneNarrations                                                         = {
      1: { caption: hook, voiceover: hook },
      2: { caption: matList, voiceover: matVoice },
      3: { caption: s1.title, voiceover: s1.voice },
      4: { caption: s2.title, voiceover: s2.voice },
      5: { caption: s3.title, voiceover: s3.voice },
      6: { caption: fatalCaption, voiceover: fatalVoice },
      7: { caption: outroCaption, voiceover: outroVoice },
    };

    const srtLines           = [];
    const scenesText                                                                = [];
    const fullVoiceLines           = [];

    flowPackage.scenes.forEach((scene, idx) => {
      const nar = sceneNarrations[scene.sceneNumber] || {
        caption: protocol.title,
        voiceover: protocol.title,
      };
      scenesText.push({ sceneNumber: scene.sceneNumber, caption: nar.caption, voiceover: nar.voiceover });
      fullVoiceLines.push(nar.voiceover);

      const startTimestamp = this.formatSrtTimestamp(scene.startSecond);
      const endTimestamp = this.formatSrtTimestamp(scene.endSecond);

      srtLines.push(String(idx + 1));
      srtLines.push(`${startTimestamp} --> ${endTimestamp}`);
      srtLines.push(nar.caption);
      srtLines.push('');
    });

    return {
      fullScriptText: fullVoiceLines.join('\n\n'),
      srtContent: srtLines.join('\n'),
      scenesText,
    };
  }

  /**
   * 단일 프로토콜에 대해 1소스 7다국어 쇼츠 패키지를 생성한다.
   */
         static async generateShortsPackage(
    protocol          ,
    outputBaseDir        ,
    localesMap                                   ,
    customFolderName         
  )           
                       
                            
                           
                               
     {
    const folder = customFolderName || `${protocol.protocolId}-${this.slugify(protocol.title)}`;
    const protocolFolder = path.join(outputBaseDir, folder);
    const platesDir = path.join(protocolFolder, 'plates');
    const localesDir = path.join(protocolFolder, 'locales');

    fs.mkdirSync(platesDir, { recursive: true });
    fs.mkdirSync(localesDir, { recursive: true });

    // 1. 공용 구글 플로우(Veo) 7대 프롬프트 패키지 생성 (영문 로케일이 있으면 영문 시각 프롬프트 우선 활용)
    const flowPackage = this.buildGoogleFlowPackage(protocol, localesMap['en']);
    const flowPackagePath = path.join(protocolFolder, 'common-veo-prompts.json');
    fs.writeFileSync(flowPackagePath, JSON.stringify(flowPackage, null, 2), 'utf-8');

    // 2. 사람이 읽을 수 있는 스토리보드 마크다운 생성
    const storyboardMd = this.renderStoryboardMarkdown(protocol, flowPackage);
    const storyboardPath = path.join(protocolFolder, 'flow-storyboard.md');
    fs.writeFileSync(storyboardPath, storyboardMd, 'utf-8');

    // 3. 7개 언어별 자막(SRT), 대본(TXT), 음성(WAV/TTS) 생성
    const localesGenerated           = [];
    const supportedLocales                    = ['ko', 'en', 'ja', 'es', 'de', 'pt', 'zh-TW'];

    for (const locale of supportedLocales) {
      const locProto = localesMap[locale] || protocol;
      const localeFolder = path.join(localesDir, locale);
      fs.mkdirSync(localeFolder, { recursive: true });

      const { fullScriptText, srtContent, scenesText } = this.buildLocalizedScriptAndSrt(locProto, flowPackage);

      // A. 대본 파일 저장
      const scriptPath = path.join(localeFolder, 'script.txt');
      const scriptDetail = scenesText
        .map((s) => `[Scene ${s.sceneNumber}] (${s.caption})\n${s.voiceover}`)
        .join('\n\n');
      fs.writeFileSync(scriptPath, scriptDetail, 'utf-8');

      // B. SRT 자막 파일 저장
      const srtPath = path.join(localeFolder, 'subtitles.srt');
      fs.writeFileSync(srtPath, srtContent, 'utf-8');

      // C. Gemini TTS 음성 생성 (스마트 캐싱 적용)
      const audioPath = path.join(localeFolder, 'voiceover.wav');
      await TtsService.synthesizeSpeech(fullScriptText, audioPath, locale);

      localesGenerated.push(locale);
    }

    // 1-1. 레퍼런스 도면/실사 이미지를 plates 폴더로 복사 및 Google Flow 지원 포맷(PNG)으로 자동 래스터화
    const contentSvgsDir = path.resolve(outputBaseDir, '..', 'content/svgs');
    const contentImagesDir = path.resolve(outputBaseDir, '..', 'content/images');

    for (const scene of flowPackage.scenes) {
      const plateName = scene.referencePlate;
      if (!plateName) continue;
      const targetPlatePath = path.join(platesDir, plateName);
      if (!fs.existsSync(targetPlatePath)) {
        const candidates = [
          path.join(contentSvgsDir, plateName),
          path.join(contentImagesDir, plateName),
        ];

        for (const cand of candidates) {
          if (fs.existsSync(cand)) {
            try {
              fs.copyFileSync(cand, targetPlatePath);
            } catch {}
            break;
          }
        }
      }

      // 구글 플로우가 SVG 미지원 (PNG, JPG 필수) -> 2048px 고화질 PNG 자동 렌더링
      if (plateName.endsWith('.svg') && fs.existsSync(targetPlatePath)) {
        const pngName = plateName.replace(/\.svg$/, '.png');
        const targetPngPath = path.join(platesDir, pngName);
        if (!fs.existsSync(targetPngPath)) {
          try {
            execSync(`qlmanage -t -s 2048 -o "${platesDir}" "${targetPlatePath}"`, { stdio: 'ignore' });
            const genThumbnail = path.join(platesDir, `${plateName}.png`);
            if (fs.existsSync(genThumbnail)) {
              fs.renameSync(genThumbnail, targetPngPath);
            }
          } catch {}
        }
      }
    }

    return {
      protocolId: protocol.protocolId,
      flowPackagePath,
      storyboardPath,
      localesGenerated,
    };
  }

  /**
   * 레거시 호환용 메서드 (기존 스토리보드 JSON 출력 지원)
   */
         static convertProtocolToShorts(protocol          , outputDir        )                   {
    const flowPackage = this.buildGoogleFlowPackage(protocol);
    const scenes                = flowPackage.scenes.map((s) => ({
      sceneNumber: s.sceneNumber,
      startSecond: s.startSecond,
      endSecond: s.endSecond,
      screenType: s.screenType,
      visualAsset: s.referencePlate,
      caption: protocol.title,
      voiceoverScript: protocol.shortsScript?.hook || protocol.title,
      motionDirection: s.flowPrompt,
      flowPrompt: s.flowPrompt,
    }));

    const storyboard                   = {
      protocolId: protocol.protocolId,
      title: `[쇼츠 45초] ${protocol.title}`,
      totalDurationSeconds: 45,
      aspectRatio: '9:16',
      scenes,
    };

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'storyboard.json'), JSON.stringify(storyboard, null, 2), 'utf-8');
    return storyboard;
  }

          static renderStoryboardMarkdown(protocol          , flowPackage                   )         {
    return `# 🎬 [Google Flow / Veo] 45초 쇼츠 스토리보드: ${protocol.title}
- **프로토콜 ID**: \`${protocol.protocolId}\`
- **화면 비율**: \`9:16 세로 (Shorts / Reels / TikTok)\`
- **총 러닝타임**: \`45초\`
- **AI 비디오 엔진**: Google Flow (Veo 3/3.1)

---

## 📋 씬별 구글 플로우(Veo) 복사 전용 프롬프트

${flowPackage.scenes
  .map(
    (s) => {
      const pngPlate = s.referencePlate ? s.referencePlate.replace(/\.svg$/, '.png') : '';
      return `### [${s.startSecond}s ~ ${s.endSecond}s] Scene ${s.sceneNumber} (${s.screenType})
* **지속 시간**: \`${s.durationSeconds}초\`
* **Google Flow 투입 이미지**: \`${pngPlate}\` (원천 벡터: \`${s.referencePlate}\`)
* **구글 플로우 프롬프트**:
\`\`\`text
${s.flowPrompt}
\`\`\`
`;
    }
  )
  .join('\n---\n')}

---
*Generated autonomously by Primitive Survival Shorts Service (OSMU Architecture).*
`;
  }

          static slugify(text        )         {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);
  }
}
