## Context

Garena SSO login at `sso.garena.com` uses a challenge-response password encryption scheme. The browser client (Vue SPA) calls two GET endpoints sequentially: `/api/prelogin` returns challenge values (`v1`, `v2`), then the client encrypts the password using CryptoJS and sends it to `/api/login`. This module replicates that flow in Node.js.

Source of truth: `LoginView-855c93ca9.js` (decompiled from HAR capture).

## Goals / Non-Goals

**Goals:**
- Replicate the exact SSO login flow as observed in the browser
- Provide a clean async API: `login(account, password, options?) → session`
- Use Node.js native `crypto` module (no CryptoJS dependency needed — MD5, SHA256, AES are all available natively)
- Handle known error responses gracefully

**Non-Goals:**
- Captcha solving (Shopee slider, reCAPTCHA v2, Garena image captcha) — deferred to future change
- DataDome bypass — the module will set appropriate headers but won't solve JS challenges
- OAuth token grant (`/oauth/token/grant`) — separate flow, out of scope
- Account management operations (password change, mobile binding — uses RSA, different flow)
- Session refresh or cookie management

## Decisions

### 1. Node.js native `crypto` over CryptoJS

**Choice**: Use `node:crypto` for MD5, SHA256, and AES-256-ECB.

**Rationale**: CryptoJS operates on WordArray objects. When the browser code does `g.MD5(password)` it returns a WordArray, and `S + r.v1` implicitly calls `.toString()` which produces lowercase hex. Node.js `crypto` can replicate this exactly:
- `crypto.createHash('md5').update(password).digest('hex')` → same 32 hex chars
- SHA256 same pattern
- `crypto.createCipheriv('aes-256-ecb', keyBuffer, null)` for AES-ECB with no padding

**Alternative considered**: Using `crypto-js` npm package directly — rejected because it adds a 400KB dependency for operations Node.js handles natively.

### 2. HTTP client: axios

**Choice**: Use `axios` for HTTP requests.

**Rationale**: The original SSO client uses axios. Using the same library simplifies header matching and response handling. The HAR shows requests go through an axios interceptor (`antibot` instance) that handles DataDome responses.

**Alternative considered**: Native `fetch` — viable but axios provides better interceptor support for future DataDome handling.

### 3. GET requests (not POST)

**Choice**: Both prelogin and login use GET with query parameters.

**Rationale**: This matches the observed HAR behavior exactly. The original code uses `axios.get("/prelogin", {params: A})` and `axios.get("/login", {params: A})`. Password is already encrypted so GET is acceptable.

### 4. Module structure

```
src/
  garena-login.ts       — Main login function (public API)
  encrypt-password.ts   — Password encryption (MD5 → SHA256 → AES-ECB)
  types.ts              — TypeScript interfaces
```

Minimal flat structure. No unnecessary abstractions.

### 5. Password encryption algorithm (exact replication)

From `LoginView-855c93ca9.js` function `$`:
```javascript
const S = g.MD5(l.password);                        // CryptoJS WordArray
const h = g.SHA256(g.SHA256(S + r.v1) + r.v2);     // S.toString() = hex
const Y = g.AES.encrypt(S, h, {
    mode: g.mode.ECB,
    padding: g.pad.NoPadding
}).toString(g.format.Hex);
```

Node.js equivalent:
1. `md5hex = MD5(password)` → 32 char hex string
2. `inner = SHA256(md5hex + v1)` → 64 char hex string
3. `key = SHA256(inner + v2)` → 32 bytes (used as AES-256 key)
4. `encrypted = AES-256-ECB(md5_bytes, key_bytes, no_padding)` → 16 bytes → 32 hex chars

Key insight: CryptoJS `.toString()` defaults to hex. When `S + r.v1` is evaluated, `S` (WordArray) is coerced to hex string via `.toString()`. The SHA256 calls also produce WordArrays, but the final AES encrypt takes WordArrays directly as plaintext and key.

For AES: plaintext is the MD5 WordArray (16 bytes = exactly 1 AES block), key is SHA256 WordArray (32 bytes = AES-256). NoPadding works because 16 bytes = 1 block.

## Risks / Trade-offs

- **[DataDome blocking]** → Mitigation: Set realistic User-Agent and Referer headers. Accept that automated requests may be blocked; captcha handling is a future change.
- **[API changes]** → Mitigation: The encryption algorithm is tied to the JS bundle hash (`login-577243d3e.js`). If Garena updates the bundle, the algorithm may change. Module should fail clearly when prelogin response format changes.
- **[Rate limiting]** → Mitigation: Expose error codes so callers can implement backoff. The `error_security_ban` response includes a countdown timer.
- **[CryptoJS WordArray vs Buffer semantics]** → Mitigation: Carefully verify that hex string concatenation in Node.js matches CryptoJS implicit `.toString()` behavior. Unit test with known input/output from HAR.

