const encoder = new TextEncoder();
const rounds = 100000;

function hex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function digest(value) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

async function verifier(password, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/../g), byte => parseInt(byte, 16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: rounds, hash: 'SHA-256' }, key, 256);
  return ['pbkdf2-sha256', rounds, saltHex, hex(new Uint8Array(bits))].join('$');
}

function equalHash(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

export async function matchingOwner(db, password) {
  const { results } = await db.prepare('SELECT key_hash FROM cms_access WHERE expires_at IS NULL').all();
  for (const { key_hash: stored } of results) {
    if (/^[0-9a-f]{64}$/.test(stored)) {
      // The original machine-generated key was stored with SHA-256.
      if (equalHash(await digest(password.trim()), stored)) return stored;
    } else {
      const parts = stored.split('$');
      if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256' || parts[1] !== String(rounds) ||
          !/^[0-9a-f]{32}$/.test(parts[2]) || !/^[0-9a-f]{64}$/.test(parts[3])) continue;
      if (equalHash(await verifier(password, parts[2]), stored)) return stored;
    }
  }
  return null;
}

export async function reserveAttempt(db, request) {
  const window = Math.floor(Date.now() / 600000);
  const bucket = await digest(window + '/' + (request.headers.get('CF-Connecting-IP') || 'unknown'));
  const result = await db.prepare(`INSERT INTO cms_auth_attempts (bucket, attempts, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 WHERE attempts < 10`)
    .bind(bucket, (window + 1) * 600).run();
  return result.meta.changes ? bucket : null;
}

export async function issueSession(db, owner, bucket) {
  const session = hex(crypto.getRandomValues(new Uint8Array(32)));
  const key = await digest(session);
  // A concurrent password change must prevent a login verified against the old password.
  const [created] = await db.batch([
    db.prepare(`INSERT INTO cms_access (key_hash, expires_at) SELECT ?, unixepoch() + 28800
      FROM cms_access WHERE key_hash = ? AND expires_at IS NULL`).bind(key, owner),
    db.prepare('DELETE FROM cms_auth_attempts WHERE bucket = ? AND EXISTS (SELECT 1 FROM cms_access WHERE key_hash = ?)')
      .bind(bucket, key),
  ]);
  return created.meta.changes ? session : null;
}

export async function rotatePassword(db, owner, sessionHash, password, bucket) {
  const fresh = await verifier(password, hex(crypto.getRandomValues(new Uint8Array(16))));
  // The fresh salted verifier only exists if this compare-and-swap succeeded.
  // Keep session revocation and password replacement in the same D1 transaction.
  const [updated] = await db.batch([
    db.prepare(`UPDATE cms_access SET key_hash = ? WHERE key_hash = ? AND expires_at IS NULL
      AND EXISTS (SELECT 1 FROM cms_access WHERE key_hash = ? AND expires_at > unixepoch())`)
      .bind(fresh, owner, sessionHash),
    db.prepare(`DELETE FROM cms_access WHERE expires_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM cms_access WHERE key_hash = ? AND expires_at IS NULL)`).bind(fresh),
    db.prepare('DELETE FROM cms_auth_attempts WHERE bucket = ? AND EXISTS (SELECT 1 FROM cms_access WHERE key_hash = ?)')
      .bind(bucket, fresh),
  ]);
  return updated.meta.changes === 1;
}
