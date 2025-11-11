import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { dialog } from 'electron';
import { PDFDocument, degrees } from 'pdf-lib';
import { PNG } from 'pngjs';

const execFileAsync = promisify(execFile);

export interface ScannerDevice {
  id: string;
  name: string;
  status: 'ready' | 'busy' | 'unknown';
  source: 'wia' | 'sane' | 'unknown';
}

export interface ScanResult {
  success: boolean;
  filePath?: string;
  error?: string;
  session?: ScanSessionSummary;
}

export interface ScanOptions {
  mode?: 'single' | 'multi';
}

export interface ScanPreviewPage {
  id: string;
  fileName: string;
  dataUrl: string;
}

export interface ScanSessionSummary {
  id: string;
  pages: ScanPreviewPage[];
  suggestedFilePath: string;
  defaultFileName: string;
}

interface SessionPage {
  id: string;
  fileName: string;
  absolutePath: string;
  createdAt: Date;
}

interface ScanSession {
  id: string;
  scannerId: string;
  workspacePath: string;
  tempDir: string;
  baseFileName: string;
  pages: SessionPage[];
}

interface SaveSessionPayload {
  sessionId: string;
  directory: string;
  fileName: string;
  pages: Array<{ id: string; rotation?: number }>;
}

const SCAN_OUTPUT_SUBDIRECTORY = 'Scans';
const SCAN_TEMP_SUBDIRECTORY = '.scan-temp';

const sessions = new Map<string, ScanSession>();

const WIA_OUTPUT_FORMATS = [
  { id: '{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}', extension: '.png', type: 'png' },
  { id: '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}', extension: '.jpg', type: 'jpeg' },
  { id: '{B96B3CAB-0728-11D3-9D7B-0000F81EF32E}', extension: '.bmp', type: 'bmp' },
];

class NoMorePagesError extends Error {
  constructor(message?: string) {
    super(message ?? 'No more pages available.');
    this.name = 'NoMorePagesError';
  }
}

export async function listScanners(): Promise<ScannerDevice[]> {
  try {
    if (process.platform === 'win32') {
      return await listWindowsScanners();
    }

    if (process.platform === 'linux') {
      return await listLinuxScanners();
    }
  } catch (error) {
    console.error('Failed to list scanners', error);
  }

  return [];
}

export async function startScan(scannerId: string, workspacePath: string, options: ScanOptions = {}): Promise<ScanResult> {
  if (!scannerId) {
    return { success: false, error: 'Scanner id is required.' };
  }

  if (!workspacePath) {
    return { success: false, error: 'Workspace path is not configured yet.' };
  }

  const mode = options.mode ?? 'single';
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
  const baseFileName = `scan-${timestamp}`;

  try {
    if (mode === 'multi') {
      const session = await createScanSession(workspacePath, scannerId, baseFileName);
      const newPages = await capturePages(session, { allowMultiple: true });

      if (newPages.length === 0) {
        await cleanupSession(session.id, session);
        return { success: false, error: 'No pages were scanned.' };
      }

      session.pages.push(...newPages);
      sessions.set(session.id, session);

      const previewPages = await serializeSessionPages(session.pages);
      const suggestedDirectory = await ensureScanDirectory(workspacePath);
      const defaultFileName = `${baseFileName}.pdf`;
      const suggestedFilePath = path.join(suggestedDirectory, defaultFileName);

      return {
        success: true,
        session: {
          id: session.id,
          pages: previewPages,
          suggestedFilePath,
          defaultFileName,
        },
      };
    }

    const outputDirectory = await ensureScanDirectory(workspacePath);
    const singlePage = await captureSinglePage(scannerId, outputDirectory, baseFileName);
    return { success: true, filePath: singlePage };
  } catch (error: any) {
    console.error('Failed to start scan', error);
    return {
      success: false,
      error: error?.message ?? 'Failed to start scan.',
    };
  }
}

export async function appendScanPages(sessionId: string): Promise<{ success: boolean; pages?: ScanPreviewPage[]; error?: string }> {
  const session = sessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'Scan session not found.' };
  }

  try {
    const newPages = await capturePages(session, { allowMultiple: true });
    if (newPages.length === 0) {
      return { success: true, pages: [] };
    }

    session.pages.push(...newPages);
    const previews = await serializeSessionPages(newPages);
    return { success: true, pages: previews };
  } catch (error: any) {
    console.error('Failed to append scan pages', error);
    return {
      success: false,
      error: error?.message ?? 'Failed to scan additional pages.',
    };
  }
}

export async function saveScanSession(payload: SaveSessionPayload): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const session = sessions.get(payload.sessionId);
  if (!session) {
    return { success: false, error: 'Scan session not found.' };
  }

  const directory = payload.directory?.trim() || (await ensureScanDirectory(session.workspacePath));
  const fileName = ensurePdfExtension(payload.fileName?.trim() || `${session.baseFileName}.pdf`);
  const outputPath = path.join(directory, fileName);

  try {
    const rotationMap = new Map<string, number>();
    for (const page of payload.pages ?? []) {
      rotationMap.set(page.id, page.rotation ?? 0);
    }

    const orderedPages =
      payload.pages && payload.pages.length > 0
        ? payload.pages
            .map((item) => session.pages.find((page) => page.id === item.id))
            .filter((page): page is SessionPage => Boolean(page))
        : [...session.pages];

    if (orderedPages.length === 0) {
      return { success: false, error: 'No pages available to save.' };
    }

    await createPdfFromImages(orderedPages, outputPath, Object.fromEntries(rotationMap));
    await cleanupSession(payload.sessionId, session);

    return { success: true, filePath: outputPath };
  } catch (error: any) {
    console.error('Failed to save scan session', error);
    return { success: false, error: error?.message ?? 'Failed to save scanned document.' };
  }
}

export async function discardSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  await cleanupSession(sessionId, session);
}

export async function chooseScanSaveLocation(defaultDirectory: string, defaultFileName: string): Promise<{ directory: string; fileName: string } | null> {
  const defaultPath = path.join(defaultDirectory, defaultFileName);
  const result = await dialog.showSaveDialog({
    title: 'Save scanned document',
    defaultPath,
    filters: [{ name: 'PDF document', extensions: ['pdf'] }],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  const directory = path.dirname(result.filePath);
  const fileName = ensurePdfExtension(path.basename(result.filePath));

  return {
    directory,
    fileName,
  };
}

async function ensureScanDirectory(workspacePath: string): Promise<string> {
  const target = path.join(workspacePath, SCAN_OUTPUT_SUBDIRECTORY);
  await fs.mkdir(target, { recursive: true });
  return target;
}

async function ensureTempRoot(workspacePath: string): Promise<string> {
  const target = path.join(workspacePath, SCAN_TEMP_SUBDIRECTORY);
  await fs.mkdir(target, { recursive: true });
  return target;
}

async function createScanSession(workspacePath: string, scannerId: string, baseFileName: string): Promise<ScanSession> {
  const sessionId = randomUUID();
  const tempRoot = await ensureTempRoot(workspacePath);
  const tempDir = path.join(tempRoot, sessionId);
  await fs.mkdir(tempDir, { recursive: true });

  return {
    id: sessionId,
    scannerId,
    workspacePath,
    tempDir,
    baseFileName,
    pages: [],
  };
}

async function serializeSessionPages(pages: SessionPage[]): Promise<ScanPreviewPage[]> {
  return Promise.all(pages.map((page) => toPreviewPage(page)));
}

async function toPreviewPage(page: SessionPage): Promise<ScanPreviewPage> {
  const buffer = await fs.readFile(page.absolutePath);
  const extension = path.extname(page.fileName).toLowerCase();
  const mime = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';

  return {
    id: page.id,
    fileName: page.fileName,
    dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
  };
}

async function listWindowsScanners(): Promise<ScannerDevice[]> {
  const script = `
$ErrorActionPreference = 'Stop'
$manager = New-Object -ComObject 'WIA.DeviceManager'
$devices = $manager.DeviceInfos | Where-Object { $_.Type -eq 1 }
$devices | ForEach-Object {
  $name = $_.Properties['Name'].Value
  $id = $_.DeviceID
  Write-Output ("{0}\`t{1}" -f $id, $name)
}
`.trim();

  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script]);
    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    const devices: ScannerDevice[] = [];
    const seenIds = new Set<string>();

    for (const line of lines) {
      const [id, name] = line.split('\t');
      const formattedId = id?.trim() ?? '';
      if (!formattedId) {
        continue;
      }
      if (seenIds.has(formattedId)) {
        continue;
      }
      seenIds.add(formattedId);

      const device: ScannerDevice = {
        id: formattedId,
        name: name?.trim() ?? 'Unknown scanner',
        status: 'ready',
        source: 'wia',
      };
      devices.push(device);
    }

    return devices;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      console.warn('PowerShell not found. Unable to list WIA scanners.');
      return [];
    }
    throw error;
  }
}

async function listLinuxScanners(): Promise<ScannerDevice[]> {
  try {
    const { stdout } = await execFileAsync('scanimage', ['-L']);
    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    const devices: ScannerDevice[] = [];
    const seenIds = new Set<string>();

    for (const line of lines) {
      const match = line.match(/^device `(.+?)' is (.+)$/);
      if (!match) {
        continue;
      }

      const formattedId = match[1];
      if (seenIds.has(formattedId)) {
        continue;
      }
      seenIds.add(formattedId);

      const device: ScannerDevice = {
        id: formattedId,
        name: match[2].replace(/^a /i, '').replace(/"$/g, '').replace(/^"/, '').trim(),
        status: 'ready',
        source: 'sane',
      };
      devices.push(device);
    }

    return dedupeLinuxDevices(devices);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      console.warn('scanimage command not found. Install sane-utils to enable scanner support on Linux.');
      return [];
    }
    // scanimage returns exit code 1 when no scanners are found
    if (typeof error?.stdout === 'string' && error.stdout.includes('No scanners were identified')) {
      return [];
    }
    throw error;
  }
}

function dedupeLinuxDevices(devices: ScannerDevice[]): ScannerDevice[] {
  const bySignature = new Map<string, { device: ScannerDevice; score: number }>();

  const scoreDevice = (device: ScannerDevice): number => {
    let score = 0;
    const idLower = device.id.toLowerCase();
    const nameLower = device.name.toLowerCase();
    if (idLower.includes('usb') || nameLower.includes('usb')) {
      score += 2;
    }
    if (idLower.includes(':net')) {
      score -= 5;
    }
    if (idLower.includes('airscan') || idLower.includes('escl')) {
      score += 1;
    }
    return score;
  };

  const sanitizeTokens = (value: string): string[] => {
    const ignored = new Set(['usb', 'scanner', 'device', 'airscan', 'escl']);
    const tokens = value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    return tokens.filter((token) => !ignored.has(token));
  };

  for (const device of devices) {
    const vendorPrefix = device.id.split(':')[0]?.toLowerCase() ?? '';
    const normalized = device.name.toLowerCase().replace(/\s+/g, ' ').trim();
    const score = scoreDevice(device);
    const modelMatch = device.name.match(/([A-Za-z]{2,})[\s-]?(\d{2,4})/);
    const modelKey = modelMatch ? `${modelMatch[1]}${modelMatch[2]}`.toLowerCase() : '';
    const tokenKey = sanitizeTokens(normalized).join('-');
    const signature = `${vendorPrefix}|${modelKey || tokenKey || normalized || device.id.toLowerCase()}`;

    const existing = bySignature.get(signature);
    if (!existing || score > existing.score) {
      bySignature.set(signature, { device, score });
    }
  }

  return Array.from(bySignature.values()).map((entry) => entry.device);
}

async function runWiaScan(scannerId: string, formatId: string): Promise<Buffer> {
  const safeScannerId = scannerId.replace(/'/g, "''");
  const safeFormatId = formatId.replace(/'/g, "''");
  const script = `
$ErrorActionPreference = 'Stop'
$deviceId = '${safeScannerId}'
$manager = New-Object -ComObject 'WIA.DeviceManager'
$deviceInfo = $manager.DeviceInfos | Where-Object { $_.DeviceID -eq $deviceId }
if (-not $deviceInfo) {
  Write-Error "Scanner with id '$deviceId' not found."
  exit 2
}
$device = $deviceInfo.Connect()
$item = $device.Items[1]
$format = '${safeFormatId}'
$image = $item.Transfer($format)
[Console]::Out.Write([System.Convert]::ToBase64String([System.Byte[]]$image.FileData.BinaryData))
`.trim();

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { maxBuffer: 50 * 1024 * 1024 },
    );
    const base64 = stdout.replace(/[\r\n]+/g, '').trim();
    if (!base64) {
      throw new Error('Scanner returned empty data.');
    }
    return Buffer.from(base64, 'base64');
  } catch (error: any) {
    const stderr: string = error?.stderr ?? '';
    const stdout: string = error?.stdout ?? '';
    const combined = `${stderr}\n${stdout}`.toLowerCase();
    if (combined.includes('no documents left in the document feeder')) {
      throw new NoMorePagesError('No documents left in the document feeder.');
    }
    throw error;
  }
}

async function scanWithWiaFormats(scannerId: string, basePath: string): Promise<string | null> {
  for (const format of WIA_OUTPUT_FORMATS) {
    try {
      const buffer = await runWiaScan(scannerId, format.id);
      const detectedFormat = detectImageFormat(buffer, `${basePath}${format.extension}`);
      let outputBuffer = buffer;
      let extension = format.extension;
      if (detectedFormat === 'bmp') {
        outputBuffer = convertBmpBufferToPng(buffer);
        extension = '.png';
      } else if (detectedFormat === 'png') {
        extension = '.png';
      } else if (detectedFormat === 'jpeg') {
        extension = '.jpg';
      } else {
        continue;
      }
      const targetPath = `${basePath}${extension}`;
      await fs.writeFile(targetPath, outputBuffer);
      return targetPath;
    } catch (error) {
      if (error instanceof NoMorePagesError) {
        throw error;
      }
      // try next format
    }
  }
  return null;
}

async function promptForNextPage(): Promise<boolean> {
  const result = await dialog.showMessageBox({
    type: 'question',
    message: 'Scan another page?',
    detail: 'Place the next page in the scanner, then choose “Scan next page” to continue or “Finish” to create the document.',
    buttons: ['Scan next page', 'Finish'],
    defaultId: 0,
    cancelId: 1,
  });

  return result.response === 0;
}

async function captureSinglePage(scannerId: string, outputDirectory: string, baseFileName: string): Promise<string> {
  if (process.platform === 'win32') {
    const basePath = path.join(outputDirectory, baseFileName);
    const pathResult = await scanWithWiaFormats(scannerId, basePath);
    if (!pathResult) {
      throw new Error('Scanner did not produce a page.');
    }
    return pathResult;
  }

  if (process.platform === 'linux') {
    const outputPath = path.join(outputDirectory, `${baseFileName}.png`);
    await execFileAsync('scanimage', [
      '--device-name',
      scannerId,
      '--format=png',
      `--output-file=${outputPath}`,
    ]);
    return outputPath;
  }

  throw new Error('Scanning is not supported on this platform yet.');
}

async function capturePages(session: ScanSession, options: { allowMultiple: boolean }): Promise<SessionPage[]> {
  if (process.platform === 'win32') {
    return capturePagesWithWia(session, options.allowMultiple);
  }

  if (process.platform === 'linux') {
    return capturePagesWithSane(session, options.allowMultiple);
  }

  throw new Error('Scanning is not supported on this platform yet.');
}

async function capturePagesWithWia(session: ScanSession, allowMultiple: boolean): Promise<SessionPage[]> {
  const newPages: SessionPage[] = [];

  while (true) {
    const pageNumber = session.pages.length + newPages.length + 1;
    const basePath = path.join(session.tempDir, `${session.baseFileName}-page-${String(pageNumber).padStart(2, '0')}`);
    let outputPath: string | null = null;
    try {
      outputPath = await scanWithWiaFormats(session.scannerId, basePath);
    } catch (error) {
      if (error instanceof NoMorePagesError) {
        break;
      }
      throw error;
    }

    if (!outputPath || !(await fileExists(outputPath))) {
      break;
    }

    newPages.push({
      id: randomUUID(),
      fileName: path.basename(outputPath),
      absolutePath: outputPath,
      createdAt: new Date(),
    });

    if (!allowMultiple) {
      break;
    }

    const shouldContinue = await promptForNextPage();
    if (!shouldContinue) {
      break;
    }
  }

  return newPages;
}

async function capturePagesWithSane(session: ScanSession, allowMultiple: boolean): Promise<SessionPage[]> {
  const newPages: SessionPage[] = [];

  while (true) {
    const pageNumber = session.pages.length + newPages.length + 1;
    const fileName = `${session.baseFileName}-page-${String(pageNumber).padStart(2, '0')}.png`;
    const outputPath = path.join(session.tempDir, fileName);

    await execFileAsync('scanimage', [
      '--device-name',
      session.scannerId,
      '--format=png',
      `--output-file=${outputPath}`,
    ]);

    newPages.push({
      id: randomUUID(),
      fileName,
      absolutePath: outputPath,
      createdAt: new Date(),
    });

    if (!allowMultiple) {
      break;
    }

    const shouldContinue = await promptForNextPage();
    if (!shouldContinue) {
      break;
    }
  }

  return newPages;
}

async function createPdfFromImages(pages: SessionPage[], targetPath: string, rotations: Record<string, number> = {}): Promise<void> {
  if (pages.length === 0) {
    throw new Error('No pages were provided for PDF generation.');
  }

  const pdfDoc = await PDFDocument.create();

  for (const page of pages) {
    const file = await fs.readFile(page.absolutePath);
    if (file.length < 10) {
      console.warn(`Skipping scanned page ${page.fileName}: file is empty or corrupted.`);
      continue;
    }

    const format = detectImageFormat(file, page.fileName);
    const extension = path.extname(page.fileName).toLowerCase();
    let image;
    try {
      if (format === 'png') {
        image = await pdfDoc.embedPng(file);
      } else if (format === 'jpeg' || extension === '.jpg' || extension === '.jpeg') {
        image = await pdfDoc.embedJpg(file);
      } else if (format === 'bmp') {
        const pngBuffer = convertBmpBufferToPng(file);
        image = await pdfDoc.embedPng(pngBuffer);
      } else {
        console.warn(`Skipping scanned page ${page.fileName}: unsupported image format.`);
        continue;
      }
    } catch (error) {
      console.error(`Failed to embed image ${page.fileName}.`, error);
      continue;
    }

    const userRotation = normalizeRotation(rotations[page.id] ?? 0);
    const pdfRotation = normalizeRotation(360 - userRotation);
    const needsSwap = pdfRotation % 180 !== 0;
    const pageWidth = needsSwap ? image.height : image.width;
    const pageHeight = needsSwap ? image.width : image.height;
    const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

    let x = 0;
    let y = 0;

    if (pdfRotation === 90) {
      x = image.height;
    } else if (pdfRotation === 180) {
      x = image.width;
      y = image.height;
    } else if (pdfRotation === 270) {
      y = image.width;
    }

    pdfPage.drawImage(image, {
      x,
      y,
      width: image.width,
      height: image.height,
      rotate: degrees(pdfRotation),
    });
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(targetPath, pdfBytes);
}

function normalizeRotation(value: number): number {
  const normalized = Math.round(value / 90) * 90;
  return ((normalized % 360) + 360) % 360;
}

function ensurePdfExtension(fileName: string): string {
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return `${fileName}.pdf`;
  }
  return fileName;
}

async function cleanupSession(sessionId: string, session?: ScanSession): Promise<void> {
  const targetSession = session ?? sessions.get(sessionId);
  if (!targetSession) {
    return;
  }

  try {
    await fs.rm(targetSession.tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to clean up scan session directory at ${targetSession.tempDir}`, error);
  }

  sessions.delete(targetSession.id);
}

function detectImageFormat(buffer: Buffer, fileName: string): 'png' | 'jpeg' | 'bmp' | 'unknown' {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'bmp';
  }
  console.warn(`Unknown image signature for scanned page ${fileName}`);
  return 'unknown';
}

function convertBmpBufferToPng(buffer: Buffer): Buffer {
  if (buffer.length < 54 || buffer[0] !== 0x42 || buffer[1] !== 0x4d) {
    throw new Error('Buffer is not a BMP image.');
  }

  const pixelOffset = buffer.readUInt32LE(10);
  const dibHeaderSize = buffer.readUInt32LE(14);
  if (dibHeaderSize < 40) {
    throw new Error('Unsupported BMP DIB header.');
  }

  const rawWidth = buffer.readInt32LE(18);
  const rawHeight = buffer.readInt32LE(22);
  const width = Math.abs(rawWidth);
  const height = Math.abs(rawHeight);
  const planes = buffer.readUInt16LE(26);
  const bitsPerPixel = buffer.readUInt16LE(28);

  if (planes !== 1 || ![8, 24, 32].includes(bitsPerPixel)) {
    throw new Error(`Unsupported BMP format: ${bitsPerPixel} bits per pixel.`);
  }

  const paletteOffset = 14 + dibHeaderSize;
  let palette: Array<{ r: number; g: number; b: number }> | null = null;

  if (bitsPerPixel === 8) {
    const paletteEntriesRaw = buffer.readUInt32LE(46) || 256;
    const paletteEntries = Math.min(256, Math.max(1, paletteEntriesRaw));
    palette = [];
    for (let i = 0; i < paletteEntries; i++) {
      const entryOffset = paletteOffset + i * 4;
      if (entryOffset + 3 >= buffer.length || entryOffset >= pixelOffset) {
        break;
      }
      palette.push({
        b: buffer[entryOffset] ?? 0,
        g: buffer[entryOffset + 1] ?? 0,
        r: buffer[entryOffset + 2] ?? 0,
      });
    }
  }

  const rowSize = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    const srcRow = rawHeight > 0 ? height - 1 - y : y;
    const srcOffset = pixelOffset + srcRow * rowSize;
    for (let x = 0; x < width; x++) {
      const dstIndex = (y * width + x) * 4;
      if (bitsPerPixel === 8 && palette) {
        const index = buffer[srcOffset + x] ?? 0;
        const paletteEntry = palette[index] ?? { r: 0, g: 0, b: 0 };
        png.data[dstIndex] = paletteEntry.r;
        png.data[dstIndex + 1] = paletteEntry.g;
        png.data[dstIndex + 2] = paletteEntry.b;
        png.data[dstIndex + 3] = 255;
      } else {
        const bytesPerPixel = bitsPerPixel / 8;
        const srcIndex = srcOffset + x * bytesPerPixel;
        png.data[dstIndex] = buffer[srcIndex + 2] ?? 0;
        png.data[dstIndex + 1] = buffer[srcIndex + 1] ?? 0;
        png.data[dstIndex + 2] = buffer[srcIndex] ?? 0;
        png.data[dstIndex + 3] = bytesPerPixel === 4 ? buffer[srcIndex + 3] ?? 255 : 255;
      }
    }
  }

  return PNG.sync.write(png);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}