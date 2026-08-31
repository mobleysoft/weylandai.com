#!/usr/bin/env node
/**
 * weyland-storage-service — self-hosted, flat-cost replacement for R2.
 *
 * Runs on this Mac, reached via the existing mascom-v5 cloudflared tunnel
 * (new ingress rule added for this service) instead of any metered cloud
 * storage product. No R2, per explicit instruction (2026-08-31) after a
 * real prior cost incident with it.
 *
 * Files are encrypted at rest (AES-256-GCM, Node's built-in crypto - not
 * home-rolled) under a key read from the environment, never hardcoded.
 * Already quantum-resistant as used here: the key is generated locally
 * with real entropy and never transmitted, so there's no key-exchange step
 * for Shor's algorithm to attack, and Grover's algorithm only reduces
 * AES-256 to ~128-bit effective security - still the standard target
 * security level, and explicitly NIST/NSA-approved as post-quantum-safe.
 *
 * Auth is real ICHM v2 tokens (Ed25519, see /Users/johnmobley/holocrypt/v2/ichm.js) -
 * not a static shared secret. This service holds only the ISSUER'S PUBLIC
 * key and verifies; it can never mint a token, so compromising this
 * service alone doesn't let an attacker forge access. The caller
 * (weylandai-com-worker) holds the private key and mints short-lived,
 * permission-scoped tokens per operation.
 *
 * API shape deliberately mirrors R2's bucket.put(key)/get(key) semantics
 * so the Worker-side integration is a small, obvious swap.
 */

import { createServer } from 'node:http';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { verifyToken } from '/Users/johnmobley/holocrypt/v2/ichm.js';

const PORT = process.env.PORT || 7705;
const STORAGE_ROOT = process.env.STORAGE_ROOT || '/Users/johnmobley/.weyland_storage';
const ISSUER_PUBLIC_KEY_PEM = process.env.WEYLAND_STORAGE_ISSUER_PUBLIC_KEY;
const ENCRYPTION_KEY = process.env.WEYLAND_STORAGE_KEY; // 32 bytes, hex-encoded

if (!ISSUER_PUBLIC_KEY_PEM) throw new Error('WEYLAND_STORAGE_ISSUER_PUBLIC_KEY not set - refusing to start unauthenticated on a public tunnel');
if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
  throw new Error('WEYLAND_STORAGE_KEY must be a 32-byte hex string (64 hex chars)');
}
const key = Buffer.from(ENCRYPTION_KEY, 'hex');

function sanitizeKey(rawKey) {
  // Prevent path traversal - the object key becomes a filename, nothing else.
  const cleaned = rawKey.replace(/^\/+/, '');
  if (cleaned.includes('..') || cleaned.includes('\0')) {
    throw new Error('invalid key');
  }
  return cleaned;
}

function filePathFor(objectKey) {
  return path.join(STORAGE_ROOT, sanitizeKey(objectKey));
}

function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Stored format: [12-byte iv][16-byte authTag][ciphertext]
  return Buffer.concat([iv, authTag, ciphertext]);
}

function decrypt(stored) {
  const iv = stored.subarray(0, 12);
  const authTag = stored.subarray(12, 28);
  const ciphertext = stored.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function checkAuth(req, requiredPermission) {
  const header = req.headers['authorization'] || '';
  const tokenJson = header.replace(/^Bearer\s+/i, '');
  let token;
  try {
    token = JSON.parse(Buffer.from(tokenJson, 'base64').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed_token' };
  }
  const result = verifyToken({ publicKeyPem: ISSUER_PUBLIC_KEY_PEM, token });
  if (!result.valid) return { ok: false, reason: result.reason };
  if (!result.permissions.includes(requiredPermission)) {
    return { ok: false, reason: 'missing_permission' };
  }
  return { ok: true };
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const REQUIRED_PERMISSION = {
  GET: 'storage:read',
  PUT: 'storage:write',
  DELETE: 'storage:write',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    const auth = checkAuth(req, 'storage:read');
    if (!auth.ok) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized', reason: auth.reason }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'weyland-storage-service' }));
    return;
  }

  const match = url.pathname.match(/^\/objects\/(.+)$/);
  if (!match) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  const requiredPermission = REQUIRED_PERMISSION[req.method];
  const auth = checkAuth(req, requiredPermission);
  if (!auth.ok) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized', reason: auth.reason }));
    return;
  }

  const objectKey = decodeURIComponent(match[1]);

  try {
    if (req.method === 'PUT') {
      const body = await readRequestBody(req);
      const filePath = filePathFor(objectKey);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, encrypt(body));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, key: objectKey, size: body.length }));
      return;
    }

    if (req.method === 'GET') {
      const filePath = filePathFor(objectKey);
      if (!existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not found' }));
        return;
      }
      const stored = await readFile(filePath);
      const plaintext = decrypt(stored);
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(plaintext);
      return;
    }

    if (req.method === 'DELETE') {
      const filePath = filePathFor(objectKey);
      if (existsSync(filePath)) await unlink(filePath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'method not allowed' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`weyland-storage-service listening on 127.0.0.1:${PORT}, root=${STORAGE_ROOT}`);
});
