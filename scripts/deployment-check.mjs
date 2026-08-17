import { execSync } from 'node:child_process';
import fs from 'node:fs';

const checks = [
  { name: 'Dependencies installed', cmd: 'npm ls --depth=0 --silent', optional: false },
  { name: 'TypeScript check', cmd: 'npm run lint', optional: false },
  { name: 'Test suite', cmd: 'npm test', optional: false },
  { name: 'Production build', cmd: 'npm run build', optional: false }
];

for (const check of checks) {
  try {
    execSync(check.cmd, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✔ ${check.name}`);
  } catch (error) {
    console.error(`✖ ${check.name}`);
    process.exit(1);
  }
}

if (!fs.existsSync('.env.local') && !fs.existsSync('.env')) {
  console.warn('⚠ No environment file found. Set JWT_SECRET and DEFAULT_ADMIN_PASSWORD before deployment.');
}

console.log('Deployment readiness checks passed.');
