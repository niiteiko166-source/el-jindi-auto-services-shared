import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadJsonFile, saveJsonFileAtomically } from '../server/persistence';

test('recovers from a corrupted latest file using the backup copy', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eljindi-persist-'));
  const filePath = path.join(tmpDir, 'state.json');
  const backupDir = path.join(tmpDir, 'backups');

  saveJsonFileAtomically(filePath, { version: 1 }, backupDir);
  saveJsonFileAtomically(filePath, { version: 2 }, backupDir);

  fs.writeFileSync(filePath, '{not valid json', 'utf8');

  const recovered = loadJsonFile(filePath, { version: 0 }, backupDir);
  assert.equal(recovered.version, 2);
});
