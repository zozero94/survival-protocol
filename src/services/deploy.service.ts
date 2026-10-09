import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export interface DeployResult {
  success: boolean;
  commitHash?: string;
  commitMessage?: string;
  pushed: boolean;
  error?: string;
}

export interface DeployOptions {
  cwd?: string;
  dryRun?: boolean;
}

/**
 * [Service Layer]
 * Git 변경 사항 자동 커밋 및 Vercel 자동 배포(origin/main) 트리거 서비스
 */
export class DeployService {
  /**
   * 변경된 작업 트리를 스테이징하고 커밋 후 origin main으로 푸시한다.
   */
  public static async commitAndPush(
    commitMessage: string,
    options: DeployOptions = {}
  ): Promise<DeployResult> {
    const cwd = options.cwd || rootDir;

    if (options.dryRun) {
      return {
        success: true,
        commitHash: 'dry-run-hash-0000000',
        commitMessage,
        pushed: false,
      };
    }

    try {
      // 1. 상태 확인 (변경 사항이 있는지)
      const status = execSync('git status --porcelain', { cwd, encoding: 'utf-8' }).trim();
      if (!status) {
        return {
          success: true,
          commitMessage: '변경 사항 없음 (Clean working tree)',
          pushed: false,
        };
      }

      // 2. 전체 스테이징
      execSync('git add -A', { cwd, stdio: 'pipe' });

      // 3. 커밋 생성
      const safeMessage = commitMessage.replace(/"/g, '\\"');
      execSync(`git commit -m "${safeMessage}"`, { cwd, stdio: 'pipe' });

      const hash = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf-8' }).trim();

      // 4. 원격 푸시 (Vercel 자동 배포 트리거)
      execSync('git push origin main', { cwd, stdio: 'pipe' });

      return {
        success: true,
        commitHash: hash,
        commitMessage,
        pushed: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.stderr?.toString?.() || error?.message || String(error),
        pushed: false,
      };
    }
  }

  /**
   * 현재 HEAD 커밋 정보 조회
   */
  public static getCurrentCommit(cwd: string = rootDir): { hash: string; message: string } {
    try {
      const hash = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf-8' }).trim();
      const message = execSync('git log -1 --pretty=%B', { cwd, encoding: 'utf-8' }).trim();
      return { hash, message };
    } catch {
      return { hash: 'unknown', message: 'unknown' };
    }
  }
}
