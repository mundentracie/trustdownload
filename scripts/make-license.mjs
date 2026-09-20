// TrustDownload Pro — offline license key generator (seller-side tool, NOT shipped).
//
// Usage:
//   node scripts/make-license.mjs <secrets/trustdownload-license-private.jwk.json> [license-id]
// If license-id is omitted, a random TDPRO-XXXX-XXXX-XXXX is generated.
//
// Output: a full license key "<idB64url>.<sigB64url>" to hand to the buyer.
// The extension verifies it offline with the embedded public key (src/license.js).
// ZERO-NETWORK: this script never contacts anything; keep the private JWK secret.

import { readFileSync } from 'fs';
import { createPrivateKey, randomBytes, sign } from 'node:crypto';

const [jwkPath, wantedId] = process.argv.slice(2);
if (!jwkPath) {
  console.error('usage: node scripts/make-license.mjs <private-jwk.json> [license-id]');
  process.exit(1);
}

const jwk = JSON.parse(readFileSync(jwkPath, 'utf8'));
const priv = createPrivateKey({ key: jwk, format: 'jwk' });

const id = wantedId && wantedId.trim()
  ? wantedId.trim()
  : 'TDPRO-' + randomBytes(6).toString('hex').toUpperCase().replace(/(.{4})(?=.)/g, '$1-');

if (!id.startsWith('TDPRO-')) {
  console.error('license id must start with "TDPRO-"');
  process.exit(1);
}

const idB64u = Buffer.from(id, 'utf8').toString('base64url');
// Sign the DECODED license id bytes — src/license.js verifies over b64urlToBytes(idPart).
const sig = sign(null, Buffer.from(id, 'utf8'), { key: priv, dsaEncoding: 'ieee-p1363' });

console.log(`${idB64u}.${sig.toString('base64url')}`);
