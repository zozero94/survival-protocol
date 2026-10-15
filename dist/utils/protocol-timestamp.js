import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
                                                           

                                          
                    
                     
                      
                       
 

/**
 * 특정 프로토콜과 직결된 모든 에셋(마스터 JSON, 단계별 SVG/이미지, 완성형 도면/이미지, 6개국어 번역본)의
 * 실제 존재하는 파일 경로 목록을 수집합니다.
 */
export function collectProtocolAssetPaths(
  protocol          ,
  masterFilePath        ,
  rootDir         = process.cwd()
)           {
  const assets           = [];

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
        .filter((f) => f.startsWith(baseSlug) || f.startsWith(num));
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
  relativeFilePaths          ,
  rootDir         = process.cwd()
)                {
  if (!relativeFilePaths.length) return null;
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
 */
export function getUncommittedLatestMtime(
  relativeFilePaths          ,
  rootDir         = process.cwd()
)                {
  if (!relativeFilePaths.length) return null;

  try {
    const quoted = relativeFilePaths.map((p) => `"${p.replace(/"/g, '\\"')}"`).join(' ');
    const statusOut = execSync(`git status --porcelain -- ${quoted}`, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (statusOut) {
      // 변경/추가된 파일들의 mtime 중 최댓값
      let maxMs = 0;
      for (const relPath of relativeFilePaths) {
        const absPath = path.resolve(rootDir, relPath);
        if (fs.existsSync(absPath)) {
          const stat = fs.statSync(absPath);
          if (stat.mtimeMs > maxMs) maxMs = stat.mtimeMs;
        }
      }
      if (maxMs > 0) return new Date(maxMs).toISOString();
    }
  } catch {
    // git 명령 실패 시(예: .git 없는 서버리스 등), 실제 파일 mtime 기준 fallback
    let maxMs = 0;
    for (const relPath of relativeFilePaths) {
      const absPath = path.resolve(rootDir, relPath);
      if (fs.existsSync(absPath)) {
        const stat = fs.statSync(absPath);
        if (stat.mtimeMs > maxMs) maxMs = stat.mtimeMs;
      }
    }
    if (maxMs > 0) return new Date(maxMs).toISOString();
  }

  return null;
}

/**
 * 프로토콜과 연관 에셋을 분석하여 결정론적이고 최신 상태의 createdAt과 updatedAt을 산출합니다.
 */
export function resolveProtocolTimestamps(
  protocol          ,
  masterFilePath        ,
  rootDir         = process.cwd()
)                          {
  const assetPaths = collectProtocolAssetPaths(protocol, masterFilePath, rootDir);

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

  // 2. 수정 일시 후보군 취합
  // 후보 A: Git 커밋 이력상의 최신 수정 시점 (프로덕션 SSOT)
  const gitTime = getLatestGitCommitTime(assetPaths, rootDir);

  // 후보 B: 로컬 수정 중인 파일의 mtime (개발 환경 즉시 반영)
  const uncommittedTime = getUncommittedLatestMtime(assetPaths, rootDir);

  // 후보 C: 프로토콜 JSON 자체에 명시된 updatedAt (수동/서비스 지정값)
  const explicitTime =
    protocol.updatedAt && !isNaN(new Date(protocol.updatedAt).getTime())
      ? protocol.updatedAt
      : null;

  // 가장 최신의 시점 선정
  const candidates                                 = [];
  if (gitTime) candidates.push({ time: gitTime, ms: new Date(gitTime).getTime() });
  if (uncommittedTime) candidates.push({ time: uncommittedTime, ms: new Date(uncommittedTime).getTime() });
  if (explicitTime) candidates.push({ time: explicitTime, ms: new Date(explicitTime).getTime() });

  let latestCandidate                                      = null;
  for (const c of candidates) {
    if (!latestCandidate || c.ms > latestCandidate.ms) {
      latestCandidate = c;
    }
  }

  // 3. 수정 일시 노출 여부 결정
  let updatedAt                     = undefined;
  let isModified = false;

  if (latestCandidate) {
    const diffMs = latestCandidate.ms - createdMs;
    // 2분(120,000ms) 이상 차이 나거나 명시적 updatedAt이 존재하면 최종 수정 표시
    if (diffMs > 120_000 || explicitTime) {
      updatedAt = latestCandidate.time;
      isModified = true;
    }
  }

  return {
    createdAt,
    updatedAt,
    isModified,
    assetPaths,
  };
}
