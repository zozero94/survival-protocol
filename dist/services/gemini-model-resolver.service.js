                                                                    

                                   
             
                
                
                    
 

                                        
                    
                                              
 

                                  
                
                                        
 

                                          
                             
 

/**
 * 🤖 [Gemini Model Auto-Resolver Service]
 * 구글 AI Studio (Generative Language API)의 최신 모델을 런타임에 동적으로 질의·해석하여
 * 코드 수정 없이도 항상 출시된 가장 최신 제미나이 및 이미지/TTS 모델을 자동 사용하는 지능형 리졸버.
 */
export class GeminiModelResolverService {
          static          TTL_MS = 12 * 60 * 60 * 1000; // 12시간 캐시
          static          NEGATIVE_TTL_MS = 60 * 1000; // 실패 시 1분 네거티브 캐시 (지속 지연 방지)
          static cachedResolution                               = null;
          static inFlightResolution                                                      = null;

  /**
   * 네트워크 단절 및 API 오류 시 무중단 작동을 보장하는 검증된 최신 베이스라인
   */
         static          BASELINE_MODELS                                      = {
    flash: 'gemini-2.5-flash',
    pro: 'gemini-2.5-pro',
    image: 'gemini-2.5-flash',
    tts: 'gemini-2.0-flash',
  };

  /**
   * 환경 변수 수동 오버라이드 확인
   */
          static getEnvOverride(category                     )                {
    switch (category) {
      case 'flash':
        return process.env.GEMINI_FLASH_MODEL || process.env.GEMINI_MODEL || null;
      case 'pro':
        return process.env.GEMINI_PRO_MODEL || null;
      case 'image':
        return process.env.GEMINI_IMAGE_MODEL || null;
      case 'tts':
        return process.env.GEMINI_TTS_MODEL || null;
      default:
        return null;
    }
  }

  /**
   * 캐시 초기화 (테스트 및 강제 갱신용)
   */
         static clearCache()       {
    this.cachedResolution = null;
    this.inFlightResolution = null;
  }

  /**
   * 대상 카테고리의 최신 모델명을 동적으로 해석하여 반환
   */
         static async resolveModel(
    apiKey        ,
    category                      = 'flash'
  )                  {
    const envOverride = this.getEnvOverride(category);
    if (envOverride) {
      return envOverride.trim();
    }

    const now = Date.now();
    if (this.cachedResolution && now - this.cachedResolution.timestamp < this.TTL_MS) {
      const cached = this.cachedResolution.models[category];
      if (cached) return cached;
    }

    if (!apiKey || apiKey.trim() === '') {
      return this.BASELINE_MODELS[category];
    }

    // In-flight Promise가 존재하면 기존 요청에 편승 (Thundering Herd / Cache Stampede 방지)
    if (!this.inFlightResolution) {
      this.inFlightResolution = (async () => {
        try {
          const availableModels = await this.fetchAvailableModels(apiKey);
          const resolved = this.rankAndSelectBestModels(availableModels);

          this.cachedResolution = {
            timestamp: Date.now(),
            models: resolved,
          };

          return resolved;
        } catch {
          // 장애 격리 & 네거티브 캐싱: 외부 API 장애 시 1분간 베이스라인 캐시로 연속 타임아웃 방어
          this.cachedResolution = {
            timestamp: Date.now() - this.TTL_MS + this.NEGATIVE_TTL_MS,
            models: { ...this.BASELINE_MODELS },
          };
          return { ...this.BASELINE_MODELS };
        } finally {
          this.inFlightResolution = null;
        }
      })();
    }

    const resolved = await this.inFlightResolution;
    return resolved[category] || this.BASELINE_MODELS[category];
  }

  /**
   * 구글 models.list API 호출 (x-goog-api-key 헤더 인증)
   */
         static async fetchAvailableModels(apiKey        )                    {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models';
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    });

    if (!res.ok) {
      throw new Error(`Models API responded with status ${res.status}`);
    }

    const data = (await res.json())                           ;
    const rawList                    = Array.isArray(data?.models) ? data.models : [];

    return rawList
      .filter((m) => {
        const methods           = Array.isArray(m.supportedGenerationMethods)
          ? m.supportedGenerationMethods
          : [];
        return methods.includes('generateContent') || methods.includes('predict');
      })
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter((name) => name.length > 0);
  }

  /**
   * 모델 목록에서 카테고리별 최신/최고 성능 모델을 시맨틱 랭킹하여 선정
   */
         static rankAndSelectBestModels(
    modelIds          
  )                                      {
    return {
      flash: this.selectBestFlashModel(modelIds),
      pro: this.selectBestProModel(modelIds),
      image: this.selectBestImageModel(modelIds),
      tts: this.selectBestTtsModel(modelIds),
    };
  }

  /**
   * [Flash 모델 랭킹]
   * gemini-{major}.{minor}-flash 또는 gemini-{major}.{minor}-flash-lite
   * GA 접미사(-001, -002 등) 허용, CoT/추론(thinking) 및 실험(exp) 모델 배제
   */
         static selectBestFlashModel(modelIds          )         {
    const candidates                     = [];

    for (const id of modelIds) {
      if (/(tts|image|cyber|audio|preview|thinking|exp|experimental)/i.test(id)) continue;

      const match = id.match(/^gemini-(\d+)(?:\.(\d+))?-flash(?:-(lite))?(?:-(?:001|002|latest|\d{3}))?$/i);
      if (match) {
        const major = parseInt(match[1], 10);
        const minor = match[2] ? parseInt(match[2], 10) : 0;
        const isLite = Boolean(match[3]);
        const tierScore = major * 1000 + minor * 10 + (isLite ? 0 : 5);
        candidates.push({ id, major, minor, tierScore });
      }
    }

    if (candidates.length === 0) {
      return this.BASELINE_MODELS.flash;
    }

    candidates.sort((a, b) => b.tierScore - a.tierScore);
    return candidates[0].id;
  }

  /**
   * [Pro 모델 랭킹]
   * gemini-{major}.{minor}-pro
   */
         static selectBestProModel(modelIds          )         {
    const candidates                     = [];

    for (const id of modelIds) {
      if (/(image|vision|preview|thinking|exp|experimental)/i.test(id)) continue;

      const match = id.match(/^gemini-(\d+)(?:\.(\d+))?-pro(?:-(?:001|002|latest|\d{3}))?$/i);
      if (match) {
        const major = parseInt(match[1], 10);
        const minor = match[2] ? parseInt(match[2], 10) : 0;
        const tierScore = major * 1000 + minor * 10;
        candidates.push({ id, major, minor, tierScore });
      }
    }

    if (candidates.length === 0) {
      return this.BASELINE_MODELS.pro;
    }

    candidates.sort((a, b) => b.tierScore - a.tierScore);
    return candidates[0].id;
  }

  /**
   * [Image 모델 랭킹]
   * 1순위: gemini-{major}-pro-image (tierWeight: 100)
   * 2순위: gemini-{major}.{minor}-flash-image (tierWeight: 50)
   * 3순위: imagen-3.* (tierWeight: 10)
   * 계층 분리: tierWeight * 100000 + major * 1000 + minor * 10
   */
         static selectBestImageModel(modelIds          )         {
    const candidates                     = [];

    for (const id of modelIds) {
      // 1. gemini-*-pro-image
      const proImageMatch = id.match(/^gemini-(\d+)(?:\.(\d+))?-pro-image(?:-(?:001|002|latest|\d{3}))?$/i);
      if (proImageMatch) {
        const major = parseInt(proImageMatch[1], 10);
        const minor = proImageMatch[2] ? parseInt(proImageMatch[2], 10) : 0;
        const tierScore = 100 * 100000 + major * 1000 + minor * 10;
        candidates.push({ id, major, minor, tierScore });
        continue;
      }

      // 2. gemini-*-flash-image
      const flashImageMatch = id.match(/^gemini-(\d+)(?:\.(\d+))?-flash(?:-lite)?-image(?:-(?:001|002|latest|\d{3}))?$/i);
      if (flashImageMatch) {
        const major = parseInt(flashImageMatch[1], 10);
        const minor = flashImageMatch[2] ? parseInt(flashImageMatch[2], 10) : 0;
        const tierScore = 50 * 100000 + major * 1000 + minor * 10;
        candidates.push({ id, major, minor, tierScore });
        continue;
      }

      // 3. imagen-3.*
      const imagenMatch = id.match(/^imagen-(\d+)(?:\.(\d+))?/i);
      if (imagenMatch) {
        const major = parseInt(imagenMatch[1], 10);
        const minor = imagenMatch[2] ? parseInt(imagenMatch[2], 10) : 0;
        const tierScore = 10 * 100000 + major * 1000 + minor * 10;
        candidates.push({ id, major, minor, tierScore });
      }
    }

    if (candidates.length === 0) {
      return this.BASELINE_MODELS.image;
    }

    candidates.sort((a, b) => b.tierScore - a.tierScore);
    return candidates[0].id;
  }

  /**
   * [TTS 모델 랭킹]
   * gemini-{major}.{minor}-flash-tts
   */
         static selectBestTtsModel(modelIds          )         {
    const candidates                     = [];

    for (const id of modelIds) {
      const match = id.match(/^gemini-(\d+)(?:\.(\d+))?-flash(?:-(lite))?-tts(?:-(?:001|002|latest|\d{3}))?$/i);
      if (match) {
        const major = parseInt(match[1], 10);
        const minor = match[2] ? parseInt(match[2], 10) : 0;
        const isLite = Boolean(match[3]);
        const tierScore = major * 1000 + minor * 10 + (isLite ? 0 : 5);
        candidates.push({ id, major, minor, tierScore });
      }
    }

    if (candidates.length === 0) {
      return this.BASELINE_MODELS.tts;
    }

    candidates.sort((a, b) => b.tierScore - a.tierScore);
    return candidates[0].id;
  }
}
