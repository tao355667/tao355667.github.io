import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { digest, issueSession, matchingOwner, rotatePassword } from '../traffic/cms-auth.mjs';

test('rotation revokes all sessions and rejects logins verified against the previous password', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(readFileSync(new URL('../traffic/schema.sql', import.meta.url), 'utf8'));
    function prepare(sql, args = []) {
      const stmt = sqlite.prepare(sql);
      return {
        bind: (...values) => prepare(sql, values),
        all: () => ({ results: stmt.all(...args) }),
        run: () => ({ meta: stmt.run(...args) }),
      };
    }
    const db = {
      prepare,
      batch(statements) {
        sqlite.exec('BEGIN');
        try {
          const results = statements.map(stmt => stmt.run());
          sqlite.exec('COMMIT');
          return results;
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      },
    };
    const firstPassword = 'initial-test-password';
    const oldOwner = await digest(firstPassword);
    sqlite.prepare('INSERT INTO cms_access (key_hash) VALUES (?)').run(oldOwner);
    assert.equal(await matchingOwner(db, firstPassword), oldOwner);
    const session = await issueSession(db, oldOwner, 'first');
    await issueSession(db, oldOwner, 'second');
    const newPassword = ' 保留两端空格 and punctuation! ';
    assert.equal(await rotatePassword(db, oldOwner, await digest(session), newPassword, 'first'), true);
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM cms_access WHERE expires_at IS NOT NULL').get().n, 0);
    assert.equal(await issueSession(db, oldOwner, 'stale login'), null);
    assert.equal(await matchingOwner(db, firstPassword), null);
    assert.equal(await matchingOwner(db, newPassword.trim()), null);
    const newOwner = await matchingOwner(db, newPassword);
    assert.match(newOwner, /^pbkdf2-sha256\$/);
    const fresh = await issueSession(db, newOwner, 'fresh login');
    assert.ok(fresh);
    assert.equal(await rotatePassword(db, oldOwner, await digest(session), 'racing change to old password', 'first'), false);
    assert.equal(await rotatePassword(db, newOwner, await digest(session), 'change with revoked session', 'first'), false);
    assert.ok(sqlite.prepare('SELECT 1 FROM cms_access WHERE key_hash = ?').get(await digest(fresh)));
  } finally {
    sqlite.close();
  }
});
