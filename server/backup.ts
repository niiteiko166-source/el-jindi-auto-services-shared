import fs from 'fs';
import path from 'path';
import { config } from './config';

export function createBackup(sourceFile: string) {
  if (!fs.existsSync(sourceFile)) return null;

  fs.mkdirSync(config.backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(config.backupDir, `backup-${stamp}${path.extname(sourceFile)}`);
  fs.copyFileSync(sourceFile, target);
  return target;
}
