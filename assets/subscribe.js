import { AuthForStandard } from './authfor-integration-standard.js';

const PRODUCT_ID = 'weyland-subconp-seat';
const seatInput = document.getElementById('seat-count');
const total = document.querySelector('[data-total]');
const checkout = document.querySelector('[data-checkout]');
const note = document.querySelector('[data-checkout-note]');
const result = document.querySelector('[data-result]');
const serviceStatus = document.querySelector('[data-service-status]');
const authStatus = document.querySelector('[data-auth-status]');
const currency = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});

const auth = new AuthForStandard({
  clientId: 'af_weyland_subscribe',
  ventureName: 'weylandai.com',
  redirectUrl: window.location.origin + '/subscribe/'
});

let currentUser = null;

function seats() {
  const value = Math.max(1, Math.min(250, Number.parseInt(seatInput.value, 10) || 1));
  seatInput.value = value;
  total.textContent = currency.format(value * 2000);
  return value;
}

function show(message, kind = '') {
  result.hidden = false;
  result.className = `result ${kind}`;
  result.textContent = message;
}

document.querySelectorAll('[data-seat-step]').forEach((button) => {
  button.addEventListener('click', () => {
    seatInput.value = seats() + Number(button.dataset.seatStep);
    seats();
  });
});
seatInput.addEventListener('input', seats);

async function verifyRail() {
  try {
    const response = await fetch('/api/billing/catalog', {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const product = payload.products.find((entry) => entry.id === PRODUCT_ID);
    if (!product?.checkout_ready) throw new Error(product?.blockers?.join(', ') || 'product unavailable');
    serviceStatus.textContent = 'PAYMENT RAIL READY';
    if (currentUser) {
      checkout.disabled = false;
    } else {
      checkout.textContent = 'SIGN IN TO CHECKOUT';
      checkout.disabled = false;
    }
  } catch (error) {
    serviceStatus.textContent = 'PAYMENT RAIL NOT READY';
    serviceStatus.classList.add('offline');
    checkout.disabled = true;
    show(`Checkout is not available yet: ${error.message}`, 'bad');
  }
}

checkout.addEventListener('click', async () => {
  if (!currentUser) {
    // Redirect to unified AuthFor sign in interface
    const loginUrl = `https://authfor-gateway-worker.johnmobley99.workers.dev/?returnTo=${encodeURIComponent(window.location.href)}`;
    location.assign(loginUrl);
    return;
  }

  checkout.disabled = true;
  note.textContent = 'Creating a secure recurring checkout session...';
  try {
    const response = await fetch('/api/billing/checkout/create', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({product_id: PRODUCT_ID, quantity: seats()}),
    });
    const payload = await response.json();
    if (!response.ok || !payload.checkout_url) {
      const detail = payload.detail?.blockers?.join(', ') || payload.detail?.message || payload.detail || `HTTP ${response.status}`;
      throw new Error(String(detail));
    }
    location.assign(payload.checkout_url);
  } catch (error) {
    checkout.disabled = false;
    note.textContent = 'Checkout is processed by VendyAI using Stripe. No card data touches this server.';
    show(`Unable to begin checkout: ${error.message}`, 'bad');
  }
});

async function showReturnState() {
  const params = new URLSearchParams(location.search);
  if (params.get('checkout') === 'cancelled') {
    show('Checkout was cancelled. No subscription was created.', 'bad');
    return;
  }
  const session = params.get('session_id');
  if (params.get('checkout') !== 'success' || !session) return;
  show('Payment returned successfully. Waiting for the verified subscription event...', '');
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await fetch(`/api/billing/checkout/status/${encodeURIComponent(session)}`, {cache: 'no-store'});
    if (response.ok) {
      const payload = await response.json();
      if (payload.status === 'active') {
        show(`Subscription active for ${payload.quantity} seat${payload.quantity === 1 ? '' : 's'}. Founder-led onboarding is the current provisioning boundary.`, 'good');
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  show('Payment is still being reconciled. Keep this page open or contact hello@weylandai.com with the checkout reference.', '');
}

async function initIdentity() {
  try {
    authStatus.textContent = 'AUTHENTICATING...';
    const result = await auth.init();
    if (result.authenticated) {
      currentUser = result.user;
      authStatus.textContent = `SIGNED IN AS ${currentUser.email.toUpperCase()}`;
      authStatus.classList.add('online');
    } else {
      currentUser = null;
      authStatus.textContent = 'GUEST SESSION';
      authStatus.classList.add('offline');
    }
  } catch (error) {
    console.error('Identity verification failed:', error);
    authStatus.textContent = 'OFFLINE IDENTITY';
    authStatus.classList.add('offline');
  }
}

checkout.disabled = true;
seats();
initIdentity().then(() => {
  verifyRail();
  showReturnState().catch((error) => show(`Unable to verify checkout: ${error.message}`, 'bad'));
});
