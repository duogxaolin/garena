## ADDED Requirements

### Requirement: Password encryption uses MD5-SHA256-AES pipeline
The system SHALL encrypt passwords using the exact algorithm from `LoginView-855c93ca9.js`: MD5 the plaintext password, derive an AES key using double SHA256 with server-provided v1/v2 values, then AES-256-ECB encrypt the MD5 hash.

#### Scenario: Full encryption pipeline
- **WHEN** `encryptPassword("DuogLinh", { v1: "<server_v1>", v2: "<server_v2>" })` is called
- **THEN** step 1: compute `md5hex = MD5("DuogLinh")` as lowercase hex string (32 chars)
- **AND** step 2: compute `inner = SHA256(md5hex + v1)` as lowercase hex string (64 chars)
- **AND** step 3: compute `key = SHA256(inner + v2)` as raw bytes (32 bytes)
- **AND** step 4: compute `result = AES-256-ECB-encrypt(md5_raw_bytes, key_bytes, no_padding)` as lowercase hex string (32 chars)
- **AND** returns the 32-character hex string

### Requirement: MD5 step produces correct hex output
The system SHALL compute MD5 of the plaintext password and output it as a lowercase hexadecimal string, matching CryptoJS `MD5(password).toString()` behavior.

#### Scenario: MD5 of known input
- **WHEN** MD5 is computed for string `"DuogLinh"`
- **THEN** the output is a 32-character lowercase hex string
- **AND** the output matches `CryptoJS.MD5("DuogLinh").toString()`

### Requirement: SHA256 key derivation uses string concatenation
The system SHALL concatenate the MD5 hex string with v1 (string concatenation, not binary), SHA256 that, then concatenate the result hex with v2 and SHA256 again. This matches CryptoJS implicit WordArray-to-hex coercion via `toString()`.

#### Scenario: Key derivation with v1 and v2
- **WHEN** md5hex is `"45eace271019f0fee53f4d24420f2132"` and v1 is `"abc123"` and v2 is `"def456"`
- **THEN** inner = SHA256(`"45eace271019f0fee53f4d24420f2132abc123"`) as hex string
- **AND** key = SHA256(inner + `"def456"`) as raw 32 bytes

### Requirement: AES encryption uses ECB mode with no padding
The system SHALL use AES-256-ECB mode with no padding. The plaintext is the raw MD5 bytes (16 bytes = exactly 1 AES block), and the key is the raw SHA256 bytes (32 bytes = AES-256 key size).

#### Scenario: AES-ECB produces 32 hex char output
- **WHEN** AES-256-ECB encrypts 16 bytes of MD5 with 32 bytes of SHA256 key
- **THEN** the output is exactly 16 bytes (1 block)
- **AND** formatted as 32-character lowercase hex string

#### Scenario: No padding is applied
- **WHEN** the plaintext is exactly 16 bytes (MD5 output)
- **THEN** no PKCS7 or other padding is added
- **AND** the ciphertext is exactly 16 bytes

### Requirement: Encryption output matches observed HAR data
The system SHALL produce output that matches the encrypted password observed in the HAR capture when given the same inputs.

#### Scenario: Verify against HAR capture
- **WHEN** password is `"DuogLinh"` and v1/v2 are the values from the prelogin response in the HAR
- **THEN** the encrypted output is `"11eb74fbf741904d72a02629418ca75b"`

