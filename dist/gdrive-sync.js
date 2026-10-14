import { GoogleDriveService } from './services/google-drive.service.js';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {
    // ignore
  }
}

async function run() {
  console.log('🚀 [Google Drive Sync] 프로젝트 문서 동기화를 시작합니다...');
  const driveService = new GoogleDriveService();

  if (!driveService.isConfigured()) {
    console.error('❌ Google Drive 환경 변수가 올바르게 설정되지 않았습니다.');
    console.error('필수 변수: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID');
    process.exit(1);
  }

  try {
    const summary = await driveService.syncAllDocuments();
    console.log('------------------------------------------------------------');
    for (const res of summary.results) {
      if (res.status === 'created') {
        console.log(`  ➕ [신규 생성] ${res.fileName} (ID: ${res.id})`);
      } else if (res.status === 'updated') {
        console.log(`  🔄 [최신 갱신] ${res.fileName} (ID: ${res.id})`);
      } else if (res.status === 'deleted') {
        console.log(`  🗑️ [불필요 파일 정리] ${res.fileName} (ID: ${res.id})`);
      } else {
        console.log(`  ❌ [실패] ${res.fileName} - ${res.error}`);
      }
    }
    console.log('------------------------------------------------------------');
    console.log(`📊 동기화 완료: 대상 문서 ${summary.total}개 (생성 ${summary.created}개, 갱신 ${summary.updated}개), 정리 ${summary.deleted}개, 실패 ${summary.failed}개`);

    if (!summary.success) {
      process.exit(1);
    }
  } catch (err     ) {
    console.error('❌ 동기화 중 치명적 오류 발생:', err.message || err);
    process.exit(1);
  }
}

run();
