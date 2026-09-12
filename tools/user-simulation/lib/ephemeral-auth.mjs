// lib/ephemeral-auth.mjs
//
// Mints a real AuthFor ephemeral trial token - the same no-signup trial
// mechanism weylandai.com's own landing page uses (src/lib/authfor-
// client.js's authenticateViaEphemeral, EPHEMERAL_TRIAL_PRODUCTS in
// src/lib/auth.js: subx, takeoffx, cutsheetx, sightx only). This is a
// real call to https://authfor.com, not a fabricated/stubbed token - a
// bad or expired token would fail every downstream check honestly rather
// than silently passing.

export async function mintEphemeralToken(ventureName = "weylandai.com") {
  const res = await fetch("https://authfor.com/api/v1/ephemeral/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ventureName }),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* fall through to error below */
  }
  if (!res.ok || !data?.token) {
    throw new Error(
      `AuthFor ephemeral/create failed (status ${res.status}): ${text.slice(0, 300)}`
    );
  }
  return data.token;
}

export function bearerHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}
