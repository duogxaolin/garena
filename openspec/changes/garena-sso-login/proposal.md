## Why

Garena SSO login is currently only possible through a browser. We need a programmatic Node.js client that can authenticate against `sso.garena.com` and obtain a `session_key`, enabling automation workflows (account management, game integrations, etc.) without a headless browser.

## What Changes

- Add a new Node.js module that implements the Garena SSO login flow:
  - Call `/api/prelogin` to obtain challenge values (`v1`, `v2`)
  - Encrypt password using the discovered algorithm: MD5 → SHA256 double-hash with v1/v2 → AES-256-ECB
  - Call `/api/login` with encrypted password to obtain `session_key`
- Handle DataDome bot protection headers on prelogin requests
- Handle error responses (invalid credentials, security bans, captcha triggers)
- Return session data (session_key, redirect_uri) for downstream use

## Capabilities

### New Capabilities
- `sso-login`: Core SSO login flow — prelogin challenge, password encryption, login request, session extraction
- `password-encryption`: Password encryption algorithm — MD5 + SHA256 double-hash + AES-256-ECB using prelogin v1/v2 values

### Modified Capabilities
<!-- None — this is a greenfield module -->

## Impact

- **New files**: Login client module, password encryption utility, types/interfaces
- **Dependencies**: `crypto-js` (or Node.js native `crypto`), HTTP client (`axios` or `node-fetch`)
- **APIs consumed**: `sso.garena.com/api/prelogin`, `sso.garena.com/api/login`
- **No existing code affected** — this is a new standalone module

