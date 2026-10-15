import { syncProtocolTimestamps } from '../src/utils/protocol-timestamp.ts';

console.log('===========================================================');
console.log('⏱️ [타임스탬프 & 콘텐츠 해시 물리 동기화 엔진]');
console.log('===========================================================\n');

const reports = syncProtocolTimestamps({ writeFiles: true });

let updatedCount = 0;
for (const r of reports) {
  const icon = r.updated ? '🔄' : '✅';
  console.log(`${icon} [${r.protocolId}] ${r.file}`);
  console.log(`   ├ 해시: ${r.contentHash}`);
  console.log(`   ├ 등록: ${r.createdAt}`);
  console.log(`   ├ 수정: ${r.updatedAt || '없음 (신규 상태)'}`);
  console.log(`   └ 사유: ${r.reason}\n`);
  if (r.updated) updatedCount++;
}

console.log('-----------------------------------------------------------');
console.log(`📊 동기화 완료: 총 ${reports.length}개 프로토콜 중 ${updatedCount}개 파일 갱신됨.`);
console.log('===========================================================');
