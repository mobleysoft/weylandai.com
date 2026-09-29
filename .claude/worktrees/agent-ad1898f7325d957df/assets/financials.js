const DATA_URL = '/data/financials.json';
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat('en-US');

const $ = (selector, root = document) => root.querySelector(selector);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function stateBadge(state, label = state) {
  return element('span', `state state-${state}`, label.replaceAll('-', ' '));
}

function statusBadge(status) {
  return element('span', `status status-${status}`, status);
}

function renderFunding(data) {
  const host = $('[data-funding-models]');
  const controls = Object.fromEntries(
    [...document.querySelectorAll('[data-calc]')].map((input) => [input.dataset.calc, input]),
  );
  let activeModel = data.fundingModels[0];

  function select(model, card) {
    activeModel = model;
    host.querySelectorAll('.scenario').forEach((candidate) => candidate.classList.remove('active'));
    card.classList.add('active');
    controls.raise.value = model.raise;
    controls.burn.value = model.monthlyBurn;
    controls.reserve.value = model.reservePct;
    renderCalculator();
  }

  function renderCalculator() {
    const raise = Math.max(0, Number(controls.raise.value) || 0);
    const burn = Math.max(0, Number(controls.burn.value) || 0);
    const revenue = Math.max(0, Number(controls.revenue.value) || 0);
    const reserve = Math.max(0, Math.min(40, Number(controls.reserve.value) || 0));
    const deployable = raise * (1 - reserve / 100);
    const netBurn = Math.max(1, burn - revenue);
    const months = deployable / netBurn;
    $('[data-runway-months]').textContent = Number.isFinite(months) ? months.toFixed(1) : '--';
    $('[data-runway-track]').style.width = `${Math.min(100, (months / 60) * 100)}%`;
    $('[data-reserve-output]').textContent = `${reserve}%`;
    $('[data-runway-note]').textContent = `${money.format(deployable)} deployable at ${money.format(netBurn)} net monthly burn. Revenue is a modeled offset, not verified cash.`;

    const allocation = $('[data-allocation]');
    allocation.replaceChildren();
    Object.entries(activeModel.allocation).forEach(([label, percentage]) => {
      const row = element('div', 'allocation-row');
      row.append(element('span', '', `${label} · ${percentage}%`));
      row.append(element('b', '', money.format(deployable * percentage / 100)));
      allocation.append(row);
    });
  }

  data.fundingModels.forEach((model, index) => {
    const card = element('article', 'scenario');
    card.tabIndex = 0;
    card.append(stateBadge(model.state));
    card.append(element('h3', '', model.name));
    const numbers = element('div', 'scenario-numbers');
    const raise = element('span');
    raise.append(element('strong', '', money.format(model.raise)));
    raise.append(element('small', '', 'TARGET RAISE'));
    const runway = element('span');
    runway.append(element('strong', '', `${model.runwayMonths} mo`));
    runway.append(element('small', '', 'STATED RUNWAY'));
    numbers.append(raise, runway);
    card.append(numbers, element('p', '', model.note));
    card.addEventListener('click', () => select(model, card));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') select(model, card);
    });
    host.append(card);
    if (index === 0) select(model, card);
  });
  Object.values(controls).forEach((input) => input.addEventListener('input', renderCalculator));
}

function renderCapitalization(data) {
  $('[data-cap-summary]').textContent = data.capitalization.summary;
  const list = $('[data-cap-required]');
  data.capitalization.required.forEach((item) => list.append(element('li', '', item)));
}

function renderTraction(data) {
  const host = $('[data-traction]');
  data.traction.forEach((item) => {
    const card = element('article', 'metric');
    card.append(stateBadge(item.state));
    card.append(element('h3', '', item.metric));
    card.append(element('strong', '', item.value));
    card.append(element('p', '', item.evidence));
    host.append(card);
  });
}

function renderMarket(data) {
  const market = data.market;
  $('[data-sam]').textContent = number.format(market.samFirms);
  $('[data-acv]').textContent = `${money.format(market.pricing.annualContractValuePerSeat)} / seat`;
  const included = market.pricing.includes.join(' · ');
  $('[data-market-warning]').textContent = `${market.warning} SubConP includes ${included}.`;
  const path = $('[data-som]');
  market.somPath.forEach((step) => {
    const card = element('div', 'som-step');
    card.append(element('span', '', step.year));
    card.append(element('b', '', `${number.format(step.seats)} seats`));
    card.append(element('small', '', `${money.format(step.arr)} ARR`));
    path.append(card);
  });

  const moat = $('[data-moat]');
  data.moat.forEach((item) => {
    const row = element('article', 'moat-item');
    row.append(stateBadge(item.state));
    row.append(element('h3', '', item.claim));
    row.append(element('p', '', `Test: ${item.test}`));
    moat.append(row);
  });
}

function renderMilestones(data) {
  const plan = data.hiringPlan;
  const hiring = $('[data-hiring]');
  hiring.append(element('strong', '', String(plan.headcount)));
  const copy = element('div');
  copy.append(element('h3', '', `Target team by month ${plan.targetMonth}`));
  copy.append(element('p', '', `${plan.roles.join(' · ')}. ${plan.note}`));
  hiring.append(copy, element('b', '', `${money.format(plan.annualRunRate)}\nANNUAL RUN-RATE`));

  const milestones = $('[data-milestones]');
  data.milestones.forEach((item) => {
    const row = element('article', 'milestone');
    row.append(element('time', '', item.window));
    row.append(element('h3', '', item.name));
    row.append(element('p', '', item.measure));
    row.append(statusBadge(item.state));
    milestones.append(row);
  });
}

function renderManifest(data) {
  const host = $('[data-artifacts]');
  const complete = data.artifacts.filter((item) => ['available', 'draft'].includes(item.status)).length;
  $('[data-progress]').textContent = `${complete}/${data.artifacts.length}`;

  function draw(filter = 'all') {
    host.replaceChildren();
    data.artifacts
      .filter((item) => filter === 'all' || item.status === filter)
      .forEach((item) => {
        const row = element('article', 'artifact');
        row.dataset.status = item.status;
        row.append(element('span', 'artifact-priority', item.priority));
        const title = element('div');
        const heading = element('h3');
        if (item.href) {
          const link = element('a', '', item.artifact);
          link.href = item.href;
          heading.append(link);
        } else {
          heading.textContent = item.artifact;
        }
        title.append(heading, statusBadge(item.status));
        row.append(title);
        row.append(element('span', 'artifact-access', item.access));
        row.append(element('p', '', item.next));
        host.append(row);
      });
  }

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach((candidate) => candidate.classList.remove('active'));
      button.classList.add('active');
      draw(button.dataset.filter);
    });
  });
  draw();

  const downloads = $('[data-downloads]');
  data.downloads.forEach((item) => {
    const link = element('a', '', item.label);
    link.href = item.href;
    downloads.append(link);
  });
}

async function boot() {
  const response = await fetch(DATA_URL, {cache: 'no-store'});
  if (!response.ok) throw new Error(`Financial evidence returned HTTP ${response.status}`);
  const data = await response.json();
  $('[data-as-of]').textContent = data.asOf;
  renderFunding(data);
  renderCapitalization(data);
  renderTraction(data);
  renderMarket(data);
  renderMilestones(data);
  renderManifest(data);
}

boot().catch((error) => {
  document.body.dataset.loadError = 'true';
  const strip = $('.alert-strip p');
  strip.textContent = `Financial evidence failed to load: ${error.message}`;
});
