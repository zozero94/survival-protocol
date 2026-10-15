import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import type { Protocol } from '../types/protocol.types.ts';

export interface ProtocolTimestampResult {
  createdAt: string;
  updatedAt?: string;
  isModified: boolean;
  contentHash: string;
  assetPaths: string[];
}

export interface SyncTimestampReport {
  protocolId: string;
  file: string;
  contentHash: string;
  createdAt: string;
  updatedAt?: string;
  updated: boolean;
  reason?: string;
}

const gitAvailableCache = new Map<string, boolean>();

/**
 * Git 캐시 초기화 (테스트 격리용)
 */
export function clearGitAvailableCache(): void {
  gitAvailableCache.clear();
}

/**
 * Git 실행 가능 여부 및 .git 작업 트리 존재 여부 확인 (메모이제이션 적용)
 */
export function isGitAvailable(rootDir: string = process.cwd()): boolean {
  if (gitAvailableCache.has(rootDir)) {
    return gitAvailableCache.get(rootDir)!;
  }

  // 선행 검사: .git 디렉터리 존재 여부 확인
  const gitDir = path.join(rootDir, '.git');
  if (!fs.existsSync(gitDir)) {
    gitAvailableCache.set(rootDir, false);
    return false;
  }

  try {
    const out = execSync('git rev-parse --is-inside-work-tree', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    const available = out === 'true';
    gitAvailableCache.set(rootDir, available);
    return available;
  } catch {
    gitAvailableCache.set(rootDir, false);
    return false;
  }
}

/**
 * 대용량 이미지/파일을 64KB 고정 버퍼 청크 단위로 스트리밍 해싱하여 메모리 힙 스파이크를 방지합니다.
 */
function hashFileChunked(hash: crypto.Hash, filePath: string): void {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(65536);
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * 프로토콜의 실질적 콘텐츠(텍스트 본문 + 스텝 SVG 도면 + 실사 이미지 바이너리)를 기반으로
 * 16자리 SHA-256 콘텐츠 지문(Content Fingerprint)을 계산합니다.
 * 단순 공백, 린터 포맷팅, 주석 변경 등은 무시하고 실제 생존 지식 내용이 바뀐 경우에만 해시가 변경됩니다.
 */
export function computeProtocolContentHash(
  protocol: Protocol,
  masterFilePath: string,
  rootDir: string = process.cwd()
): string {
  const hash = crypto.createHash('sha256');

  // 1. 핵심 본문 메타데이터 (줄바꿈/공백 정규화)
  hash.update(`id:${protocol.protocolId || ''}`);
  hash.update(`title:${(protocol.title || '').trim()}`);
  hash.update(`summary:${(protocol.summary || '').trim()}`);
  hash.update(`threat:${protocol.threatLevel || ''}`);
  hash.update(`threatText:${(protocol.threatLevelText || '').trim()}`);
  hash.update(`category:${protocol.category || ''}`);
  hash.update(`diff:${protocol.difficulty || ''}`);
  hash.update(`time:${protocol.timeRequired || ''}`);
  hash.update(`successRate:${(protocol.successRate || '').trim()}`);
  hash.update(`outputPerHour:${(protocol.outputPerHour || '').trim()}`);

  // 2. 필요 자연물 재료 (실제 인터페이스: id, name, desc)
  if (Array.isArray(protocol.materials)) {
    for (const m of protocol.materials) {
      hash.update(`mat:${m.id || ''}:${(m.name || '').trim()}:${(m.desc || '').trim()}`);
    }
  }

  // 3. 단계별 본문 및 SVG 도면 / 이미지
  if (Array.isArray(protocol.steps)) {
    for (const s of protocol.steps) {
      hash.update(`step:${s.stepNumber}:${(s.title || '').trim()}:${(s.description || '').trim()}:${(s.actionNote || '').trim()}`);
      if (Array.isArray(s.svgLabels)) {
        hash.update(`labels:${s.svgLabels.join('|')}`);
      }
      if (s.svgFileName) {
        hash.update(`svg:${s.svgFileName}`);
        const svgPath = path.resolve(rootDir, 'content/svgs', s.svgFileName);
        if (fs.existsSync(svgPath)) {
          // SVG 내부 공백 정규화 후 해싱
          const svgCode = fs.readFileSync(svgPath, 'utf-8').replace(/\s+/g, ' ').trim();
          hash.update(svgCode);
        }
      }
      if (s.imageFileName) {
        hash.update(`img:${s.imageFileName}`);
        const imgPath = path.resolve(rootDir, 'content/images', s.imageFileName);
        if (fs.existsSync(imgPath)) {
          // 대용량 이미지 64KB 청크 스트리밍 해싱
          hashFileChunked(hash, imgPath);
        }
      }
    }
  }

  // 4. 치명적 실수
  if (protocol.fatalMistake) {
    hash.update(`fatal_all:${(protocol.fatalMistake.title || '').trim()}:${(protocol.fatalMistake.description || '').trim()}:${(protocol.fatalMistake.consequence || '').trim()}`);
  }

  // 5. 최종 완성 결과물 (Outcome)
  if (protocol.outcome) {
    hash.update(`outcome:${(protocol.outcome.title || '').trim()}:${(protocol.outcome.description || '').trim()}`);
    if (Array.isArray(protocol.outcome.svgLabels)) {
      hash.update(`outcome_labels:${protocol.outcome.svgLabels.join('|')}`);
    }
    if (protocol.outcome.svgFileName) {
      hash.update(`outcome_svg:${protocol.outcome.svgFileName}`);
      const oSvg = path.resolve(rootDir, 'content/svgs', protocol.outcome.svgFileName);
      if (fs.existsSync(oSvg)) {
        hash.update(fs.readFileSync(oSvg, 'utf-8').replace(/\s+/g, ' ').trim());
      }
    }
    if (protocol.outcome.imageFileName) {
      hash.update(`outcome_img:${protocol.outcome.imageFileName}`);
      const oImg = path.resolve(rootDir, 'content/images', protocol.outcome.imageFileName);
      if (fs.existsSync(oImg)) {
        hashFileChunked(hash, oImg);
      }
    }
  }

  // 6. 쇼츠 대본
  const shorts = (protocol as unknown as { shortsScript?: { hook?: string; body?: string; outro?: string } }).shortsScript;
  if (shorts) {
    hash.update(`shorts:${(shorts.hook || '').trim()}:${(shorts.body || '').trim()}:${(shorts.outro || '').trim()}`);
  }

  return hash.digest('hex').slice(0, 16);
}

/**
 * 특정 프로토콜과 직결된 모든 에셋(마스터 JSON, 단계별 SVG/이미지, 완성형 도면/이미지, 6개국어 번역본)의
 * 실제 존재하는 파일 경로 목록을 수집합니다.
 */
export function collectProtocolAssetPaths(
  protocol: Protocol,
  masterFilePath: string,
  rootDir: string = process.cwd()
): string[] {
  const assets: string[] = [];

  // 1. 마스터 JSON 파일
  const absMasterPath = path.isAbsolute(masterFilePath)
    ? masterFilePath
    : path.resolve(rootDir, masterFilePath);
  if (fs.existsSync(absMasterPath)) {
    assets.push(path.relative(rootDir, absMasterPath));
  }

  const num = protocol.protocolId.replace(/\D/g, '').padStart(2, '0');
  const baseSlug = path.basename(masterFilePath, '.json');

  // 2. 스텝별 도면 및 이미지
  if (Array.isArray(protocol.steps)) {
    for (const step of protocol.steps) {
      if (step.svgFileName) {
        const svgRel = path.join('content/svgs', step.svgFileName);
        if (fs.existsSync(path.resolve(rootDir, svgRel))) {
          assets.push(svgRel);
        }
      }
      if (step.imageFileName) {
        const imgRel = path.join('content/images', step.imageFileName);
        if (fs.existsSync(path.resolve(rootDir, imgRel))) {
          assets.push(imgRel);
        }
      }
    }
  }

  // 3. 최종 완성 결과물 (Outcome) 도면 및 이미지
  if (protocol.outcome) {
    if (protocol.outcome.svgFileName) {
      const svgRel = path.join('content/svgs', protocol.outcome.svgFileName);
      if (fs.existsSync(path.resolve(rootDir, svgRel))) {
        assets.push(svgRel);
      }
    }
    if (protocol.outcome.imageFileName) {
      const imgRel = path.join('content/images', protocol.outcome.imageFileName);
      if (fs.existsSync(path.resolve(rootDir, imgRel))) {
        assets.push(imgRel);
      }
    }
  }

  // 4. 다국어 번역 JSON 파일들 (content/protocols/locales/)
  const localesDir = path.resolve(rootDir, 'content/protocols/locales');
  if (fs.existsSync(localesDir)) {
    try {
      const locFiles = fs
        .readdirSync(localesDir)
        .filter((f) => (f.startsWith(baseSlug) || f.startsWith(num)) && f.endsWith('.json'))
        .sort();
      for (const lf of locFiles) {
        const locRel = path.join('content/protocols/locales', lf);
        if (fs.existsSync(path.resolve(rootDir, locRel))) {
          assets.push(locRel);
        }
      }
    } catch {}
  }

  // 중복 제거
  return Array.from(new Set(assets));
}

/**
 * Git 커밋 이력에서 지정된 에셋 파일들 중 가장 최근 커밋 일시를 ISO 8601 문자열로 조회합니다.
 */
export function getLatestGitCommitTime(
  relativeFilePaths: string[],
  rootDir: string = process.cwd()
): string | null {
  if (!relativeFilePaths.length || !isGitAvailable(rootDir)) return null;
  try {
    const quoted = relativeFilePaths.map((p) => `"${p.replace(/"/g, '\\"')}"`).join(' ');
    const out = execSync(`git log -1 --format=%cI -- ${quoted}`, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (out && !isNaN(new Date(out).getTime())) {
      return out;
    }
  } catch {}
  return null;
}

/**
 * 로컬 작업 트리(Working Tree)에서 커밋되지 않은 수정사항이 있는 파일의 최신 mtime을 조회합니다.
 * [보강 가드 1]: Git이 없는 환경(서버리스 배포 등)에서는 체크아웃/복사 시점 오염을 방지하기 위해 반드시 null을 반환합니다.
 * [보강 가드 2]: 순환 갱신 방지를 위해 마스터 JSON 파일 자체의 수정 여부는 제외하고, 도면/이미지/번역 에셋 변경만 추적합니다.
 */
export function getUncommittedLatestMtime(
  relativeFilePaths: string[],
  rootDir: string = process.cwd()
): string | null {
  if (!relativeFilePaths.length || !isGitAvailable(rootDir)) return null;

  try {
    const quoted = relativeFilePaths.map((p) => `"${p.replace(/"/g, '\\"')}"`).join(' ');
    const statusOut = execSync(`git status --porcelain -- ${quoted}`, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (statusOut) {
      const dirtyPaths = new Set(
        statusOut
          .split('\n')
          .map((l) => l.slice(3).trim())
          .filter(Boolean)
      );
      let maxMs = 0;
      for (const relPath of relativeFilePaths) {
        if (dirtyPaths.has(relPath) || dirtyPaths.has(path.normalize(relPath))) {
          const absPath = path.resolve(rootDir, relPath);
          if (fs.existsSync(absPath)) {
            const stat = fs.statSync(absPath);
            if (stat.mtimeMs > maxMs) maxMs = stat.mtimeMs;
          }
        }
      }
      if (maxMs > 0) return new Date(maxMs).toISOString();
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * 프로토콜과 연관 에셋을 분석하여 결정론적이고 최신 상태의 createdAt과 updatedAt을 산출합니다.
 */
export function resolveProtocolTimestamps(
  protocol: Protocol,
  masterFilePath: string,
  rootDir: string = process.cwd()
): ProtocolTimestampResult {
  const assetPaths = collectProtocolAssetPaths(protocol, masterFilePath, rootDir);
  const currentHash = computeProtocolContentHash(protocol, masterFilePath, rootDir);

  // 1. 등록 일시 (createdAt)
  let createdAt = protocol.createdAt;
  if (!createdAt || isNaN(new Date(createdAt).getTime())) {
    const absMaster = path.resolve(rootDir, masterFilePath);
    if (fs.existsSync(absMaster)) {
      createdAt = fs.statSync(absMaster).birthtime.toISOString();
    } else {
      createdAt = new Date().toISOString();
    }
  }

  const createdMs = new Date(createdAt).getTime();

  // 2. [불변성 보장 가드]: 기존 콘텐츠 해시와 현재 해시가 일치하면 실질 내용 변경 없음 -> 기존 updatedAt 100% 보존
  if (protocol.contentHash && protocol.contentHash === currentHash) {
    return {
      createdAt,
      updatedAt: protocol.updatedAt,
      isModified: !!protocol.updatedAt,
      contentHash: currentHash,
      assetPaths,
    };
  }

  // 3. Git 미지원 환경 (Vercel Serverless 등)에서는 JSON에 보존된 정적 값 최우선 신뢰
  const gitAvailable = isGitAvailable(rootDir);
  if (!gitAvailable) {
    return {
      createdAt,
      updatedAt: protocol.updatedAt,
      isModified: !!protocol.updatedAt,
      contentHash: currentHash,
      assetPaths,
    };
  }

  // 4. 실질적 콘텐츠 변경 감지 시 최신 시점 산출 (Git 환경)
  // 도면/이미지 등 보조 에셋의 변경 추적
  const nonJsonAssets = assetPaths.filter((p) => !p.endsWith('.json'));
  const uncommittedTime = getUncommittedLatestMtime(nonJsonAssets.length > 0 ? nonJsonAssets : assetPaths, rootDir);
  const gitTime = getLatestGitCommitTime(assetPaths, rootDir);
  const explicitTime =
    protocol.updatedAt && !isNaN(new Date(protocol.updatedAt).getTime())
      ? protocol.updatedAt
      : null;

  const candidates: { time: string; ms: number }[] = [];
  if (uncommittedTime) candidates.push({ time: uncommittedTime, ms: new Date(uncommittedTime).getTime() });
  if (gitTime) candidates.push({ time: gitTime, ms: new Date(gitTime).getTime() });
  if (explicitTime) candidates.push({ time: explicitTime, ms: new Date(explicitTime).getTime() });

  let latestCandidate: { time: string; ms: number } | null = null;
  for (const c of candidates) {
    if (!latestCandidate || c.ms > latestCandidate.ms) {
      latestCandidate = c;
    }
  }

  // 5. 수정 일시 노출 여부 결정 (시간 역전 방지 가드: latestCandidate.ms >= createdMs)
  let updatedAt: string | undefined = undefined;
  let isModified = false;

  if (latestCandidate && latestCandidate.ms >= createdMs) {
    const diffMs = latestCandidate.ms - createdMs;
    // 2분(120,000ms) 이상 차이 나거나 명시적 updatedAt이 존재하면 최종 수정 활성화
    if (diffMs > 120_000 || explicitTime) {
      updatedAt = latestCandidate.time;
      isModified = true;
    }
  }

  return {
    createdAt,
    updatedAt,
    isModified,
    contentHash: currentHash,
    assetPaths,
  };
}

/**
 * [영속화 동기화 엔진]
 * 모든 프로토콜 마스터 JSON 및 다국어 로케일 JSON 파일에
 * 최신 콘텐츠 해시(contentHash)와 최종 수정 일시(updatedAt)를 물리적으로 동기화하여 파일에 기록합니다.
 */
export function syncProtocolTimestamps(options: {
  rootDir?: string;
  writeFiles?: boolean;
} = {}): SyncTimestampReport[] {
  const rootDir = options.rootDir || process.cwd();
  const writeFiles = options.writeFiles !== false;

  const protocolsDir = path.resolve(rootDir, 'content/protocols');
  const localesDir = path.resolve(rootDir, 'content/protocols/locales');

  if (!fs.existsSync(protocolsDir)) return [];

  const files = fs.readdirSync(protocolsDir).filter((f) => f.endsWith('.json')).sort();
  const reports: SyncTimestampReport[] = [];

  for (const file of files) {
    const filePath = path.join(protocolsDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const proto: Protocol = JSON.parse(raw);
    const baseSlug = path.basename(file, '.json');

    const resolved = resolveProtocolTimestamps(proto, filePath, rootDir);
    const hashChanged = !proto.contentHash || proto.contentHash !== resolved.contentHash;
    
    // 밀리초 정밀 비교로 ISO 표기 차이(Z vs +09:00)에 의한 팬텀 dirty 방지
    const timeChanged =
      Boolean(proto.updatedAt) !== Boolean(resolved.updatedAt) ||
      (proto.updatedAt && resolved.updatedAt
        ? new Date(proto.updatedAt).getTime() !== new Date(resolved.updatedAt).getTime()
        : false);

    let shouldUpdate = hashChanged || timeChanged || !proto.createdAt;
    let reason = '';

    if (!proto.contentHash) {
      reason = '최초 콘텐츠 해시 지문 등록';
      shouldUpdate = true;
    } else if (proto.contentHash !== resolved.contentHash) {
      reason = `콘텐츠 실질 변경 감지 (${proto.contentHash} -> ${resolved.contentHash})`;
      shouldUpdate = true;
    } else if (timeChanged) {
      reason = `타임스탬프 동기화 (${proto.updatedAt || '없음'} -> ${resolved.updatedAt || '없음'})`;
      shouldUpdate = true;
    }

    if (shouldUpdate && writeFiles) {
      proto.createdAt = resolved.createdAt;
      proto.updatedAt = resolved.updatedAt;
      proto.contentHash = resolved.contentHash;

      fs.writeFileSync(filePath, JSON.stringify(proto, null, 2), 'utf-8');

      // 6개국어 번역 파일에도 동일한 타임스탬프 및 해시 물리적 동기화
      if (fs.existsSync(localesDir)) {
        const locFiles = fs
          .readdirSync(localesDir)
          .filter((f) => f.startsWith(baseSlug) && f.endsWith('.json'))
          .sort();
        for (const lf of locFiles) {
          const locPath = path.join(localesDir, lf);
          try {
            const locProto: Protocol = JSON.parse(fs.readFileSync(locPath, 'utf-8'));
            locProto.createdAt = resolved.createdAt;
            locProto.updatedAt = resolved.updatedAt;
            locProto.contentHash = resolved.contentHash;
            fs.writeFileSync(locPath, JSON.stringify(locProto, null, 2), 'utf-8');
          } catch {}
        }
      }
    }

    reports.push({
      protocolId: proto.protocolId,
      file,
      contentHash: resolved.contentHash,
      createdAt: resolved.createdAt,
      updatedAt: resolved.updatedAt,
      updated: shouldUpdate,
      reason: reason || '최신 상태 유지 (동기화 완료)',
    });
  }

  return reports;
}
