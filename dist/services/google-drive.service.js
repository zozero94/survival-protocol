import fs from 'node:fs';
import path from 'node:path';

                                    
                    
                        
                        
                    
 

                                
             
               
                    
 

                                 
                   
             
                                                                   
                 
 

                              
                   
                
                  
                  
                  
                 
                            
 

export class GoogleDriveService {
          clientId        ;
          clientSecret        ;
          refreshToken        ;
          folderId        ;
          cachedAccessToken                = null;
          tokenExpiresAt         = 0;

  constructor(config                    ) {
    this.clientId = config?.clientId || process.env.GOOGLE_DRIVE_CLIENT_ID || '';
    this.clientSecret = config?.clientSecret || process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
    this.refreshToken = config?.refreshToken || process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';
    this.folderId = config?.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '';
  }

         isConfigured()          {
    return Boolean(this.clientId && this.clientSecret && this.refreshToken && this.folderId);
  }

         async getAccessToken()                  {
    const now = Date.now();
    if (this.cachedAccessToken && this.tokenExpiresAt > now + 60000) {
      return this.cachedAccessToken;
    }

    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new Error('Google Drive OAuth credentials are not fully configured (clientId, clientSecret, refreshToken required)');
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(`Failed to refresh Google Drive access token: ${JSON.stringify(data)}`);
    }

    this.cachedAccessToken = data.access_token;
    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    this.tokenExpiresAt = now + expiresIn * 1000;
    return this.cachedAccessToken;
  }

         async listFiles(folderId         = this.folderId)                           {
    const token = await this.getAccessToken();
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id, name, mimeType)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=100`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Failed to list files in folder ${folderId}: ${JSON.stringify(data)}`);
    }

    return (data.files || []).map((f     ) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType
    }));
  }

         async deleteFile(fileId        )                   {
    const token = await this.getAccessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  }

         getMimeType(fileName        )         {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case '.md':
        return 'text/markdown; charset=utf-8';
      case '.json':
        return 'application/json; charset=utf-8';
      case '.svg':
        return 'image/svg+xml';
      case '.txt':
        return 'text/plain; charset=utf-8';
      default:
        return 'text/plain; charset=utf-8';
    }
  }

         async upsertFile(
    localFilePath        ,
    targetFileName         ,
    targetFolderId         = this.folderId,
    existingFilesCache                  
  )                          {
    const fileName = targetFileName || path.basename(localFilePath);
    if (!fs.existsSync(localFilePath)) {
      return {
        fileName,
        id: '',
        status: 'failed',
        error: `Local file not found: ${localFilePath}`
      };
    }

    try {
      const token = await this.getAccessToken();
      const content = fs.readFileSync(localFilePath, 'utf8');
      const mimeType = this.getMimeType(fileName);

      const existingFiles = existingFilesCache || (await this.listFiles(targetFolderId));
      const existing = existingFiles.find((f) => f.name === fileName);

      const boundary = `-------GoogleDriveSyncBoundary${Date.now()}`;
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      if (existing) {
        // Update existing file (PATCH)
        const metadata = JSON.stringify({ name: fileName });
        const multipartBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          metadata +
          delimiter +
          `Content-Type: ${mimeType}\r\n\r\n` +
          content +
          closeDelimiter;

        const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`;
        const res = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(`PATCH file failed: ${JSON.stringify(data)}`);
        }

        return {
          fileName,
          id: existing.id,
          status: 'updated'
        };
      } else {
        // Create new file (POST)
        const metadata = JSON.stringify({
          name: fileName,
          parents: [targetFolderId]
        });
        const multipartBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          metadata +
          delimiter +
          `Content-Type: ${mimeType}\r\n\r\n` +
          content +
          closeDelimiter;

        const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        const res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(`POST file failed: ${JSON.stringify(data)}`);
        }

        return {
          fileName,
          id: data.id,
          status: 'created'
        };
      }
    } catch (err     ) {
      return {
        fileName,
        id: '',
        status: 'failed',
        error: err.message || String(err)
      };
    }
  }

         async syncAllDocuments(
    baseDir         = process.cwd(),
    pruneExtraneous          = true
  )                       {
    if (!this.isConfigured()) {
      throw new Error(
        'Google Drive settings are not configured. Please check GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, and GOOGLE_DRIVE_FOLDER_ID in .env'
      );
    }

    const filesToSync                                                   = [];

    // 1. Root documentation (*.md)
    const rootDocs = ['PROJECT_SPEC.md', 'README.md', 'NEXT_TOPIC_PROMPT.md'];
    for (const doc of rootDocs) {
      const fullPath = path.resolve(baseDir, doc);
      if (fs.existsSync(fullPath)) {
        filesToSync.push({ localPath: fullPath, targetName: doc });
      }
    }

    // 2. implementation_plan.md (from Antigravity brain artifact dir or project root)
    const artifactPlanPath = '/Users/kakao/.gemini/antigravity/brain/01ac9f3e-66fb-464b-bb68-6ce7d94501df/implementation_plan.md';
    const localPlanPath = path.resolve(baseDir, 'implementation_plan.md');
    if (fs.existsSync(artifactPlanPath)) {
      filesToSync.push({ localPath: artifactPlanPath, targetName: 'implementation_plan.md' });
    } else if (fs.existsSync(localPlanPath)) {
      filesToSync.push({ localPath: localPlanPath, targetName: 'implementation_plan.md' });
    }

    const allowedNames = new Set(filesToSync.map((f) => f.targetName));

    // Fetch existing files once
    const existingFiles = await this.listFiles(this.folderId);

    const results                   = [];
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let failed = 0;

    // Prune extraneous files (e.g. legacy json or protocol files) if requested
    if (pruneExtraneous) {
      for (const existing of existingFiles) {
        if (!allowedNames.has(existing.name)) {
          const ok = await this.deleteFile(existing.id);
          if (ok) {
            deleted++;
            results.push({
              fileName: existing.name,
              id: existing.id,
              status: 'deleted'
            });
          } else {
            failed++;
            results.push({
              fileName: existing.name,
              id: existing.id,
              status: 'failed',
              error: 'Failed to delete extraneous file from Google Drive'
            });
          }
        }
      }
    }

    for (const item of filesToSync) {
      const res = await this.upsertFile(item.localPath, item.targetName, this.folderId, existingFiles);
      results.push(res);
      if (res.status === 'created') created++;
      else if (res.status === 'updated') updated++;
      else if (res.status === 'failed') failed++;
    }

    return {
      success: failed === 0,
      total: filesToSync.length,
      created,
      updated,
      deleted,
      failed,
      results
    };
  }
}
