#!/usr/bin/env node
/*
  Replays a saved ElevenLabs debug payload to a webhook WITHOUT signature.

  Examples (Windows PowerShell):
  cd "C:\\Users\\sddha\\Coding\\Sniperthinkv2\\parsing logic for elevan labs\\Calling agent-kiro"
  node send-webhook-from-debug-nosig.js \
    --file "debug\\webhook_payload_2025-09-17T18-13-38-850Z_unknown.json" \
    --url "https://33aad30db3fd.ngrok-free.app/api/webhooks/elevenlabs/post-call"
*/

const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = path.join(__dirname, 'debug', 'webhook_payload_2025-09-17T18-13-38-850Z_unknown.json');
const DEFAULT_URL = 'https://33aad30db3fd.ngrok-free.app/api/webhooks/elevenlabs/post-call';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') { out.file = argv[++i]; continue; }
    if (a === '--url') { out.url = argv[++i]; continue; }
  }
  return out;
}

function tryUnescapeIfStringifiedJsonString(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return raw;
  // If raw looks like a JSON-stringified string of the full body, unescape it
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || trimmed.includes('\\"')) {
    try {
      const unescaped = JSON.parse(trimmed);
      if (typeof unescaped === 'string') return unescaped;
    } catch {}
  }
  return raw;
}

function pickBodyString(debugJson) {
  // Prefer exact raw body if present (what ElevenLabs actually sent)
  if (typeof debugJson.rawBody === 'string' && debugJson.rawBody.trim().length > 0) {
    return tryUnescapeIfStringifiedJsonString(debugJson.rawBody);
  }
  // Fallback to parsed payload
  if (debugJson.parsedPayload) return JSON.stringify(debugJson.parsedPayload);
  if (debugJson.payload) return JSON.stringify(debugJson.payload);
  if (debugJson.data) return JSON.stringify(debugJson.data);
  throw new Error('Could not find rawBody/parsedPayload in debug file');
}

(async () => {
  const args = parseArgs(process.argv);
  const file = path.isAbsolute(args.file || '') ? (args.file) : (args.file ? path.join(process.cwd(), args.file) : DEFAULT_FILE);
  const url = args.url || DEFAULT_URL;

  const debugJson = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bodyString = pickBodyString(debugJson);

  const headers = {
    'content-type': 'application/json',
    'user-agent': 'ElevenLabs/1.0'
  };

  console.log('[info] POST', url);
  console.log('[info] File:', file);
  console.log('[info] Body bytes:', Buffer.byteLength(bodyString));
  console.log('[info] Sending without elevenlabs-signature');

  const res = await fetch(url, { method: 'POST', headers, body: bodyString });
  const text = await res.text().catch(() => '');
  console.log('[info] Response status:', res.status, res.statusText);
  if (text) console.log('[body]', text);
})().catch(err => {
  console.error('[error]', err && err.message ? err.message : err);
  process.exit(1);
});




