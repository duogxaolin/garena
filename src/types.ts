export interface PreloginResponse {
  v1: string;
  v2: string;
  error?: string;
}

export interface LoginResponse {
  session_key?: string;
  redirect_uri?: string;
  error?: string;
  notify_password_update?: boolean;
}

export interface LoginOptions {
  appId?: string;
  redirectUri?: string;
  locale?: string;
  loginSecondary?: string;
}

export interface LoginResult {
  sessionKey: string | null;
  redirectUri: string;
}

export class GarenaLoginError extends Error {
  code: string;
  phase: 'prelogin' | 'login';
  redirectUri?: string;

  constructor(code: string, phase: 'prelogin' | 'login', redirectUri?: string) {
    super(`Garena login error [${phase}]: ${code}`);
    this.name = 'GarenaLoginError';
    this.code = code;
    this.phase = phase;
    this.redirectUri = redirectUri;
  }
}

