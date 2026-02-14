# garena-sso-login

Node.js client cho Garena SSO login (`sso.garena.com`). Thực hiện flow: prelogin → encrypt password → login → lấy session key.

## Cài đặt

```bash
npm install
npm run build
```

## Sử dụng

### Cơ bản

```typescript
import { login } from 'garena-sso-login';

const result = await login('username', 'password');
console.log(result.sessionKey);  // session key hoặc null
console.log(result.redirectUri); // redirect URL
```

### Tuỳ chọn

```typescript
import { login } from 'garena-sso-login';

const result = await login('username', 'password', {
  appId: '10100',                          // mặc định: '10100'
  redirectUri: 'https://account.garena.com/', // mặc định
  locale: 'vi-VN',                         // mặc định: 'en-US'
});
```

### Xử lý lỗi

```typescript
import { login, GarenaLoginError } from 'garena-sso-login';

try {
  const result = await login('username', 'wrong_password');
} catch (err) {
  if (err instanceof GarenaLoginError) {
    console.log(err.code);        // vd: 'error_invalid_account'
    console.log(err.phase);       // 'prelogin' hoặc 'login'
    console.log(err.redirectUri); // URL nếu bị ban
  }
}
```

### Chỉ encrypt password

```typescript
import { encryptPassword } from 'garena-sso-login';

const encrypted = encryptPassword(password, v1, v2);
// → 32 ký tự hex
```

## API

### `login(account, password, options?)`

| Param | Type | Mô tả |
|-------|------|--------|
| `account` | `string` | Username hoặc số điện thoại |
| `password` | `string` | Mật khẩu |
| `options.appId` | `string?` | App ID (mặc định `'10100'`) |
| `options.redirectUri` | `string?` | Redirect URI |
| `options.locale` | `string?` | Locale (mặc định `'en-US'`) |
| `options.loginSecondary` | `string?` | Login secondary param |

Trả về `Promise<LoginResult>`:
- `sessionKey: string | null`
- `redirectUri: string`

### `encryptPassword(password, v1, v2)`

Encrypt password theo thuật toán Garena SSO: MD5 → SHA256 → AES-256-ECB.

Trả về chuỗi hex 32 ký tự.

### `GarenaLoginError`

Error class với:
- `code` — mã lỗi từ API (vd: `'error_invalid_account'`)
- `phase` — `'prelogin'` hoặc `'login'`
- `redirectUri` — URL redirect nếu bị security ban

## Thuật toán mã hoá

```
1. S = MD5(password)                          → 32 hex chars
2. h = SHA256(SHA256(S + v1) + v2)            → 32 bytes (AES key)
3. Y = AES-256-ECB(S_bytes, h, no_padding)    → 32 hex chars
```

Trong đó `v1`, `v2` là challenge values từ `/api/prelogin`.

## Lưu ý

- Chưa handle captcha (Shopee slider, reCAPTCHA, Garena image captcha)
- Chưa handle Account Center operations (đổi mật khẩu, bind mobile — dùng RSA, khác flow)

