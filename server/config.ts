import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseFile: string;
  databaseUrl: string;
  businessStorePath: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  defaultAdminPassword: string;
  backupDir: string;
  logFile: string;
}

export const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseFile: process.env.DATABASE_FILE || path.resolve(process.cwd(), 'data', 'app.sqlite'),
  databaseUrl: process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL is required in production'); })(),
  businessStorePath: process.env.BUSINESS_STORE_PATH || path.resolve(process.cwd(), 'data', 'db.json'),
  jwtSecret: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET is required in production'); })(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || (() => { throw new Error('DEFAULT_ADMIN_PASSWORD is required in production'); })(),
  backupDir: process.env.BACKUP_DIR || path.resolve(process.cwd(), 'backups'),
  logFile: process.env.LOG_FILE || path.resolve(process.cwd(), 'logs', 'app.log')
};
