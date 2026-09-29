// Real source module, extracted 2026-09-05 from weyland.worker.js's own
// bundled "auth-module.js" segment (lines 1064-1201 at extraction time,
// tagged with a `// auth-module.js` comment and an esbuild `init_auth_module`
// wrapper - proof this file used to exist separately before being flattened
// into the checked-in bundle). Content below is byte-faithful to that
// segment's real logic, with esbuild's internal `__esm`/`__name`/init_*
// registration calls stripped - those are bundler bookkeeping, not
// behavior. Not yet wired into a real build - see src/README.md.

export async function generateJWT(payload, secret, expiresInMs = 864e5) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const now = Date.now();
  const tokenPayload = {
    ...payload,
    iat: Math.floor(now / 1e3),
    // Issued at (seconds)
    exp: Math.floor((now + expiresInMs) / 1e3),
    // Expires at (seconds)
    jti: crypto.randomUUID(),
    // JWT ID for tracking
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = await createHmacSignature(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function verifyJWT(token, secret) {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token format");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed JWT token");
  }
  const [encodedHeader, encodedPayload, providedSignature] = parts;
  const expectedSignature = await createHmacSignature(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );
  if (providedSignature !== expectedSignature) {
    throw new Error("Invalid token signature");
  }
  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1e3);
  if (payload.exp && payload.exp < now) {
    throw new Error("Token expired");
  }
  if (payload.nbf && payload.nbf > now) {
    throw new Error("Token not yet valid");
  }
  return payload;
}

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToBase64(hashBuffer);
}

export async function authenticateRequest(request2, secret) {
  const authHeader = request2.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Invalid Authorization header format");
  }
  const token = authHeader.substring(7).trim();
  return await verifyJWT(token, secret);
}

export async function generateSignedResourceUrl(resourcePath, secret, expiresInMinutes = 15) {
  const expires = Math.floor(Date.now() / 1e3) + expiresInMinutes * 60;
  const payload = `${resourcePath}:${expires}`;
  const sig = await createHmacSignature(payload, secret);
  const separator = resourcePath.includes("?") ? "&" : "?";
  return `${resourcePath}${separator}expires=${expires}&sig=${sig}`;
}

export async function verifySignedResourceUrl(url, secret) {
  const expires = url.searchParams.get("expires");
  const sig = url.searchParams.get("sig");
  if (!expires || !sig) {
    return { valid: false, expired: false, error: "Missing expires or sig parameter" };
  }
  const expiresInt = parseInt(expires, 10);
  if (isNaN(expiresInt)) {
    return { valid: false, expired: false, error: "Invalid expires parameter" };
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now > expiresInt) {
    return { valid: false, expired: true, error: "URL has expired" };
  }
  const urlCopy = new URL(url.href);
  urlCopy.searchParams.delete("expires");
  urlCopy.searchParams.delete("sig");
  let cleanPath = urlCopy.pathname;
  if (urlCopy.searchParams.toString()) {
    cleanPath += "?" + urlCopy.searchParams.toString();
  }
  const payload = `${cleanPath}:${expires}`;
  const expectedSig = await createHmacSignature(payload, secret);
  if (sig !== expectedSig) {
    return { valid: false, expired: false, error: "Invalid signature" };
  }
  return { valid: true, expired: false };
}

export async function createHmacSignature(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return base64UrlEncode(arrayBufferToString(signature));
}

export function base64UrlEncode(str) {
  const base64 = typeof str === "string" ? btoa(unescape(encodeURIComponent(str))) : btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function base64UrlDecode(str) {
  const paddedStr = str.padEnd(str.length + (4 - str.length % 4) % 4, "=");
  const base64 = paddedStr.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(base64)));
}

export function arrayBufferToBase64(buffer) {
  return btoa(arrayBufferToString(buffer));
}

export function arrayBufferToString(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}
