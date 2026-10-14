import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { GoogleDriveService } from '../src/services/google-drive.service.ts';

describe('☁️ [Suite 11: 구글 드라이브 동기화 엔진] OAuth2 토큰 갱신, 멀티파트 업로드 및 멱등성 검증', () => {
  it('isConfigured()는 필수 환경 설정 존재 여부를 정확히 판별해야 한다', () => {
    const unconfigured = new GoogleDriveService({
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      folderId: ''
    });
    assert.strictEqual(unconfigured.isConfigured(), false);

    const configured = new GoogleDriveService({
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      refreshToken: 'mock-refresh-token',
      folderId: 'mock-folder-id'
    });
    assert.strictEqual(configured.isConfigured(), true);
  });

  it('getMimeType()은 파일 확장자에 맞춰 올바른 Content-Type을 반환해야 한다', () => {
    const service = new GoogleDriveService();
    assert.strictEqual(service.getMimeType('README.md'), 'text/markdown; charset=utf-8');
    assert.strictEqual(service.getMimeType('data.json'), 'application/json; charset=utf-8');
    assert.strictEqual(service.getMimeType('diagram.svg'), 'image/svg+xml');
    assert.strictEqual(service.getMimeType('notes.txt'), 'text/plain; charset=utf-8');
    assert.strictEqual(service.getMimeType('unknown.xyz'), 'text/plain; charset=utf-8');
  });

  it('getAccessToken()은 refresh_token을 사용하여 access_token을 안전하게 갱신해야 한다', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url: any, init: any) => {
        if (url.toString() === 'https://oauth2.googleapis.com/token') {
          return new Response(
            JSON.stringify({
              access_token: 'mock-access-token-12345',
              expires_in: 3600,
              token_type: 'Bearer'
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('Not Found', { status: 404 });
      };

      const service = new GoogleDriveService({
        clientId: 'mock-id',
        clientSecret: 'mock-secret',
        refreshToken: 'mock-refresh',
        folderId: 'mock-folder'
      });

      const token = await service.getAccessToken();
      assert.strictEqual(token, 'mock-access-token-12345');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('upsertFile()은 기존 파일이 없을 때 POST(생성)하고, 존재할 때 PATCH(갱신)해야 한다', async () => {
    const originalFetch = globalThis.fetch;
    const requestsMade: Array<{ method: string; url: string }> = [];

    try {
      globalThis.fetch = async (url: any, init: any) => {
        const urlStr = url.toString();
        const method = init?.method || 'GET';
        requestsMade.push({ method, url: urlStr });

        if (urlStr === 'https://oauth2.googleapis.com/token') {
          return new Response(
            JSON.stringify({ access_token: 'mock-token', expires_in: 3600 }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (urlStr.includes('/drive/v3/files?q=') && method === 'GET') {
          return new Response(
            JSON.stringify({
              files: [
                { id: 'file-existing-id-1', name: 'README.md', mimeType: 'text/markdown' }
              ]
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (urlStr.includes('/upload/drive/v3/files') && method === 'POST') {
          return new Response(
            JSON.stringify({ id: 'file-new-id-2', name: 'PROJECT_SPEC.md' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (urlStr.includes('/upload/drive/v3/files/file-existing-id-1') && method === 'PATCH') {
          return new Response(
            JSON.stringify({ id: 'file-existing-id-1', name: 'README.md' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response('Not Found', { status: 404 });
      };

      const service = new GoogleDriveService({
        clientId: 'mock-id',
        clientSecret: 'mock-secret',
        refreshToken: 'mock-refresh',
        folderId: 'mock-folder'
      });

      // 1. Existing file -> should PATCH
      const resUpdate = await service.upsertFile(
        path.resolve(process.cwd(), 'README.md'),
        'README.md',
        'mock-folder'
      );
      assert.strictEqual(resUpdate.status, 'updated');
      assert.strictEqual(resUpdate.id, 'file-existing-id-1');

      // 2. New file -> should POST
      const resCreate = await service.upsertFile(
        path.resolve(process.cwd(), 'PROJECT_SPEC.md'),
        'PROJECT_SPEC.md',
        'mock-folder'
      );
      assert.strictEqual(resCreate.status, 'created');
      assert.strictEqual(resCreate.id, 'file-new-id-2');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('deleteFile()은 지정된 파일 ID를 DELETE 메서드로 안전하게 삭제해야 한다', async () => {
    const originalFetch = globalThis.fetch;
    let deletedId = '';
    let usedMethod = '';

    try {
      globalThis.fetch = async (url: any, init: any) => {
        const urlStr = url.toString();
        usedMethod = init?.method || 'GET';
        if (urlStr === 'https://oauth2.googleapis.com/token') {
          return new Response(
            JSON.stringify({ access_token: 'mock-token', expires_in: 3600 }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (urlStr.includes('/drive/v3/files/file-to-delete-123') && usedMethod === 'DELETE') {
          deletedId = 'file-to-delete-123';
          return new Response(null, { status: 204 });
        }
        return new Response('Not Found', { status: 404 });
      };

      const service = new GoogleDriveService({
        clientId: 'mock-id',
        clientSecret: 'mock-secret',
        refreshToken: 'mock-refresh',
        folderId: 'mock-folder'
      });

      const ok = await service.deleteFile('file-to-delete-123');
      assert.strictEqual(ok, true);
      assert.strictEqual(deletedId, 'file-to-delete-123');
      assert.strictEqual(usedMethod, 'DELETE');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('syncAllDocuments()는 오직 .md 파일만 동기화하고 불필요한 json/기타 파일은 정리(prune)해야 한다', async () => {
    const originalFetch = globalThis.fetch;
    const deletedFiles: string[] = [];
    const upsertedFiles: string[] = [];

    try {
      globalThis.fetch = async (url: any, init: any) => {
        const urlStr = url.toString();
        const method = init?.method || 'GET';

        if (urlStr === 'https://oauth2.googleapis.com/token') {
          return new Response(
            JSON.stringify({ access_token: 'mock-token', expires_in: 3600 }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (urlStr.includes('/drive/v3/files?q=') && method === 'GET') {
          return new Response(
            JSON.stringify({
              files: [
                { id: 'f1', name: 'README.md', mimeType: 'text/markdown' },
                { id: 'f2', name: 'protocols_01-water.json', mimeType: 'application/json' },
                { id: 'f3', name: 'knowledge-tree.json', mimeType: 'application/json' }
              ]
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (urlStr.includes('/drive/v3/files/f2') && method === 'DELETE') {
          deletedFiles.push('protocols_01-water.json');
          return new Response(null, { status: 204 });
        }
        if (urlStr.includes('/drive/v3/files/f3') && method === 'DELETE') {
          deletedFiles.push('knowledge-tree.json');
          return new Response(null, { status: 204 });
        }

        if (urlStr.includes('/upload/drive/v3/files') && (method === 'PATCH' || method === 'POST')) {
          const body = String(init?.body || '');
          const match = body.match(/"name":\s*"([^"]+)"/);
          if (match) {
            upsertedFiles.push(match[1]);
          }
          return new Response(JSON.stringify({ id: 'mock-up-id' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response('Not Found', { status: 404 });
      };

      const service = new GoogleDriveService({
        clientId: 'mock-id',
        clientSecret: 'mock-secret',
        refreshToken: 'mock-refresh',
        folderId: 'mock-folder'
      });

      const summary = await service.syncAllDocuments(process.cwd(), true);
      assert.strictEqual(summary.success, true);
      assert.strictEqual(summary.deleted, 2);
      assert.deepStrictEqual(deletedFiles, ['protocols_01-water.json', 'knowledge-tree.json']);
      // All upserted files must be markdown files
      for (const f of upsertedFiles) {
        assert.ok(f.endsWith('.md'), `Expected only .md file, got: ${f}`);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('존재하지 않는 로컬 파일은 안전하게 실패 상태(failed)로 처리되어야 한다', async () => {
    const service = new GoogleDriveService({
      clientId: 'mock-id',
      clientSecret: 'mock-secret',
      refreshToken: 'mock-refresh',
      folderId: 'mock-folder'
    });

    const res = await service.upsertFile('/non/existent/path/file.md', 'file.md');
    assert.strictEqual(res.status, 'failed');
    assert.ok(res.error?.includes('Local file not found'));
  });
});
