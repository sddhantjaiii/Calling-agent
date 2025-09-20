#!/usr/bin/env node
/*
  Usage examples:
  node Calling agent-kiro/send-webhook-from-debug.js \
    --file "Calling agent-kiro/debug/webhook_payload_2025-09-17T18-13-38-850Z_unknown.json" \
    --url "https://33aad30db3fd.ngrok-free.app/api/webhooks/elevenlabs/post-call" \
    --secret "${ELEVENLABS_WEBHOOK_SECRET}"

  Or rely on ELEVENLABS_WEBHOOK_SECRET from .env and defaults for file/url.
  node Calling agent-kiro/send-webhook-from-debug.js
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_FILE = path.join(__dirname, 'debug', 'webhook_payload_2025-09-17T18-13-38-850Z_unknown.json');
const DEFAULT_URL = 'https://33aad30db3fd.ngrok-free.app/api/webhooks/elevenlabs/post-call';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') { out.file = argv[++i]; continue; }
    if (a === '--url') { out.url = argv[++i]; continue; }
    if (a === '--secret') { out.secret = argv[++i]; continue; }
    if (a === '--no-signature' || a === '--noSig') { out.noSignature = true; continue; }
  }
  return out;
}

function tryUnescapeIfStringifiedJsonString(raw) {
  const trimmed = raw.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || trimmed.includes('\\"')) {
    try {
      const unescaped = JSON.parse(trimmed);
      if (typeof unescaped === 'string') return unescaped;
    } catch {}
  }
  return raw;
}

function pickBodyString(debugJson) {
  if (typeof debugJson.rawBody === 'string' && debugJson.rawBody.trim().length > 0) {
    return tryUnescapeIfStringifiedJsonString(debugJson.rawBody);
  }
  if (debugJson.parsedPayload) {
    return JSON.stringify(debugJson.parsedPayload);
  }
  if (debugJson.payload) {
    return JSON.stringify(debugJson.payload);
  }
  if (debugJson.data) {
    return JSON.stringify(debugJson.data);
  }
  throw new Error('Could not find rawBody/parsedPayload in debug file');
}

function buildSignature(bodyString, secret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedPayload = `${timestamp}.${bodyString}`;
  const hash = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  return { header: `t=${timestamp},v0=${hash}`, timestamp, hash };
}

(async () => {
  const args = parseArgs(process.argv);
  const file = args.file || DEFAULT_FILE;
  const url = args.url || DEFAULT_URL;
  const secret = args.secret || process.env.ELEVENLABS_WEBHOOK_SECRET;
  const noSig = !!args.noSignature;

  const debugJson = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bodyString = pickBodyString(debugJson);

  const headers = {
    'content-type': 'application/json',
    'user-agent': 'ElevenLabs/1.0'
  };

  if (!noSig && secret) {
    const sig = buildSignature(bodyString, secret);
    headers['elevenlabs-signature'] = sig.header;
    console.log('[info] Using signature:', sig.header);
  } else {
    console.log('[warn] Sending without signature (no secret provided or --no-signature)');
  }

  console.log('[info] POST', url);
  console.log('[info] Body bytes:', Buffer.byteLength(bodyString));

  // Node 18+ has fetch globally
  const res = await fetch(url, { method: 'POST', headers, body: bodyString });
  const text = await res.text().catch(() => '');
  console.log('[info] Response status:', res.status, res.statusText);
  if (text) console.log('[body]', text);
})().catch(err => {
  console.error('[error]', err && err.message ? err.message : err);
  process.exit(1);
});




