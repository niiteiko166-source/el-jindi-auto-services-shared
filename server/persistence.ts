import fs from 'fs';
import path from 'path';

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function saveJsonFileAtomically(filePath: string, data: unknown, backupDir?: string) {
  ensureDir(path.dirname(filePath));
  const serialized = JSON.stringify(data, null, 2);
  const tempPath = `${filePath}.tmp`;

  try {
    fs.writeFileSync(tempPath, serialized, 'utf8');
    fs.renameSync(tempPath, filePath);

    if (backupDir) {
      ensureDir(backupDir);
      const backupPath = path.join(backupDir, `${path.basename(filePath)}.${Date.now()}.bak`);
      fs.copyFileSync(filePath, backupPath);
    }
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}

export function loadJsonFile<T>(filePath: string, fallback: T, backupDir?: string): T {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if (backupDir) {
      const backups = fs.existsSync(backupDir)
        ? fs.readdirSync(backupDir)
            .filter((name) => name.startsWith(path.basename(filePath)))
            .sort()
            .map((name) => path.join(backupDir, name))
        : [];

      for (const backupPath of backups.reverse()) {
        try {
          const backupRaw = fs.readFileSync(backupPath, 'utf8');
          return JSON.parse(backupRaw) as T;
        } catch {
          // Try next backup
        }
      }
    }

    return fallback;
  }
}
