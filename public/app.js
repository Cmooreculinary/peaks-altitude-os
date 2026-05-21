const mountains = [
  { id: "everest", name: "Everest", alt: 8848, rank: 1, risk: 22, targetHours: 44, route: "South Col" },
  { id: "k2", name: "K2", alt: 8611, rank: 2, risk: 32, targetHours: 52, route: "Abruzzi Spur" },
  { id: "kangchenjunga", name: "Kangchenjunga", alt: 8586, rank: 3, risk: 29, targetHours: 50, route: "Southwest Face" },
  { id: "lhotse", name: "Lhotse", alt: 8516, rank: 4, risk: 24, targetHours: 46, route: "Couloir" },
  { id: "makalu", name: "Makalu", alt: 8485, rank: 5, risk: 28, targetHours: 49, route: "Northwest Ridge" },
  { id: "chooyu", name: "Cho Oyu", alt: 8188, rank: 6, risk: 18, targetHours: 38, route: "Tichy Route" },
  { id: "dhaulagiri", name: "Dhaulagiri", alt: 8167, rank: 7, risk: 27, targetHours: 47, route: "Northeast Ridge" },
  { id: "manaslu", name: "Manaslu", alt: 8163, rank: 8, risk: 20, targetHours: 40, route: "Northeast Face" },
  { id: "nanga", name: "Nanga Parbat", alt: 8126, rank: 9, risk: 31, targetHours: 51, route: "Kinshofer" },
  { id: "annapurna", name: "Annapurna I", alt: 8091, rank: 10, risk: 36, targetHours: 54, route: "North Face" },
  { id: "gasherbrum", name: "Gasherbrum I", alt: 8068, rank: 11, risk: 26, targetHours: 46, route: "Japanese Couloir" },
  { id: "broad", name: "Broad Peak", alt: 8047, rank: 12, risk: 23, targetHours: 43, route: "West Ridge" },
];

const teams = [
  { id: "lean", label: "Lean", readiness: -7, risk: 8, speed: -3, modifier: 4, cost: 24000 },
  { id: "balanced", label: "Balanced", readiness: 8, risk: -4, speed: 0, modifier: 10, cost: 43000 },
  { id: "elite", label: "Elite", readiness: 16, risk: -11, speed: 5, modifier: 17, cost: 76000 },
];

const gear = [
  { id: "standard", label: "Standard", readiness: -5, risk: 8, speed: -4, modifier: 3, cost: 18000 },
  { id: "pro", label: "Pro", readiness: 8, risk: -4, speed: 2, modifier: 9, cost: 42000 },
  { id: "elite", label: "Elite", readiness: 15, risk: -10, speed: 5, modifier: 16, cost: 88000 },
];

const oxygen = [
  { id: "with", label: "With O2", readiness: 9, risk: -8, speed: 0, modifier: 8, cost: 15000 },
  { id: "limited", label: "Limited O2", readiness: 2, risk: 3, speed: 4, modifier: 2, cost: 7000 },
  { id: "none", label: "No O2", readiness: -12, risk: 18, speed: 8, modifier: -7, cost: 0 },
];

const eventDeck = [
  {
    id: "wind-slab",
    title: "Wind-Loaded Traverse",
    altitude: 6810,
    check: "Technical Skill",
    base: 48,
    text:
      "The lead rope team reaches a wind-loaded traverse above a blue-ice runout. Lapa thinks it can be crossed one at a time. Hana warns visibility is dropping.",
    options: [
      { id: "cut-line", label: "Cut a safer line", detail: "Slower, less exposure. Costs time and stamina.", chance: 12, time: 52, o2: -4, stamina: -9, morale: 1 },
      { id: "push", label: "Push across quickly", detail: "Fastest route, but execution must be clean.", chance: -8, time: 14, o2: -2, stamina: -5, morale: -3 },
      { id: "wait", label: "Wait for visibility", detail: "Burns oxygen while reducing navigation risk.", chance: 6, time: 74, o2: -9, stamina: 2, morale: -1 },
    ],
  },
  {
    id: "oxygen-frost",
    title: "Oxygen Regulator Frost",
    altitude: 7240,
    check: "Logistics",
    base: 55,
    text:
      "The backup regulator on Hana's kit is frosting over. The team can repair it on route, redistribute oxygen, or drop pace and descend to the last cache.",
    options: [
      { id: "repair", label: "Repair on route", detail: "Uses gear quality and patience. Moderate time loss.", chance: 10, time: 38, o2: -3, stamina: -4, morale: 2 },
      { id: "redistribute", label: "Redistribute oxygen", detail: "Fast, but pushes reserve margins lower.", chance: 1, time: 18, o2: -13, stamina: -3, morale: -2 },
      { id: "descend-cache", label: "Descend to cache", detail: "Safest. Major time cost.", chance: 18, time: 95, o2: 4, stamina: -6, morale: -1 },
    ],
  },
  {
    id: "whiteout",
    title: "Whiteout Navigation Failure",
    altitude: 7590,
    check: "Leadership",
    base: 44,
    text:
      "Spindrift erases the route wands above Camp III. The GPS track is drifting. The team needs a commander call before they lose the fixed line.",
    options: [
      { id: "hold", label: "Hold and anchor", detail: "Stabilizes team, costs summit window.", chance: 13, time: 80, o2: -7, stamina: 1, morale: 1 },
      { id: "send-lapa", label: "Send Lapa to probe", detail: "Best guide checks the line. Risk concentrates on one climber.", chance: 5, time: 34, o2: -4, stamina: -6, morale: 0 },
      { id: "continue-gps", label: "Continue on GPS", detail: "Fastest and riskiest.", chance: -12, time: 10, o2: -2, stamina: -4, morale: -5 },
    ],
  },
  {
    id: "serac",
    title: "Serac Fall Warning",
    altitude: 6310,
    check: "Endurance",
    base: 50,
    text:
      "A serac field above the route is cracking in the afternoon sun. The only clean answer is speed, but the team is already carrying fatigue.",
    options: [
      { id: "sprint", label: "Move fast through the chute", detail: "Tests endurance. Saves the clock.", chance: -4, time: 12, o2: -5, stamina: -14, morale: -2 },
      { id: "reroute", label: "Reroute under rock band", detail: "Technical but safer. Significant time loss.", chance: 10, time: 68, o2: -4, stamina: -7, morale: 1 },
      { id: "retreat", label: "Retreat to lower camp", detail: "Protects lives, sacrifices ascent pace.", chance: 20, time: 130, o2: -3, stamina: 4, morale: -4 },
    ],
  },
];

const state = {
  selection: {
    mountain: "everest",
    team: "balanced",
    gear: "pro",
    oxygen: "with",
  },
  phase: "prep",
  progress: 0,
  climbMinutes: 0,
  realSeconds: 0,
  oxygenReserve: 100,
  stamina: 100,
  morale: 100,
  losses: 0,
  targetHours: 44,
  nextEventAt: 0.16,
  activeEvent: null,
  lastRoll: null,
  timer: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fmtAltitude(value) {
  return `${Math.round(value).toLocaleString()} m`;
}

function fmtClimbTime(minutes) {
  if (!minutes) return "0h 00m";
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function totalBudget() {
  return selectedTeam().cost + selectedGear().cost + selectedOxygen().cost;
}

function expeditionScore() {
  const plan = planScore();
  const oxygenBonus = selectedOxygen().id === "none" ? 12000 : selectedOxygen().id === "limited" ? 4500 : 0;
  const score = 100000 - state.climbMinutes * 12 - state.losses * 25000 - totalBudget() * 0.12 - plan.risk * 120 + oxygenBonus;
  return Math.max(0, Math.round(score));
}

function selectedMountain() {
  return mountains.find((item) => item.id === state.selection.mountain);
}

function selectedTeam() {
  return teams.find((item) => item.id === state.selection.team);
}

function selectedGear() {
  return gear.find((item) => item.id === state.selection.gear);
}

function selectedOxygen() {
  return oxygen.find((item) => item.id === state.selection.oxygen);
}

function planScore() {
  const mountain = selectedMountain();
  const team = selectedTeam();
  const kit = selectedGear();
  const o2 = selectedOxygen();
  const readiness = clamp(72 - mountain.risk * 0.35 + team.readiness + kit.readiness + o2.readiness, 8, 98);
  const risk = clamp(mountain.risk + team.risk + kit.risk + o2.risk, 4, 72);
  const targetHours = clamp(mountain.targetHours - team.speed - kit.speed - o2.speed + risk * 0.08, 28, 68);
  return { readiness, risk, targetHours };
}

function createChoiceButtons(type, items) {
  const container = document.querySelector(`[data-choice="${type}"]`);
  container.innerHTML = items
    .map(
      (item) =>
        `<button type="button" data-type="${type}" data-id="${item.id}" class="${state.selection[type] === item.id ? "active" : ""}">${item.label || item.name}</button>`
    )
    .join("");
}

function initChoices() {
  createChoiceButtons("mountain", mountains.slice(0, 6));
  createChoiceButtons("team", teams);
  createChoiceButtons("gear", gear);
  createChoiceButtons("oxygen", oxygen);

  $$(".choice-row button").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.phase !== "prep") return;
      state.selection[button.dataset.type] = button.dataset.id;
      renderChoices();
      renderAll();
    });
  });
}

function renderChoices() {
  ["mountain", "team", "gear", "oxygen"].forEach((type) => {
    $$(`[data-choice="${type}"] button`).forEach((button) => {
      button.classList.toggle("active", state.selection[type] === button.dataset.id);
    });
  });
}

function initMountainGrid() {
  $("#mountain-grid").innerHTML = mountains
    .map(
      (mountain) => `
        <button class="mountain-tile ${state.selection.mountain === mountain.id ? "active" : ""}" type="button" data-mountain="${mountain.id}">
          <b>${mountain.rank}</b>
          <strong>${mountain.name}</strong>
          <span>${fmtAltitude(mountain.alt)}</span>
        </button>
      `
    )
    .join("");

  $$(".mountain-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      if (state.phase !== "prep") return;
      state.selection.mountain = tile.dataset.mountain;
      renderChoices();
      renderAll();
    });
  });
}

function resetExpeditionMetrics() {
  const plan = planScore();
  state.phase = "running";
  state.progress = 0;
  state.climbMinutes = 0;
  state.realSeconds = 0;
  state.oxygenReserve = selectedOxygen().id === "none" ? 42 : selectedOxygen().id === "limited" ? 72 : 100;
  state.stamina = 100;
  state.morale = 100;
  state.losses = 0;
  state.targetHours = plan.targetHours;
  state.nextEventAt = 0.1 + Math.random() * 0.1;
  state.activeEvent = null;
  state.lastRoll = null;
}

function launchExpedition() {
  if (state.phase !== "prep" && state.phase !== "summit" && state.phase !== "failed") return;
  resetExpeditionMetrics();
  startTimer();
  renderMountainMasterIdle("Expedition launched.", "The team is moving under compressed time. PEAKS will pause the ascent when a Mountain Master decision is required.");
  renderAll();
}

function startTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(tick, 1000);
}

function stopTimer() {
  clearInterval(state.timer);
  state.timer = null;
}

function tick() {
  if (state.phase !== "running") return;

  const plan = planScore();
  const riskDrag = plan.risk / 180;
  const progressPerClimbMinute = 1 / (state.targetHours * 60);
  state.realSeconds += 1;
  state.climbMinutes += 1;
  state.progress = clamp(state.progress + progressPerClimbMinute * (1 - riskDrag), 0, 1);

  const o2Burn = selectedOxygen().id === "none" ? 0.01 : selectedOxygen().id === "limited" ? 0.045 : 0.032;
  state.oxygenReserve = clamp(state.oxygenReserve - o2Burn - plan.risk * 0.0008, 0, 100);
  state.stamina = clamp(state.stamina - 0.024 - plan.risk * 0.0007, 0, 100);
  state.morale = clamp(state.morale - plan.risk * 0.00035, 0, 100);

  if (state.progress >= state.nextEventAt && state.progress < 0.94) {
    triggerEvent();
    return;
  }

  if (state.progress >= 1) {
    state.phase = "summit";
    stopTimer();
    renderSummit();
  }

  renderAll();
}

function chooseEvent() {
  const index = Math.floor(Math.random() * eventDeck.length);
  return eventDeck[index];
}

function triggerEvent(forced = false) {
  if (state.phase === "prep") {
    resetExpeditionMetrics();
  }
  state.phase = "event";
  state.activeEvent = chooseEvent();
  state.lastRoll = null;
  stopTimer();
  renderEvent();
  renderAll();
  sendMountainNotification(state.activeEvent.title, "Decision required. The expedition clock has paused.");
}

function modifierRows(option) {
  const plan = planScore();
  const rows = [
    ["Base check", state.activeEvent.base],
    ["Commander choice", option.chance],
    ["Sherpa contract", selectedTeam().modifier],
    ["Gear standard", selectedGear().modifier],
    ["Oxygen strategy", selectedOxygen().modifier],
    ["Mountain risk", -Math.round(plan.risk * 0.42)],
    ["Fatigue load", -Math.round((100 - state.stamina) * 0.18)],
  ];
  return rows;
}

function calculateChance(option) {
  return clamp(
    modifierRows(option).reduce((sum, row) => sum + row[1], 0),
    5,
    95
  );
}

function renderEvent() {
  const event = state.activeEvent;
  $("#decision-badge").classList.remove("hidden");
  $("#master-content").innerHTML = `
    <article class="event-card">
      <div class="event-alert">Mountain Master Alert // ${fmtAltitude(event.altitude)}</div>
      <h3>${event.title}</h3>
      <p>${event.text}</p>
      <div class="roll-box">
        <div class="roll-row"><span>Required check</span><strong>${event.check}</strong></div>
        <div class="roll-row"><span>Team condition</span><strong>${Math.round(state.stamina)}% stamina / ${Math.round(state.oxygenReserve)}% O2</strong></div>
      </div>
      <div class="option-grid">
        ${event.options
          .map(
            (option) => `
              <button type="button" data-option="${option.id}">
                <strong>${option.label}</strong>
                <span>${option.detail}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </article>
  `;

  $$(".option-grid button").forEach((button) => {
    button.addEventListener("click", () => {
      const option = event.options.find((item) => item.id === button.dataset.option);
      renderRoll(event, option);
    });
  });
}

function renderRoll(event, option) {
  const rows = modifierRows(option);
  const chance = calculateChance(option);
  $("#master-content").innerHTML = `
    <article class="event-card">
      <div class="event-alert">Mountain Master Check // ${event.check}</div>
      <h3>${option.label}</h3>
      <p>${option.detail}</p>
      <div class="roll-box">
        ${rows
          .map(
            ([label, value]) =>
              `<div class="roll-row"><span>${label}</span><strong>${value >= 0 ? "+" : ""}${value}%</strong></div>`
          )
          .join("")}
        <div class="roll-total"><span>Final chance</span><strong>${chance}%</strong></div>
      </div>
      <button class="primary-button full" type="button" id="roll-button">Roll Mountain Master Check</button>
    </article>
  `;

  $("#roll-button").addEventListener("click", () => {
    resolveRoll(option, chance);
  });
}

function resolveRoll(option, chance) {
  const roll = Math.ceil(Math.random() * 100);
  const success = roll <= chance;
  const time = success ? option.time : Math.round(option.time * 1.75);
  const o2 = success ? option.o2 : option.o2 - 7;
  const stamina = success ? option.stamina : option.stamina - 9;
  const morale = success ? option.morale : option.morale - 8;

  state.climbMinutes += time;
  state.oxygenReserve = clamp(state.oxygenReserve + o2, 0, 100);
  state.stamina = clamp(state.stamina + stamina, 0, 100);
  state.morale = clamp(state.morale + morale, 0, 100);

  if (!success && roll > 92) {
    state.losses += 1;
  }

  state.nextEventAt = clamp(state.progress + 0.15 + Math.random() * 0.19, 0.32, 0.94);
  state.lastRoll = { roll, chance, success, option, time };

  const outcomeTitle = success ? "Check passed." : "Check failed.";
  const outcomeText = success
    ? `The team executes the decision and remains intact. The climb loses ${time} climbing minutes, but the route stays alive.`
    : state.losses > 0
      ? `The decision breaks badly. The team loses ${time} climbing minutes and records a casualty. The mountain is now in control.`
      : `The team survives the move, but pays for it. The climb loses ${time} climbing minutes and morale drops.`;

  $("#master-content").innerHTML = `
    <article class="event-card">
      <div class="roll-result ${success ? "success" : "fail"}">
        <div class="roll-total"><span>Roll ${roll}</span><strong>${success ? "Success" : "Failure"}</strong></div>
      </div>
      <h3>${outcomeTitle}</h3>
      <p>${outcomeText}</p>
      <div class="roll-box">
        <div class="roll-row"><span>Clock impact</span><strong>+${fmtClimbTime(time)}</strong></div>
        <div class="roll-row"><span>Oxygen reserve</span><strong>${Math.round(state.oxygenReserve)}%</strong></div>
        <div class="roll-row"><span>Team stamina</span><strong>${Math.round(state.stamina)}%</strong></div>
        <div class="roll-row"><span>Losses</span><strong>${state.losses}</strong></div>
      </div>
      <button class="primary-button full" type="button" id="resume-button">${state.losses ? "Resume Under Emergency Protocol" : "Resume Expedition"}</button>
    </article>
  `;

  $("#resume-button").addEventListener("click", resumeExpedition);
  renderAll();
}

function resumeExpedition() {
  if (state.losses >= 2 || state.oxygenReserve <= 0 || state.stamina <= 0) {
    state.phase = "failed";
    stopTimer();
    renderFailure();
    renderAll();
    return;
  }
  state.phase = "running";
  state.activeEvent = null;
  $("#decision-badge").classList.add("hidden");
  renderMountainMasterIdle("Compression resumed.", "The mountain has accepted your decision for now. The team is moving again.");
  startTimer();
  renderAll();
}

function renderMountainMasterIdle(title, copy) {
  $("#decision-badge").classList.add("hidden");
  $("#master-content").innerHTML = `
    <div class="master-idle">
      <span class="mountain-master-mark">MM</span>
      <h3>${title}</h3>
      <p>${copy}</p>
    </div>
  `;
}

function renderSummit() {
  const score = expeditionScore();
  $("#decision-badge").classList.add("hidden");
  $("#master-content").innerHTML = `
    <article class="event-card">
      <div class="roll-result success">
        <div class="roll-total"><span>Summit reached</span><strong>${score.toLocaleString()} pts</strong></div>
      </div>
      <h3>The team stands on top.</h3>
      <p>The Mountain Master records the ascent. The season score rewards speed and clean decisions, with bonuses for harder oxygen strategies and penalties for high spend or losses.</p>
      <div class="roll-box">
        <div class="roll-row"><span>Final ascent time</span><strong>${fmtClimbTime(state.climbMinutes)}</strong></div>
        <div class="roll-row"><span>Expedition budget</span><strong>$${totalBudget().toLocaleString()}</strong></div>
        <div class="roll-row"><span>Losses recorded</span><strong>${state.losses}</strong></div>
        <div class="roll-row"><span>Oxygen style</span><strong>${selectedOxygen().label}</strong></div>
      </div>
      <button class="primary-button full" type="button" id="reset-button">Prepare Next Expedition</button>
    </article>
  `;
  $("#reset-button").addEventListener("click", resetToPrep);
  sendMountainNotification("Summit reached", `Final ascent time: ${fmtClimbTime(state.climbMinutes)}.`);
  renderAll();
}

function renderFailure() {
  $("#decision-badge").classList.add("hidden");
  $("#master-content").innerHTML = `
    <article class="event-card">
      <div class="roll-result fail">
        <div class="roll-total"><span>Expedition failed</span><strong>${state.losses} losses</strong></div>
      </div>
      <h3>The mountain closes the route.</h3>
      <p>The team cannot safely continue. The expedition is terminated and logged against the season board.</p>
      <button class="primary-button full" type="button" id="reset-button">Return to Preparation</button>
    </article>
  `;
  $("#reset-button").addEventListener("click", resetToPrep);
  sendMountainNotification("Expedition failed", "The team has been forced off the mountain.");
}

function resetToPrep() {
  stopTimer();
  state.phase = "prep";
  state.progress = 0;
  state.climbMinutes = 0;
  state.realSeconds = 0;
  state.oxygenReserve = 100;
  state.stamina = 100;
  state.morale = 100;
  state.losses = 0;
  state.activeEvent = null;
  state.lastRoll = null;
  renderMountainMasterIdle("The mountain is quiet.", "Prepare the next expedition. No timer runs until you launch.");
  renderAll();
}

function updateRouteGraphic() {
  const path = $("#route-base");
  const progress = $("#route-progress");
  const teamPin = $("#team-pin");
  const length = path.getTotalLength();
  const point = path.getPointAtLength(length * state.progress);

  progress.style.strokeDasharray = length;
  progress.style.strokeDashoffset = length * (1 - state.progress);
  teamPin.setAttribute("transform", `translate(${point.x} ${point.y})`);

  teamPin.classList.remove("stable", "warning", "danger", "rest");
  const pinStatus = $("#pin-status");
  pinStatus.classList.remove("warning", "danger", "rest");

  let mode = "stable";
  let label = "Stable";
  if (state.phase === "event") {
    mode = "danger";
    label = "Decision Required";
    pinStatus.classList.add("danger");
  } else if (state.phase === "prep") {
    mode = "rest";
    label = "Base Camp";
    pinStatus.classList.add("rest");
  } else if (state.oxygenReserve < 28 || state.stamina < 34 || planScore().risk > 48) {
    mode = "warning";
    label = "Risk Building";
    pinStatus.classList.add("warning");
  } else if (state.phase === "summit") {
    mode = "stable";
    label = "Summit Reached";
  }

  teamPin.classList.add(mode);
  $("#pin-status strong").textContent = label;
}

function renderAll() {
  const mountain = selectedMountain();
  const plan = planScore();
  state.targetHours = plan.targetHours;

  $("#route-title").textContent = `${mountain.name} ${mountain.route}`;
  $("#altitude-readout").textContent = fmtAltitude(5364 + (mountain.alt - 5364) * state.progress);
  $("#climb-clock").textContent =
    state.phase === "prep" ? "Not launched" : `${fmtClimbTime(state.climbMinutes)} / ${Math.round(state.targetHours)}h target`;

  $("#readiness-score").textContent = `${Math.round(plan.readiness)}%`;
  $(".readiness-ring").style.setProperty("--value", plan.readiness / 100);
  $("#readiness-copy").textContent =
    plan.risk < 22
      ? "Conservative plan. Slower, but the mountain has fewer openings."
      : plan.risk < 42
        ? "Balanced plan. Strong chance of summit if weather holds."
        : "Aggressive plan. Faster leaderboard path, higher failure exposure.";

  $("#prep-status").textContent = state.phase === "prep" ? "Draft" : "Locked";
  $("#phase-badge").textContent = state.phase === "event" ? "Paused" : state.phase;
  $("#progress-text").textContent = `${Math.round(state.progress * 100)}%`;
  $("#oxygen-text").textContent = `${Math.round(state.oxygenReserve)}%`;
  $("#stamina-text").textContent = `${Math.round(state.stamina)}%`;
  $("#morale-text").textContent = `${Math.round(state.morale)}%`;

  setBar("#progress-bar", state.progress * 100, "var(--orange)");
  setBar("#oxygen-bar", state.oxygenReserve, state.oxygenReserve < 30 ? "var(--red)" : "var(--blue)");
  setBar("#stamina-bar", state.stamina, state.stamina < 35 ? "var(--yellow)" : "var(--green)");
  setBar("#morale-bar", state.morale, state.morale < 35 ? "var(--yellow)" : "var(--green)");

  updateTeamStates();
  updateRouteGraphic();
  updateMountains();
}

function setBar(selector, value, color) {
  const el = $(selector);
  el.style.width = `${clamp(value, 0, 100)}%`;
  el.style.background = color;
}

function updateTeamStates() {
  const condition = state.phase === "event" ? "Awaiting orders" : state.phase === "running" ? "Moving" : state.phase === "summit" ? "Summit" : "Ready";
  $("#lapa-state").textContent = condition;
  $("#hana-state").textContent = state.oxygenReserve < 30 ? "O2 watch" : condition;
  $("#mingma-state").textContent = state.stamina < 35 ? "Fatigued" : condition;

  const dots = $$(".team-list .dot");
  dots.forEach((dot, index) => {
    dot.className = "dot green";
    if (state.phase === "event") dot.className = "dot red";
    if (index === 1 && state.oxygenReserve < 30) dot.className = "dot yellow";
    if (index === 2 && state.stamina < 35) dot.className = "dot yellow";
  });
}

function updateMountains() {
  $$(".mountain-tile").forEach((tile) => {
    tile.classList.toggle("active", tile.dataset.mountain === state.selection.mountain);
  });
}

function requestNotifications() {
  if (!("Notification" in window)) {
    $("#notify-button").textContent = "Alerts Unavailable";
    renderMountainMasterIdle("Alerts unavailable.", "This browser cannot send PEAKS notifications, but the Mountain Master will still pause the climb inside the app.");
    return;
  }
  Notification.requestPermission().then((permission) => {
    $("#notify-button").textContent = permission === "granted" ? "Alerts On" : "Alerts Blocked";
    if (permission === "granted") {
      renderMountainMasterIdle("Alerts enabled.", "You can leave the tab in the background. PEAKS will notify you when the expedition needs a decision.");
    }
  });
}

function sendMountainNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(`PEAKS: ${title}`, {
    body,
    tag: "peaks-mountain-master",
  });
}

function wireButtons() {
  ["#launch-top", "#launch-main", "#launch-prep"].forEach((selector) => {
    $(selector).addEventListener("click", launchExpedition);
  });
  $("#force-event").addEventListener("click", () => triggerEvent(true));
  $("#notify-button").addEventListener("click", requestNotifications);
}

function boot() {
  initChoices();
  initMountainGrid();
  wireButtons();
  renderMountainMasterIdle("The mountain is quiet.", "Prepare the expedition. No timer runs until you launch.");
  renderAll();
}

boot();
