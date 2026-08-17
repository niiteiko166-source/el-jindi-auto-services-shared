import fs from 'fs';
import path from 'path';
import { config } from './config';

export function ensureLogFile() {
  const dir = path.dirname(config.logFile);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(config.logFile)) {
    fs.writeFileSync(config.logFile, '');
  }
}

export function logError(message: string, meta?: Record<string, unknown>) {
  ensureLogFile();
  const line = `[${new Date().toISOString()}] ERROR ${message} ${meta ? JSON.stringify(meta) : ''}`;
  fs.appendFileSync(config.logFile, `${line}\n`);
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  ensureLogFile();
  const line = `[${new Date().toISOString()}] INFO ${message} ${meta ? JSON.stringify(meta) : ''}`;
  fs.appendFileSync(config.logFile, `${line}\n`);
}
