// Production acceptance using one controlled test identity; MFA secrets stay in memory.
// Usage: PLAYWRIGHT_CORE=<path> node tools/user-simulation/mfa-shell-acceptance.mjs
import { createHmac } from 'node:crypto';
import { Journey, openHome, raiseDossier, press, until, sleep, shellState, serverSession } from './lib/journey-kit.mjs';
const J = new Journey('signin-mfa-acceptance', 'Real AuthFor MFA through the deployed Weyland sign-in form');
function totp(secret, step = Math.floor(Date.now() / 30000)) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...secret].map(c => alphabet.indexOf(c).toString(2).padStart(5, '0')).join('');
  const key = Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2)));
  const input = Buffer.alloc(8); input.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', key).update(input).digest();
  return String((mac.readUInt32BE(mac.at(-1) & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}
async function auth(path, body, token) {
  const response = await fetch('https://authfor.com/api/v1/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  for (const key of ['token', 'refresh_token', 'session_id', 'secret', 'setup_id', 'challenge']) if (data[key]) J.secrets.push(data[key]);
  if (!response.ok) throw new Error('Controlled MFA setup failed at ' + path + ': HTTP ' + response.status);
  return data;
}
await J.run(async () => {
  const acct = await J.account('mfa-acceptance');
  const login = await auth('login', { email: acct.email, password: acct.password });
  const setup = await auth('mfa/setup', {}, login.token);
  if (!setup.secret || !setup.setup_id) throw new Error('MFA setup did not return an enrollment');
  const confirmed = await auth('mfa/confirm', { setup_id: setup.setup_id, totp_code: totp(setup.secret) }, login.token);
  J.check('the controlled test identity enables MFA', confirmed.mfa_enabled === true);
  await J.launch();
  const ctx = await J.context(); const page = await J.page(ctx);
  await openHome(page, J); await raiseDossier(page);
  await press(page, '#wa-account-chip');
  await page.fill('#weyland-signin-email', acct.email);
  await page.locator('#weyland-signin-use-password').click();
  await page.fill('#weyland-signin-password', acct.password);
  await press(page, '#weyland-signin-submit');
  await page.locator('#weyland-signin-mfa').waitFor({ state: 'visible', timeout: 30000 });
  J.check('the authenticator field is visible after the real password challenge', await page.locator('#weyland-signin-mfa').isVisible());
  J.check('a password alone does not sign in', (await shellState(page)).auth !== 'signed-in');
  // Enrollment consumed its TOTP step. Wait for a fresh step rather than replay its code.
  await sleep(30000 - Date.now() % 30000 + 1200);
  const code = totp(setup.secret); J.secrets.push(code);
  await page.fill('#weyland-signin-mfa', code);
  await press(page, '#weyland-signin-submit');
  await until(async () => (await shellState(page)).auth === 'signed-in', 45000);
  const state = await shellState(page);
  J.check('the real authenticator code signs the visitor in', state.auth === 'signed-in' && state.user === acct.email, { auth: state.auth, user: state.user, error: state.error });
  const session = await serverSession(page);
  J.check('MFA creates the Weyland server session', session.valid && session.me === 200 && session.token && session.email === acct.email, session);
  await page.reload({ waitUntil: 'load' });
  await until(async () => (await shellState(page)).auth === 'signed-in', 20000);
  J.check('the MFA sign-in survives a page reload', (await shellState(page)).auth === 'signed-in');
  await page.evaluate(() => window.WeylandShell.signOut());
  J.check('MFA sign-out clears the server session', !(await serverSession(page)).valid);
  await ctx.close();
});
