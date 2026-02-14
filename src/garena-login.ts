import axios, { type AxiosInstance } from 'axios';
import { encryptPassword } from './encrypt-password';
import {
  GarenaLoginError,
  type PreloginResponse,
  type LoginResponse,
  type LoginOptions,
  type LoginResult,
} from './types';

const SSO_BASE_URL = 'https://sso.garena.com';
const DEFAULT_APP_ID = '10100';
const DEFAULT_REDIRECT_URI = 'https://account.garena.com/';
const DEFAULT_LOCALE = 'en-US';

function createClient(appId: string, redirectUri: string, locale: string): AxiosInstance {
  return axios.create({
    baseURL: SSO_BASE_URL,
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      'Referer': `${SSO_BASE_URL}/universal/login?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&locale=${locale}`,
    },
  });
}

/**
 * Authenticate against Garena SSO and obtain a session key.
 *
 * Replicates the browser login flow:
 *   1. GET /api/prelogin → { v1, v2 }
 *   2. Encrypt password with v1, v2
 *   3. GET /api/login → { session_key, redirect_uri }
 *
 * @param account - Username or phone number (e.g. "+6512345678")
 * @param password - Plaintext password
 * @param options - Optional configuration
 * @returns Session data with sessionKey and redirectUri
 * @throws {GarenaLoginError} On authentication failure
 */
export async function login(
  account: string,
  password: string,
  options?: LoginOptions,
): Promise<LoginResult> {
  const appId = options?.appId ?? DEFAULT_APP_ID;
  const redirectUri = options?.redirectUri ?? DEFAULT_REDIRECT_URI;
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const client = createClient(appId, redirectUri, locale);

  // Step 1: Prelogin — get challenge values
  const preloginRes = await client.get<PreloginResponse>('/api/prelogin', {
    params: {
      app_id: appId,
      account,
      format: 'json',
      id: Date.now().toString(),
    },
  });

  const prelogin = preloginRes.data;
  if (prelogin.error) {
    throw new GarenaLoginError(prelogin.error, 'prelogin');
  }

  // Step 2: Encrypt password
  const encrypted = encryptPassword(password, prelogin.v1, prelogin.v2);

  // Step 3: Login
  const loginParams: Record<string, string> = {
    app_id: appId,
    account,
    password: encrypted,
    redirect_uri: redirectUri,
    format: 'json',
    id: Date.now().toString(),
  };

  if (options?.loginSecondary) {
    loginParams.login_secondary = options.loginSecondary;
  }

  const loginRes = await client.get<LoginResponse>('/api/login', {
    params: loginParams,
  });

  const loginData = loginRes.data;
  if (loginData.error) {
    throw new GarenaLoginError(
      loginData.error,
      'login',
      loginData.redirect_uri,
    );
  }

  return {
    sessionKey: loginData.session_key ?? null,
    redirectUri: loginData.redirect_uri ?? '',
  };
}

