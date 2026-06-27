/*
 * Quantumult X request-body script for PHS mini-program traffic.
 * Captures key request data and forwards it to a Windmill/HTTP receiver.
 * Configure with: script-request-body ... phs_capture_qx.js, argument=endpoint=...&token=...
 */

const SCRIPT_NAME = 'phs-capture-qx';
const TARGET_HOSTS = new Set(['netphs.eheren.com', 'auth.eheren.com']);
const MAX_BODY_CHARS = 120000;
const POST_TIMEOUT_MS = 3000;

function parseArgument(input) {
  const raw = input || '';
  const output = {};
  raw.split('&').forEach((part) => {
    if (!part) return;
    const index = part.indexOf('=');
    const key = decodeURIComponent(index >= 0 ? part.slice(0, index) : part);
    const value = decodeURIComponent(index >= 0 ? part.slice(index + 1) : '');
    output[key] = value;
  });
  return output;
}

function lowerHeaders(headers) {
  const output = {};
  Object.keys(headers || {}).forEach((key) => {
    output[key.toLowerCase()] = headers[key];
  });
  return output;
}

function mask(value) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 8) return '***';
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

function shaLikeSource(value) {
  return String(value || '').slice(0, 24);
}

function safeJsonParse(text) {
  if (!text || !String(text).trim()) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function buildPayload() {
  const request = $request || {};
  const url = request.url || '';
  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname;
  if (!TARGET_HOSTS.has(host)) return null;

  const headers = lowerHeaders(request.headers || {});
  const bodyText = typeof request.body === 'string' ? request.body : '';
  const body = safeJsonParse(bodyText) || {};
  let token = body.token || headers.authorization || '';
  token = String(token || '').replace(/^Bearer\s+/i, '').trim();

  const signContent = typeof body.signContent === 'string' ? body.signContent : '';
  if (!token && !signContent) return null;

  return {
    source: SCRIPT_NAME,
    captured_at: new Date().toISOString(),
    host,
    path: parsedUrl.pathname,
    query: parsedUrl.search ? parsedUrl.search.slice(1) : '',
    method: request.method || 'GET',
    token,
    signContent,
    body_keys: Object.keys(body),
    body_preview: bodyText ? bodyText.slice(0, MAX_BODY_CHARS) : '',
    headers: {
      authorization: headers.authorization || '',
      hrcode: headers.hrcode || '',
      phssign: headers.phssign || '',
      phsid: headers.phsid || '',
      'content-type': headers['content-type'] || '',
      'user-agent': headers['user-agent'] || '',
    },
  };
}

function doneOnceFactory() {
  let called = false;
  return function doneOnce() {
    if (called) return;
    called = true;
    $done({});
  };
}

function postCapture(endpoint, token, payload, doneOnce) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const request = {
    url: endpoint,
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  };
  $task.fetch(request).then((response) => {
    console.log(`[${SCRIPT_NAME}] saved status=${response.statusCode} token=${mask(payload.token)} sign=${shaLikeSource(payload.signContent)}`);
    doneOnce();
  }, (error) => {
    console.log(`[${SCRIPT_NAME}] post failed: ${JSON.stringify(error)}`);
    doneOnce();
  });
}

(function main() {
  const doneOnce = doneOnceFactory();
  const timer = setTimeout(doneOnce, POST_TIMEOUT_MS);
  try {
    const args = parseArgument(typeof $argument === 'string' ? $argument : '');
    const endpoint = args.endpoint || args.url || '';
    const token = args.token || '';
    const payload = buildPayload();
    if (!endpoint || !payload) {
      clearTimeout(timer);
      doneOnce();
      return;
    }
    postCapture(endpoint, token, payload, () => {
      clearTimeout(timer);
      doneOnce();
    });
  } catch (error) {
    console.log(`[${SCRIPT_NAME}] error: ${error && error.message ? error.message : error}`);
    clearTimeout(timer);
    doneOnce();
  }
})();
