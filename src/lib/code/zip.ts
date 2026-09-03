import { deflateRawSync, inflateRawSync } from 'node:zlib';

const MAX_ENTRIES = 900;
const MAX_ENTRY_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

const ignoredSegments = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.cache',
  '__pycache__',
  '.turbo',
]);

const textExtensions = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.mdx', '.txt',
  '.css', '.scss', '.sass', '.less', '.html', '.htm', '.xml', '.svg', '.yml', '.yaml',
  '.toml', '.ini', '.conf', '.config', '.py', '.rb', '.php', '.java', '.kt', '.kts', '.go',
  '.rs', '.c', '.h', '.cpp', '.hpp', '.cs', '.swift', '.sql', '.prisma', '.graphql', '.gql',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd', '.dockerfile', '.vue', '.svelte',
]);

const importantNames = new Set([
  'dockerfile',
  'makefile',
  'procfile',
  'readme',
  'license',
  'package.json',
  'tsconfig.json',
  'jsconfig.json',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'vite.config.js',
  'vite.config.ts',
  'requirements.txt',
  'pyproject.toml',
  'composer.json',
  'gemfile',
  'cargo.toml',
  'go.mod',
]);

export type ParsedSourceFile = {
  path: string;
  data: Buffer;
  text: boolean;
};

export type ParsedSourceArchive = {
  files: Map<string, ParsedSourceFile>;
  warnings: string[];
  extractedBytes: number;
};

function extname(path: string) {
  const name = path.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

export function normalizeSourcePath(raw: string) {
  const normalized = raw.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/{2,}/g, '/');

  if (!normalized || normalized.includes('\0')) return null;
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) return null;

  const parts = normalized.split('/').filter(Boolean);
  if (!parts.length || parts.some((part) => part === '..')) return null;

  return parts.join('/');
}

export function isSensitiveSourcePath(path: string) {
  const normalized = path.toLowerCase();
  const base = normalized.split('/').pop() ?? normalized;

  if (base === '.env' || base.startsWith('.env.')) return true;
  if (base === '.npmrc' || base === '.pypirc') return true;
  if (base === 'id_rsa' || base === 'id_ed25519') return true;
  if (base.endsWith('.pem') || base.endsWith('.key') || base.endsWith('.p12') || base.endsWith('.pfx')) return true;

  return false;
}

export function isIgnoredSourcePath(path: string) {
  const parts = path.toLowerCase().split('/');
  return parts.some((part) => ignoredSegments.has(part));
}

export function isProbablyTextPath(path: string, data?: Buffer) {
  const lower = path.toLowerCase();
  const base = lower.split('/').pop() ?? lower;
  const ext = extname(lower);

  if (importantNames.has(base) || textExtensions.has(ext)) return true;
  if (!data) return false;

  const sample = data.subarray(0, Math.min(data.length, 4096));
  if (sample.includes(0)) return false;

  let control = 0;
  for (const byte of sample) {
    if (byte < 9 || (byte > 13 && byte < 32)) control++;
  }

  return sample.length === 0 || control / sample.length < 0.04;
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const signature = 0x06054b50;
  const minimum = Math.max(0, buffer.length - 65_557);

  for (let offset = buffer.length - 22; offset >= minimum; offset--) {
    if (buffer.readUInt32LE(offset) === signature) return offset;
  }

  return -1;
}

export function parseSourceZip(buffer: Buffer): ParsedSourceArchive {
  if (buffer.length < 22) throw new Error('ZIP archive is too small or invalid.');

  const eocd = findEndOfCentralDirectory(buffer);
  if (eocd < 0) throw new Error('ZIP central directory was not found.');

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);

  if (entryCount > MAX_ENTRIES) {
    throw new Error(`ZIP contains too many entries. Maximum is ${MAX_ENTRIES}.`);
  }

  const files = new Map<string, ParsedSourceFile>();
  const warnings: string[] = [];
  let extractedBytes = 0;
  let cursor = centralOffset;

  for (let index = 0; index < entryCount; index++) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('ZIP central directory is malformed.');
    }

    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const rawName = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    cursor += 46 + nameLength + extraLength + commentLength;

    if (flags & 0x1) throw new Error('Encrypted ZIP entries are not supported.');
    if (rawName.endsWith('/')) continue;

    const path = normalizeSourcePath(rawName);
    if (!path) throw new Error(`Unsafe ZIP path rejected: ${rawName}`);

    if (isSensitiveSourcePath(path)) {
      warnings.push(`Skipped sensitive file: ${path}`);
      continue;
    }

    if (isIgnoredSourcePath(path)) {
      warnings.push(`Skipped generated/dependency path: ${path}`);
      continue;
    }

    if (uncompressedSize > MAX_ENTRY_BYTES) {
      warnings.push(`Skipped oversized file: ${path}`);
      continue;
    }

    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`ZIP local header is invalid for ${path}.`);
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > buffer.length) throw new Error(`ZIP data is truncated for ${path}.`);

    const compressed = buffer.subarray(dataStart, dataEnd);
    let data: Buffer;

    if (method === 0) {
      data = Buffer.from(compressed);
    } else if (method === 8) {
      data = inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_BYTES });
    } else {
      warnings.push(`Skipped unsupported compression method for ${path}.`);
      continue;
    }

    if (data.length > MAX_ENTRY_BYTES) {
      warnings.push(`Skipped oversized extracted file: ${path}`);
      continue;
    }

    extractedBytes += data.length;
    if (extractedBytes > MAX_TOTAL_BYTES) {
      throw new Error('Extracted project is too large. Remove generated files and dependencies, then upload again.');
    }

    files.set(path, {
      path,
      data,
      text: isProbablyTextPath(path, data),
    });
  }

  if (!files.size) throw new Error('No safe project files were found in this ZIP.');

  return { files, warnings: warnings.slice(0, 80), extractedBytes };
}

function crc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = crc32Table();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (year - 1980) << 9 | (date.getMonth() + 1) << 5 | date.getDate();
  return { time, day };
}

export function createSourceZip(files: Map<string, ParsedSourceFile>) {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;
  const stamp = dosDateTime();

  for (const file of files.values()) {
    const path = normalizeSourcePath(file.path);
    if (!path || isSensitiveSourcePath(path) || isIgnoredSourcePath(path)) continue;

    const name = Buffer.from(path, 'utf8');
    const source = Buffer.from(file.data);
    const compressed = source.length > 64 ? deflateRawSync(source, { level: 6 }) : source;
    const method = source.length > 64 ? 8 : 0;
    const crc = crc32(source);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(source.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    localChunks.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(stamp.time, 12);
    central.writeUInt16LE(stamp.day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(source.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralChunks.push(central, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralChunks);
  const localData = Buffer.concat(localChunks);
  const count = centralChunks.length / 2;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localData.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localData, centralDirectory, end]);
}

export function detectSourceProject(files: Map<string, ParsedSourceFile>) {
  const paths = new Set([...files.keys()].map((path) => path.toLowerCase()));
  const packageFile = [...files.values()].find((file) => file.path.toLowerCase() === 'package.json');
  let packageJson: Record<string, unknown> | null = null;

  if (packageFile?.text) {
    try {
      packageJson = JSON.parse(packageFile.data.toString('utf8')) as Record<string, unknown>;
    } catch {}
  }

  const dependencies = {
    ...((packageJson?.dependencies as Record<string, string> | undefined) ?? {}),
    ...((packageJson?.devDependencies as Record<string, string> | undefined) ?? {}),
  };

  let framework = 'Unknown project';
  if ('next' in dependencies || [...paths].some((path) => path.startsWith('app/') || path.startsWith('src/app/'))) framework = 'Next.js';
  else if ('react' in dependencies) framework = 'React';
  else if ('vue' in dependencies) framework = 'Vue';
  else if ('svelte' in dependencies || '@sveltejs/kit' in dependencies) framework = 'Svelte';
  else if (paths.has('pyproject.toml') || paths.has('requirements.txt')) framework = 'Python';
  else if (paths.has('composer.json')) framework = 'PHP / Composer';
  else if (paths.has('cargo.toml')) framework = 'Rust';
  else if (paths.has('go.mod')) framework = 'Go';

  const languages = new Map<string, number>();
  for (const file of files.values()) {
    if (!file.text) continue;
    const ext = extname(file.path) || 'text';
    languages.set(ext, (languages.get(ext) ?? 0) + 1);
  }

  return {
    framework,
    packageName: typeof packageJson?.name === 'string' ? packageJson.name : null,
    fileCount: files.size,
    textFileCount: [...files.values()].filter((file) => file.text).length,
    languages: [...languages.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.replace(/^\./, '') || 'text', count })),
  };
}
