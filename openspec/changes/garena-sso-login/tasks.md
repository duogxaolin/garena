## 1. Project Setup

- [x] 1.1 Create `src/` directory and `src/types.ts` with interfaces: `PreloginResponse`, `LoginResponse`, `LoginOptions`, `LoginResult`, `GarenaLoginError`
- [x] 1.2 Create `tsconfig.json` and `package.json` with TypeScript + axios dependencies

## 2. Password Encryption

- [x] 2.1 Create `src/encrypt-password.ts` — implement `encryptPassword(password: string, v1: string, v2: string): string` using Node.js native `crypto` (MD5 → SHA256 double-hash → AES-256-ECB) ← (verify: output matches HAR value `11eb74fbf741904d72a02629418ca75b` for known inputs)

## 3. SSO Login Client

- [x] 3.1 Create `src/garena-login.ts` — implement `login(account: string, password: string, options?: LoginOptions): Promise<LoginResult>` with prelogin → encrypt → login flow
- [x] 3.2 Implement error handling: parse error responses from prelogin/login, throw `GarenaLoginError` with code and phase
- [x] 3.3 Set correct HTTP headers (Accept, User-Agent, Referer) and timestamp-based `id` parameter ← (verify: request format matches HAR capture exactly)

## 4. Entry Point

- [x] 4.1 Create `src/index.ts` — re-export public API (`login`, `encryptPassword`, types) ← (verify: all specs satisfied, module exports are clean, TypeScript compiles without errors)

