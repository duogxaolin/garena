import { createHash, createCipheriv } from 'node:crypto';

/**
 * Encrypt password using Garena SSO algorithm.
 *
 * Replicates the CryptoJS logic from LoginView-855c93ca9.js:
 *   S = CryptoJS.MD5(password)
 *   h = CryptoJS.SHA256(CryptoJS.SHA256(S + v1) + v2)
 *   Y = CryptoJS.AES.encrypt(S, h, { mode: ECB, padding: NoPadding }).toString(Hex)
 *
 * @param password - Plaintext password
 * @param v1 - Challenge value from prelogin response
 * @param v2 - Challenge value from prelogin response
 * @returns 32-character lowercase hex string (encrypted password)
 */
export function encryptPassword(password: string, v1: string, v2: string): string {
  // Step 1: MD5(password) → 32 char lowercase hex string
  const md5hex = createHash('md5').update(password).digest('hex');

  // Step 2: SHA256(SHA256(md5hex + v1) + v2)
  // CryptoJS WordArray.toString() defaults to lowercase hex,
  // so string concatenation in JS matches our hex string concat here.
  const inner = createHash('sha256').update(md5hex + v1).digest('hex');
  const keyBytes = createHash('sha256').update(inner + v2).digest();

  // Step 3: AES-256-ECB encrypt MD5 raw bytes with SHA256 key, no padding
  // Plaintext = MD5 raw bytes (16 bytes = exactly 1 AES block)
  // Key = SHA256 raw bytes (32 bytes = AES-256 key)
  const md5bytes = Buffer.from(md5hex, 'hex');
  const cipher = createCipheriv('aes-256-ecb', keyBytes, null);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(md5bytes), cipher.final()]);

  return encrypted.toString('hex');
}

