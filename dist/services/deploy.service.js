import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

                               
                   
                      
                         
                  
                 
 

                                   
                                                                                 
                  
 

                                
               
                   
                       
                
                  
                             
                          
 

/**
 * [Service Layer]
 * Git 변경 사항 자동 커밋 및 Vercel 자동 배포(origin/main) 트리거 서비스
 * - 로컬 환경: git CLI를 통한 스테이징, 커밋 및 푸시
 * - 클라우드 서버리스 환경(Vercel): GitHub REST API(Git Trees)를 통한 무상태 원격 커밋 및 자동 배포 트리거
 */
export class DeployService {
         static          DEFAULT_REPO = 'zozero94/survival-protocol';
         static          DEFAULT_BRANCH = 'main';

  /**
   * 현재 환경이 로컬 Git 저장소를 사용할 수 있는지 판별
   */
         static hasLocalGit(cwd         = rootDir)          {
    if (process.env.VERCEL === '1') return false;
    return fs.existsSync(path.join(cwd, '.git'));
  }

  /**
   * 변경된 작업 트리를 스테이징하고 커밋 후 origin main으로 푸시한다.
   * 서버리스 환경이거나 files가 명시된 경우 GitHub REST API를 통해 원격 커밋을 수행한다.
   */
         static async commitAndPush(
    commitMessage        ,
    options                = {}
  )                        {
    const cwd = options.cwd || rootDir;

    if (options.dryRun) {
      return {
        success: true,
        commitHash: 'dry-run-hash-0000000',
        commitMessage,
        pushed: false,
      };
    }

    const githubToken = options.githubToken || process.env.GITHUB_TOKEN || '';

    // 서버리스 환경이거나 명시적 원격 파일 변경 목록이 전달된 경우 GitHub API 사용
    if ((!this.hasLocalGit(cwd) || options.files || options.deletedPaths) && githubToken) {
      return this.commitViaGitHubApi({
        commitMessage,
        githubToken,
        repo: options.repo || this.DEFAULT_REPO,
        branch: options.branch || this.DEFAULT_BRANCH,
        files: options.files || [],
        deletedPaths: options.deletedPaths || [],
      });
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
    } catch (error     ) {
      return {
        success: false,
        error: error?.stderr?.toString?.() || error?.message || String(error),
        pushed: false,
      };
    }
  }

  /**
   * GitHub REST API (Git Data API)를 통해 로컬 Git 없이 클라우드에서 직접 원자적(Atomic) 커밋 및 푸시 수행
   */
         static async commitViaGitHubApi(params   
                          
                        
                  
                    
                               
                            
   )                        {
    const repo = params.repo || this.DEFAULT_REPO;
    const branch = params.branch || this.DEFAULT_BRANCH;
    const headers = {
      Authorization: `Bearer ${params.githubToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'survival-protocol-serverless-bot',
    };

    try {
      // 1. 현재 브랜치 HEAD 참조 조회
      const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (!refRes.ok) {
        throw new Error(`GitHub Ref 조회 실패 (${refRes.status}): ${await refRes.text()}`);
      }
      const refData      = await refRes.json();
      const latestCommitSha         = refData.object.sha;

      // 2. 현재 커밋의 Base Tree SHA 조회
      const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${latestCommitSha}`, {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (!commitRes.ok) {
        throw new Error(`GitHub Commit 조회 실패 (${commitRes.status}): ${await commitRes.text()}`);
      }
      const commitData      = await commitRes.json();
      const baseTreeSha         = commitData.tree.sha;

      // 3. 새 Tree 구성 (파일 추가/수정 및 삭제)
      let treeSha = baseTreeSha;
      const files = params.files || [];
      const deletedPaths = params.deletedPaths || [];

      if (files.length > 0 || deletedPaths.length > 0) {
        const treeEntries        = [
          ...files.map((f) => ({
            path: f.path.replace(/^\/+/, ''),
            mode: '100644',
            type: 'blob',
            content: f.content,
          })),
          ...deletedPaths.map((p) => ({
            path: p.replace(/^\/+/, ''),
            mode: '100644',
            type: 'blob',
            sha: null,
          })),
        ];

        const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: treeEntries,
          }),
          signal: AbortSignal.timeout(20000),
        });
        if (!treeRes.ok) {
          throw new Error(`GitHub Tree 생성 실패 (${treeRes.status}): ${await treeRes.text()}`);
        }
        const treeData      = await treeRes.json();
        treeSha = treeData.sha;
      }

      // 4. 새 Commit 생성 (파일 변경이 없더라도 빈 커밋으로 Vercel 재배포 트리거 가능)
      const newCommitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: params.commitMessage,
          tree: treeSha,
          parents: [latestCommitSha],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!newCommitRes.ok) {
        throw new Error(`GitHub Commit 생성 실패 (${newCommitRes.status}): ${await newCommitRes.text()}`);
      }
      const newCommitData      = await newCommitRes.json();
      const newCommitSha         = newCommitData.sha;

      // 5. 브랜치 HEAD 포인터 업데이트 (Vercel 자동 배포 즉시 트리거)
      const updateRefRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: newCommitSha,
          force: false,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!updateRefRes.ok) {
        throw new Error(`GitHub Ref 업데이트 실패 (${updateRefRes.status}): ${await updateRefRes.text()}`);
      }

      return {
        success: true,
        commitHash: newCommitSha.slice(0, 7),
        commitMessage: params.commitMessage,
        pushed: true,
      };
    } catch (error     ) {
      return {
        success: false,
        error: error?.message || String(error),
        pushed: false,
      };
    }
  }

  /**
   * 작업 디렉토리(예: /tmp/survival-workspace)에서 생성된 content/ 및 public/ 파일들을 수집하여 GitHub API용 배열로 변환
   */
         static collectWorkspaceFiles(workDir        )                     {
    const changes                     = [];
    const targetDirs = ['content/protocols', 'content/svgs', 'public'];

    const walk = (relDir        ) => {
      const absDir = path.join(workDir, relDir);
      if (!fs.existsSync(absDir)) return;
      for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
        const relPath = path.posix.join(relDir, entry.name);
        const absPath = path.join(absDir, entry.name);
        if (entry.isDirectory()) {
          walk(relPath);
        } else if (entry.isFile()) {
          changes.push({
            path: relPath,
            content: fs.readFileSync(absPath, 'utf-8'),
          });
        }
      }
    };

    for (const dir of targetDirs) {
      walk(dir);
    }

    const nextTopicPath = path.join(workDir, 'NEXT_TOPIC_PROMPT.md');
    if (fs.existsSync(nextTopicPath)) {
      changes.push({
        path: 'NEXT_TOPIC_PROMPT.md',
        content: fs.readFileSync(nextTopicPath, 'utf-8'),
      });
    }

    return changes;
  }

  /**
   * 현재 HEAD 커밋 정보 조회 (로컬 Git 및 Vercel 서버리스 환경변수 동시 지원)
   */
         static getCurrentCommit(cwd         = rootDir)                                    {
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      return {
        hash: process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7),
        message: process.env.VERCEL_GIT_COMMIT_MESSAGE || 'Vercel Serverless Production Deployment',
      };
    }

    try {
      const hash = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf-8' }).trim();
      const message = execSync('git log -1 --pretty=%B', { cwd, encoding: 'utf-8' }).trim();
      return { hash, message };
    } catch {
      return { hash: 'cloud-serverless', message: 'Vercel Cloud Serverless Runtime' };
    }
  }
}
