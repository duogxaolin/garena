# garena-sso-login

Node.js client + REST API cho Garena SSO login (`sso.garena.com`). Thực hiện flow: prelogin → encrypt password → login → lấy session key.

## Cài đặt

```bash
npm install
npm run build
```

## Chạy API Server

```bash
npm start
# → http://localhost:3000
# → Swagger UI: http://localhost:3000/docs
```

Đổi port:
```bash
PORT=8080 npm start
```

## REST API

Swagger UI tự động tại `/docs`. Swagger JSON tại `/swagger.json`.

### `POST /api/login`

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"account": "username", "password": "mypassword"}'
```

Request body:
```json
{
  "account": "username",
  "password": "mypassword",
  "appId": "10100",
  "redirectUri": "https://account.garena.com/",
  "locale": "vi-VN"
}
```

Chỉ `account` và `password` là bắt buộc.

Response thành công (200):
```json
{
  "success": true,
  "sessionKey": "abc123...",
  "redirectUri": "https://account.garena.com/"
}
```

Response lỗi (401):
```json
{
  "success": false,
  "error": "error_invalid_account",
  "phase": "login",
  "redirectUri": null
}
```

### `GET /health`

Health check, trả về `{"status": "ok"}`.

## Triển khai

### Docker

```bash
docker build -t garena-sso-login .
docker run -d -p 3000:3000 --name garena garena-sso-login
```

Đổi port:
```bash
docker run -d -p 8080:8080 -e PORT=8080 garena-sso-login
```

### VPS (Ubuntu/Debian)

```bash
# 1. Clone repo
git clone https://github.com/duogxaolin/garena.git
cd garena

# 2. Cài Node.js (nếu chưa có)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Build & chạy
npm install
npm run build
PORT=3000 npm start

# 4. Chạy nền với pm2
npm install -g pm2
pm2 start dist/server.js --name garena
pm2 save
pm2 startup
```

### Railway

1. Fork repo hoặc connect GitHub repo `duogxaolin/garena`
2. Railway tự detect Dockerfile → build & deploy
3. Biến môi trường: `PORT` (Railway tự set)
4. Sau deploy, truy cập `https://<app>.up.railway.app/docs` để xem Swagger UI

### Render

1. New Web Service → connect repo `duogxaolin/garena`
2. Build Command: `npm install && npm run build`
3. Start Command: `npm start`
4. Swagger UI tại `https://<app>.onrender.com/docs`

## Sử dụng như thư viện

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

