## ADDED Requirements

### Requirement: SSO login flow executes prelogin then login sequentially
The system SHALL call `GET /api/prelogin` to obtain challenge values, then call `GET /api/login` with the encrypted password to authenticate.

#### Scenario: Successful login with username
- **WHEN** `login("DuogLinh2k3", "DuogLinh", { appId: "10100" })` is called
- **THEN** the system calls `GET sso.garena.com/api/prelogin?app_id=10100&account=DuogLinh2k3&format=json&id=<timestamp>`
- **AND** receives `{ v1, v2 }` from prelogin response
- **AND** encrypts the password using v1 and v2
- **AND** calls `GET sso.garena.com/api/login?app_id=10100&account=DuogLinh2k3&password=<encrypted>&format=json&id=<timestamp>`
- **AND** returns `{ sessionKey, redirectUri }` from the login response

#### Scenario: Successful login with mobile number
- **WHEN** `login("+6512345678", "password123", { appId: "10100" })` is called with a phone number (digits prefixed with +countrycode)
- **THEN** the system uses the full phone string as the `account` parameter in both prelogin and login requests

### Requirement: Login returns session data on success
The system SHALL extract `session_key` and `redirect_uri` from the login response and return them to the caller.

#### Scenario: Session key present in response
- **WHEN** login succeeds and response contains `{ session_key: "abc123", redirect_uri: "https://account.garena.com/?session_key=abc123" }`
- **THEN** the function returns `{ sessionKey: "abc123", redirectUri: "https://account.garena.com/?session_key=abc123" }`

#### Scenario: Login succeeds without session key
- **WHEN** login succeeds and response contains `{ redirect_uri: "https://..." }` but no `session_key`
- **THEN** the function returns `{ sessionKey: null, redirectUri: "https://..." }`

### Requirement: Login handles error responses
The system SHALL detect error responses from both prelogin and login endpoints and throw typed errors.

#### Scenario: Prelogin returns error
- **WHEN** prelogin response contains `{ error: "error_invalid_account" }`
- **THEN** the function throws a `GarenaLoginError` with code `"error_invalid_account"` and phase `"prelogin"`

#### Scenario: Login returns invalid credentials
- **WHEN** login response contains `{ error: "error_invalid_password" }`
- **THEN** the function throws a `GarenaLoginError` with code `"error_invalid_password"` and phase `"login"`

#### Scenario: Security ban with countdown
- **WHEN** login response contains `{ error: "error_security_ban", redirect_uri: "https://..." }`
- **THEN** the function throws a `GarenaLoginError` with code `"error_security_ban"`, phase `"login"`, and includes the `redirectUri`

### Requirement: Login sends correct HTTP headers
The system SHALL send headers that match the browser client behavior observed in HAR.

#### Scenario: Request headers match browser
- **WHEN** any request is made to sso.garena.com
- **THEN** the request includes `Accept: application/json, text/plain, */*`
- **AND** includes a realistic `User-Agent` header
- **AND** includes `Referer: https://sso.garena.com/universal/login?app_id=<appId>`

### Requirement: Login generates timestamp-based request ID
The system SHALL include an `id` query parameter with a timestamp value on each request, matching the browser behavior.

#### Scenario: ID parameter is current timestamp
- **WHEN** prelogin or login request is constructed
- **THEN** the `id` query parameter is set to `Date.now()` (millisecond timestamp)

### Requirement: Login accepts configurable options
The system SHALL accept optional configuration for `appId`, `redirectUri`, and `loginSecondary`.

#### Scenario: Default app_id
- **WHEN** no `appId` is provided in options
- **THEN** the system uses `"10100"` as the default `app_id`

#### Scenario: Custom redirect_uri
- **WHEN** `redirectUri` is provided in options
- **THEN** the system includes `redirect_uri=<value>` in the login request query parameters

