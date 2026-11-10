export type GeminiModelCategory = 'flash' | 'pro' | 'image' | 'tts';

export interface ModelRankingInfo {
  id: string;
  major: number;
  minor: number;
  tierScore: number; // pro > flash > flash-lite 등 가중치
}

export interface CachedModelResolution {
  timestamp: number;
  models: Record<GeminiModelCategory, string>;
}

/**
 * 🤖 [Gemini Model Auto-Resolver Service]
 * 구글 AI Studio (Generative Language API)의 최신 모델을 런타임에 동적으로 질의·해석하여
 * 코드 수정 없이도 항상 출시된 가장 최신 제미나이 및 이미지/TTS 모델을 자동 사용하는 지능형 리졸버.
 */
export class GeminiModelResolverService {
  private static readonly TTL_MS = 12 * 60 * 60 * 1000; // 12시간 캐시
  private static cachedResolution: CachedModelResolution | null = null;

  /**
   * 네트워크 단절 및 API 오류 시 무중단 작동을 보장하는 검증된 최신 베이스라인
   */
  public static readonly BASELINE_MODELS: Record<GeminiModelCategory, string> = {
    flash: 'gemini-3.8-flash',
    pro: 'gemini-3.1-pro',
    image: 'gemini-3-pro-image',
    tts: 'gemini-3.8-flash-tts',
  };

  /**
   * 환경 변수 수동 오버라이드 확인
   */
  private static getEnvOverride(category: GeminiModelCategory): string | null {
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
  public static clearCache(): void {
    this.cachedResolution = null;
  }

  /**
   * 대상 카테고리의 최신 모델명을 동적으로 해석하여 반환
   */
  public static async resolveModel(
    apiKey: string,
    category: GeminiModelCategory = 'flash'
  ): Promise<string> {
    // 1. 환경변수 수동 오버라이드가 있으면 최우선 적용
    const envOverride = this.getEnvOverride(category);
    if (envOverride) {
      return envOverride.trim();
    }

    // 2. 캐시 유효성 확인
    const now = Date.now();
    if (this.cachedResolution && now - this.cachedResolution.timestamp < this.TTL_MS) {
      const cached = this.cachedResolution.models[category];
      if (cached) return cached;
    }

    // 3. API 키가 없으면 안전 베이스라인 반환
    if (!apiKey || apiKey.trim() === '') {
      return this.BASELINE_MODELS[category];
    }

    // 4. 구글 API에서 모델 목록 동적 조회
    try {
      const availableModels = await this.fetchAvailableModels(apiKey);
      const resolved = this.rankAndSelectBestModels(availableModels);

      this.cachedResolution = {
        timestamp: now,
        models: resolved,
      };

      return resolved[category] || this.BASELINE_MODELS[category];
    } catch (err: unknown) {
      // 5. 장애 격리: 네트워크나 API 오류 발생 시 안전 베이스라인으로 폴백
      return this.BASELINE_MODELS[category];
    }
  }

  /**
   * 구글 models.list API 호출
   */
  public static async fetchAvailableModels(apiKey: string): Promise<string[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    });

    if (!res.ok) {
      throw new Error(`Models API responded with status ${res.status}`);
    }

    const data: any = await res.json();
    const rawList: any[] = Array.isArray(data.models) ? data.models : [];

    return rawList
      .filter((m) => {
        // generateContent를 지원하는 모델 필터링
        const methods: string[] = Array.isArray(m.supportedGenerationMethods)
          ? m.supportedGenerationMethods
          : [];
        return methods.includes('generateContent');
      })
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter((name) => name.length > 0);
  }

  /**
   * 모델 목록에서 카테고리별 최신/최고 성능 모델을 시맨틱 랭킹하여 선정
   */
  public static rankAndSelectBestModels(
    modelIds: string[]
  ): Record<GeminiModelCategory, string> {
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
   * 가중치: major * 1000 + minor * 10 + (lite ? 0 : 5)
   */
  public static selectBestFlashModel(modelIds: string[]): string {
    const candidates: ModelRankingInfo[] = [];

    for (const id of modelIds) {
      // tts, image, cyber, audio 전용 제외
      if (/(tts|image|cyber|audio|preview)/i.test(id)) continue;

      const match = id.match(/^gemini-(\d+)(?:\.(\d+))?-flash(?:-(lite))?$/i);
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
  public static selectBestProModel(modelIds: string[]): string {
    const candidates: ModelRankingInfo[] = [];

    for (const id of modelIds) {
      if (/(image|vision|preview)/i.test(id)) continue;

      const match = id.match(/^gemini-(\d+)(?:\.(\d+))?-pro$/i);
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
   * 1순위: gemini-{major}-pro-image (Nano Banana Pro 등 최고 화질)
   * 2순위: gemini-{major}.{minor}-flash-image
   * 3순위: imagen-3.*
   */
  public static selectBestImageModel(modelIds: string[]): string {
    const candidates: ModelRankingInfo[] = [];

    for (const id of modelIds) {
      // 1. gemini-*-pro-image
      const proImageMatch = id.match(/^gemini-(\d+)(?:\.(\d+))?-pro-image$/i);
      if (proImageMatch) {
        const major = parseInt(proImageMatch[1], 10);
        const minor = proImageMatch[2] ? parseInt(proImageMatch[2], 10) : 0;
        candidates.push({ id, major, minor, tierScore: major * 1000 + minor * 10 + 100 });
        continue;
      }

      // 2. gemini-*-flash-image
      const flashImageMatch = id.match(/^gemini-(\d+)(?:\.(\d+))?-flash(?:-lite)?-image$/i);
      if (flashImageMatch) {
        const major = parseInt(flashImageMatch[1], 10);
        const minor = flashImageMatch[2] ? parseInt(flashImageMatch[2], 10) : 0;
        candidates.push({ id, major, minor, tierScore: major * 1000 + minor * 10 + 50 });
        continue;
      }

      // 3. imagen-3.*
      const imagenMatch = id.match(/^imagen-(\d+)(?:\.(\d+))?/i);
      if (imagenMatch) {
        const major = parseInt(imagenMatch[1], 10);
        const minor = imagenMatch[2] ? parseInt(imagenMatch[2], 10) : 0;
        candidates.push({ id, major, minor, tierScore: major * 1000 + minor * 10 + 10 });
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
  public static selectBestTtsModel(modelIds: string[]): string {
    const candidates: ModelRankingInfo[] = [];

    for (const id of modelIds) {
      const match = id.match(/^gemini-(\d+)(?:\.(\d+))?-flash(?:-lite)?-tts$/i);
      if (match) {
        const major = parseInt(match[1], 10);
        const minor = match[2] ? parseInt(match[2], 10) : 0;
        const isLite = id.includes('lite');
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
