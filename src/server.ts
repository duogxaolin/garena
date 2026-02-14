import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { login, GarenaLoginError } from './index';

const app = express();
app.use(express.json());

// --- Swagger spec ---
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Garena SSO Login API',
      version: '1.0.0',
      description: 'API wrapper cho Garena SSO login flow (prelogin → encrypt → login)',
    },
    servers: [{ url: '/' }],
  },
  apis: [__filename],
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/swagger.json', (_req, res) => res.json(swaggerSpec));

/**
 * @openapi
 * /api/login:
 *   post:
 *     summary: Đăng nhập Garena SSO
 *     description: |
 *       Thực hiện full login flow: prelogin → encrypt password → login.
 *       Trả về session_key và redirect_uri nếu thành công.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [account, password]
 *             properties:
 *               account:
 *                 type: string
 *                 description: Username hoặc số điện thoại
 *                 example: "username123"
 *               password:
 *                 type: string
 *                 description: Mật khẩu
 *                 example: "mypassword"
 *               appId:
 *                 type: string
 *                 description: App ID (mặc định 10100)
 *                 example: "10100"
 *               redirectUri:
 *                 type: string
 *                 description: Redirect URI
 *                 example: "https://account.garena.com/"
 *               locale:
 *                 type: string
 *                 description: Locale (mặc định en-US)
 *                 example: "vi-VN"
 *     responses:
 *       200:
 *         description: Login thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sessionKey:
 *                   type: string
 *                   nullable: true
 *                   description: Session key (có thể null)
 *                 redirectUri:
 *                   type: string
 *                   description: Redirect URL
 *       401:
 *         description: Login thất bại (sai tài khoản/mật khẩu, bị ban, ...)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: Mã lỗi từ Garena
 *                 phase:
 *                   type: string
 *                   enum: [prelogin, login]
 *                 redirectUri:
 *                   type: string
 *                   nullable: true
 *       400:
 *         description: Thiếu account hoặc password
 *       500:
 *         description: Lỗi server
 */
app.post('/api/login', async (req, res) => {
  const { account, password, appId, redirectUri, locale } = req.body;

  if (!account || !password) {
    return res.status(400).json({
      success: false,
      error: 'account and password are required',
    });
  }

  try {
    const result = await login(account, password, { appId, redirectUri, locale });
    return res.json({
      success: true,
      sessionKey: result.sessionKey,
      redirectUri: result.redirectUri,
    });
  } catch (err) {
    if (err instanceof GarenaLoginError) {
      return res.status(401).json({
        success: false,
        error: err.code,
        phase: err.phase,
        redirectUri: err.redirectUri ?? null,
      });
    }
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env.PORT ?? '3000', 10);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/docs`);
});

