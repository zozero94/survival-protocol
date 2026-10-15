import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface SvgRenderResult {
  buffer: Buffer;
  base64: string;
  width: number;
  height: number;
}

/**
 * [Utility] 고해상도 벡터 도면(SVG)을 PNG 이미지로 초고속 렌더링
 * - macOS QuickLook(qlmanage) 썸네일러를 활용하여 수 밀리초 내에 1000px 고화질 래스터 이미지 생성
 * - 임시 파일은 렌더링 직후 메모리로 로드하고 즉시 안전하게 정리(cleanup)
 */
export async function renderSvgToPng(svgContentOrPath: string): Promise<SvgRenderResult> {
  const isFilePath = svgContentOrPath.trim().endsWith('.svg') && fs.existsSync(svgContentOrPath.trim());
  const tmpId = crypto.randomUUID();
  const tmpDir = os.tmpdir();
  const inputSvgPath = isFilePath
    ? svgContentOrPath.trim()
    : path.join(tmpDir, `render-${tmpId}.svg`);

  if (!isFilePath) {
    fs.writeFileSync(inputSvgPath, svgContentOrPath, 'utf-8');
  }

  // qlmanage는 <inputSvgPath>.png 형식으로 지정된 -o 폴더에 출력함
  const baseName = path.basename(inputSvgPath);
  const expectedPngPath = path.join(tmpDir, `${baseName}.png`);

  try {
    await execFileAsync('qlmanage', ['-t', '-s', '1000', '-o', tmpDir, inputSvgPath], {
      timeout: 5000,
    });

    if (!fs.existsSync(expectedPngPath)) {
      throw new Error(`SVG 렌더링 결과 파일이 생성되지 않았습니다: ${expectedPngPath}`);
    }

    const buffer = fs.readFileSync(expectedPngPath);
    const base64 = buffer.toString('base64');

    return {
      buffer,
      base64,
      width: 1000,
      height: 1000,
    };
  } finally {
    // 임시 파일 정리
    if (!isFilePath && fs.existsSync(inputSvgPath)) {
      try {
        fs.unlinkSync(inputSvgPath);
      } catch {}
    }
    if (fs.existsSync(expectedPngPath)) {
      try {
        fs.unlinkSync(expectedPngPath);
      } catch {}
    }
  }
}
