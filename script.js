const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const VALUE_LABELS = { 11: "J", 12: "Q", 13: "K", 14: "A" };

const BOT_STYLE_PRESETS = {
  patient: { aggression: 0.2, bluff: 0.12, tightness: 0.78, label: "Patient" },
  aggressive: { aggression: 0.8, bluff: 0.33, tightness: 0.36, label: "Aggressive" },
  balanced: { aggression: 0.5, bluff: 0.2, tightness: 0.55, label: "Balanced" },
  tricky: { aggression: 0.58, bluff: 0.42, tightness: 0.45, label: "Tricky" },
};

const STREETS = ["preflop", "flop", "turn", "river"];
const STREET_LABELS = { preflop: "Pre-flop", flop: "Flop", turn: "Turn", river: "River", showdown: "Showdown" };

const handRankLabels = {
  8: "Straight flush",
  7: "Four of a kind",
  6: "Full house",
  5: "Flush",
  4: "Straight",
  3: "Three of a kind",
  2: "Two pair",
  1: "One pair",
  0: "High card",
};

const preflopTiers = [
  { name: "Premium", hands: ["AA", "KK", "QQ", "JJ", "AKs", "AQs", "AK"] },
  { name: "Strong", hands: ["TT", "99", "AQ", "AJs", "KQs", "ATs", "KJs"] },
  { name: "Playable", hands: ["88", "77", "66", "55", "44", "33", "22", "QJs", "JTs", "KTs", "QTs", "A9s", "A8s"] },
  { name: "Speculative", hands: ["J9s", "T9s", "98s", "87s", "76s", "65s", "A5s", "A4s", "KQo", "QJo", "JTo"] },
];

const state = {
  players: [],
  community: [],
  deck: [],
  pot: 0,
  handNumber: 1,
  currentBet: 0,
  minRaise: 10,
  currentPlayerIndex: 0,
  pendingActors: new Set(),
  street: "preflop",
  handActive: false,
  dealerIndex: 0,
  settings: {
    opponents: 3,
    startingBankroll: 1000,
    playerBankroll: 1000,
    showFolded: false,
    assistance: false,
    smallBlind: 5,
    bigBlind: 10,
    chipValue: 1,
    botBankrolls: [],
    botStyles: [],
    defaultBotStyle: "mixed",
  },
};

const elements = {
  opponentCount: document.getElementById("opponent-count"),
  assistToggle: document.getElementById("assist-toggle"),
  showFolded: document.getElementById("show-folded"),
  startingBankroll: document.getElementById("starting-bankroll"),
  playerBankroll: document.getElementById("player-bankroll"),
  smallBlind: document.getElementById("small-blind"),
  bigBlind: document.getElementById("big-blind"),
  chipValue: document.getElementById("chip-value"),
  botStyleDefault: document.getElementById("bot-style-default"),
  botBankrollSettings: document.getElementById("bot-bankroll-settings"),
  botStyleSettings: document.getElementById("bot-style-settings"),
  newTable: document.getElementById("new-table"),
  potValue: document.getElementById("pot-value"),
  players: document.getElementById("players"),
  playerHand: document.getElementById("player-hand"),
  playerChips: document.getElementById("player-chips"),
  playerBet: document.getElementById("player-bet"),
  community: document.getElementById("community-cards"),
  handStatus: document.getElementById("hand-status"),
  handNumber: document.getElementById("hand-number"),
  fold: document.getElementById("fold"),
  checkCall: document.getElementById("check-call"),
  raise: document.getElementById("raise"),
  raiseAmount: document.getElementById("raise-amount"),
  quickBets: document.querySelectorAll(".quick-bets button"),
  nextHand: document.getElementById("next-hand"),
  assistPanel: document.getElementById("assist-panel"),
  handStrength: document.getElementById("hand-strength"),
  handAdvice: document.getElementById("hand-advice"),
  opponentTells: document.getElementById("opponent-tells"),
  bettingGuidance: document.getElementById("betting-guidance"),
  log: document.getElementById("log"),
};

function createDeck() {
  const deck = [];
  SUITS.forEach((suit) => VALUES.forEach((value) => deck.push({ suit, value })));
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawCard() {
  return state.deck.pop();
}

function formatCard(card) {
  const label = VALUE_LABELS[card.value] || card.value;
  return `${label}${card.suit}`;
}

function cardElement(card, hidden = false) {
  const div = document.createElement("div");
  div.className = "card";
  if (hidden) {
    div.classList.add("back");
    div.textContent = "?";
    return div;
  }
  if (card.suit === "♥" || card.suit === "♦") {
    div.classList.add("red");
  }
  div.textContent = formatCard(card);
  return div;
}

function chipText(chips) {
  const value = chips * state.settings.chipValue;
  return `${chips} (${value})`;
}

function log(message) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = message;
  elements.log.prepend(entry);
}

function resetLog() {
  elements.log.innerHTML = "";
}

function getHandCode(cards) {
  const [a, b] = cards;
  const values = [a.value, b.value].sort((x, y) => y - x);
  const suited = a.suit === b.suit;
  const labelA = VALUE_LABELS[values[0]] || values[0];
  const labelB = VALUE_LABELS[values[1]] || values[1];
  if (values[0] === values[1]) return `${labelA}${labelB}`;
  return `${labelA}${labelB}${suited ? "s" : "o"}`;
}

function getPreflopTier(cards) {
  const code = getHandCode(cards);
  for (let i = 0; i < preflopTiers.length; i += 1) {
    if (preflopTiers[i].hands.includes(code)) return { tier: i + 1, label: preflopTiers[i].name };
  }
  return { tier: 5, label: "Marginal" };
}

function evaluateHand(cards) {
  const values = cards.map((card) => card.value).sort((a, b) => b - a);
  const counts = values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  const suits = cards.reduce((acc, card) => {
    acc[card.suit] = acc[card.suit] || [];
    acc[card.suit].push(card.value);
    return acc;
  }, {});

  const uniqueValues = Array.from(new Set(values));
  const sortedUnique = uniqueValues.sort((a, b) => b - a);

  const isStraight = (vals) => {
    const ordered = Array.from(new Set(vals)).sort((a, b) => b - a);
    for (let i = 0; i <= ordered.length - 5; i += 1) {
      const slice = ordered.slice(i, i + 5);
      if (slice[0] - slice[4] === 4) return slice[0];
    }
    if (ordered.includes(14) && ordered.includes(5) && ordered.includes(4) && ordered.includes(3) && ordered.includes(2)) return 5;
    return null;
  };

  let flushSuit = null;
  Object.keys(suits).forEach((suit) => {
    if (suits[suit].length >= 5) flushSuit = suit;
  });

  if (flushSuit) {
    const straightFlushHigh = isStraight(suits[flushSuit]);
    if (straightFlushHigh) return { rank: 8, values: [straightFlushHigh] };
  }

  const countValues = Object.entries(counts).sort((a, b) => {
    if (b[1] === a[1]) return Number(b[0]) - Number(a[0]);
    return b[1] - a[1];
  });

  if (countValues[0][1] === 4) {
    const quad = Number(countValues[0][0]);
    const kicker = sortedUnique.find((value) => value !== quad);
    return { rank: 7, values: [quad, kicker] };
  }

  if (countValues[0][1] === 3 && countValues[1] && countValues[1][1] >= 2) return { rank: 6, values: [Number(countValues[0][0]), Number(countValues[1][0])] };
  if (flushSuit) return { rank: 5, values: suits[flushSuit].sort((a, b) => b - a).slice(0, 5) };

  const straightHigh = isStraight(values);
  if (straightHigh) return { rank: 4, values: [straightHigh] };

  if (countValues[0][1] === 3) {
    const trips = Number(countValues[0][0]);
    const kickers = sortedUnique.filter((value) => value !== trips).slice(0, 2);
    return { rank: 3, values: [trips, ...kickers] };
  }

  if (countValues[0][1] === 2 && countValues[1] && countValues[1][1] === 2) {
    const highPair = Math.max(Number(countValues[0][0]), Number(countValues[1][0]));
    const lowPair = Math.min(Number(countValues[0][0]), Number(countValues[1][0]));
    const kicker = sortedUnique.find((value) => value !== highPair && value !== lowPair);
    return { rank: 2, values: [highPair, lowPair, kicker] };
  }

  if (countValues[0][1] === 2) {
    const pair = Number(countValues[0][0]);
    return { rank: 1, values: [pair, ...sortedUnique.filter((value) => value !== pair).slice(0, 3)] };
  }

  return { rank: 0, values: sortedUnique.slice(0, 5) };
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.values.length, b.values.length); i += 1) {
    const av = a.values[i] || 0;
    const bv = b.values[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function buildBotProfile(styleKey, index) {
  if (styleKey === "mixed") {
    const keys = Object.keys(BOT_STYLE_PRESETS);
    return buildBotProfile(keys[index % keys.length], index);
  }
  const template = BOT_STYLE_PRESETS[styleKey] || BOT_STYLE_PRESETS.balanced;
  return {
    ...template,
    aggression: Math.max(0.05, Math.min(0.95, template.aggression + (Math.random() - 0.5) * 0.16)),
    bluff: Math.max(0.05, Math.min(0.95, template.bluff + (Math.random() - 0.5) * 0.12)),
    tightness: Math.max(0.05, Math.min(0.95, template.tightness + (Math.random() - 0.5) * 0.14)),
  };
}

function createPlayers() {
  const players = [
    {
      id: "human",
      isHuman: true,
      name: "You",
      chips: state.settings.playerBankroll,
      streetBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      hand: [],
    },
  ];

  for (let i = 0; i < state.settings.opponents; i += 1) {
    const styleKey = state.settings.botStyles[i] || state.settings.defaultBotStyle;
    const profile = buildBotProfile(styleKey, i);
    const bankroll = state.settings.botBankrolls[i] || state.settings.startingBankroll;
    players.push({
      id: `bot-${i + 1}`,
      isHuman: false,
      name: `${profile.label} Bot ${i + 1}`,
      chips: bankroll,
      streetBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      hand: [],
      personality: profile,
    });
  }

  state.players = players;
}

function renderDynamicSettings() {
  const opponents = Number(elements.opponentCount.value);
  const defaultBankroll = Number(elements.startingBankroll.value) || 1000;

  elements.botBankrollSettings.innerHTML = "";
  elements.botStyleSettings.innerHTML = "";

  for (let i = 0; i < opponents; i += 1) {
    const bankrollRow = document.createElement("div");
    bankrollRow.className = "dynamic-row";
    bankrollRow.innerHTML = `
      <span>Bot ${i + 1} bankroll</span>
      <input type="number" data-bankroll-index="${i}" min="100" step="50" value="${state.settings.botBankrolls[i] || defaultBankroll}" />
    `;
    elements.botBankrollSettings.appendChild(bankrollRow);

    const styleRow = document.createElement("div");
    styleRow.className = "dynamic-row";
    styleRow.innerHTML = `
      <span>Bot ${i + 1} style</span>
      <select data-style-index="${i}">
        <option value="mixed">Mixed</option>
        <option value="patient">Patient</option>
        <option value="aggressive">Aggressive</option>
        <option value="balanced">Balanced</option>
        <option value="tricky">Tricky</option>
      </select>
    `;
    elements.botStyleSettings.appendChild(styleRow);
    const select = styleRow.querySelector("select");
    select.value = state.settings.botStyles[i] || "mixed";
  }
}

function setSettingsFromInputs() {
  state.settings.opponents = Number(elements.opponentCount.value);
  state.settings.startingBankroll = Math.max(100, Number(elements.startingBankroll.value) || 1000);
  state.settings.playerBankroll = Math.max(100, Number(elements.playerBankroll.value) || state.settings.startingBankroll);
  state.settings.showFolded = elements.showFolded.checked;
  state.settings.assistance = elements.assistToggle.checked;
  state.settings.smallBlind = Math.max(1, Number(elements.smallBlind.value) || 5);
  state.settings.bigBlind = Math.max(state.settings.smallBlind * 2, Number(elements.bigBlind.value) || 10);
  state.settings.chipValue = Math.max(1, Number(elements.chipValue.value) || 1);
  state.settings.defaultBotStyle = elements.botStyleDefault.value;

  const bankrollInputs = Array.from(document.querySelectorAll("[data-bankroll-index]"));
  state.settings.botBankrolls = bankrollInputs.map((input) => Math.max(100, Number(input.value) || state.settings.startingBankroll));

  const styleInputs = Array.from(document.querySelectorAll("[data-style-index]"));
  state.settings.botStyles = styleInputs.map((input) => input.value);
}

function updatePot() {
  elements.potValue.textContent = chipText(state.pot);
}

function updateHandNumber() {
  elements.handNumber.textContent = state.handNumber;
}

function activePlayers() {
  return state.players.filter((player) => !player.folded);
}

function eligibleActors() {
  return state.players.filter((player) => !player.folded && !player.allIn);
}

function nextSeat(index) {
  return (index + 1) % state.players.length;
}

function findNextEligible(fromIndex) {
  for (let step = 1; step <= state.players.length; step += 1) {
    const idx = (fromIndex + step) % state.players.length;
    const p = state.players[idx];
    if (!p.folded && !p.allIn) return idx;
  }
  return -1;
}

function applyBet(player, amount) {
  const bet = Math.max(0, Math.min(player.chips, amount));
  player.chips -= bet;
  player.streetBet += bet;
  player.totalBet += bet;
  state.pot += bet;
  if (player.chips === 0) player.allIn = true;
  return bet;
}

function renderCommunity() {
  elements.community.innerHTML = "";
  state.community.forEach((card) => elements.community.appendChild(cardElement(card, false)));
}

function renderPlayers() {
  elements.players.innerHTML = "";
  state.players
    .filter((p) => !p.isHuman)
    .forEach((player, i) => {
      const seatIndex = i + 1;
      const wrapper = document.createElement("div");
      wrapper.className = "player";
      if (player.folded) wrapper.classList.add("folded");
      if (seatIndex === state.currentPlayerIndex && state.handActive) wrapper.classList.add("current-turn");

      const cards = document.createElement("div");
      cards.className = "hand";
      const reveal = state.settings.showFolded && player.folded;
      player.hand.forEach((card) => cards.appendChild(cardElement(card, !reveal && state.street !== "showdown")));

      wrapper.innerHTML = `<div class="player-name">${player.name}</div>
      <div class="player-meta">Chips: ${chipText(player.chips)} · Street bet: ${player.streetBet}${player.allIn ? " · All-in" : ""}</div>`;
      wrapper.appendChild(cards);
      elements.players.appendChild(wrapper);
    });
}

function renderPlayerHand() {
  const human = state.players[0];
  elements.playerHand.innerHTML = "";
  human.hand.forEach((card) => elements.playerHand.appendChild(cardElement(card, false)));
  elements.playerChips.textContent = chipText(human.chips);
  elements.playerBet.textContent = human.streetBet;
}

function updateStatus(message) {
  elements.handStatus.textContent = message;
}

function updateActions() {
  const human = state.players[0];
  const isTurn = state.handActive && state.currentPlayerIndex === 0 && !human.folded && !human.allIn;
  const toCall = Math.max(0, state.currentBet - human.streetBet);

  elements.fold.disabled = !isTurn;
  elements.checkCall.disabled = !isTurn;
  elements.raise.disabled = !isTurn;
  elements.raiseAmount.disabled = !isTurn;
  elements.quickBets.forEach((button) => {
    button.disabled = !isTurn;
  });

  elements.checkCall.textContent = toCall === 0 ? "Check" : `Call ${toCall}`;
  const minRaiseTo = state.currentBet + state.minRaise;
  const defaultRaise = Math.min(human.streetBet + human.chips, Math.max(minRaiseTo, state.currentBet + state.settings.bigBlind));
  elements.raiseAmount.min = minRaiseTo;
  elements.raiseAmount.value = defaultRaise;
}

function resetForNewHand() {
  state.community = [];
  state.deck = shuffle(createDeck());
  state.street = "preflop";
  state.pot = 0;
  state.currentBet = 0;
  state.minRaise = state.settings.bigBlind;
  state.pendingActors = new Set();
  state.handActive = true;

  state.players.forEach((player) => {
    player.folded = player.chips <= 0;
    player.allIn = player.chips <= 0;
    player.hand = player.folded ? [] : [drawCard(), drawCard()];
    player.streetBet = 0;
    player.totalBet = 0;
  });
}

function collectBlinds() {
  const sbIndex = findNextEligible(state.dealerIndex);
  const bbIndex = findNextEligible(sbIndex);

  if (sbIndex === -1 || bbIndex === -1) return false;

  const sb = applyBet(state.players[sbIndex], state.settings.smallBlind);
  const bb = applyBet(state.players[bbIndex], state.settings.bigBlind);
  state.currentBet = Math.max(sb, bb);
  state.minRaise = state.settings.bigBlind;

  log(`${state.players[sbIndex].name} posts small blind ${sb}.`);
  log(`${state.players[bbIndex].name} posts big blind ${bb}.`);

  const firstToAct = findNextEligible(bbIndex);
  initializePendingActors(firstToAct, bbIndex);
  state.currentPlayerIndex = firstToAct;

  return true;
}

function initializePendingActors(startIndex, aggressorIndex = null) {
  state.pendingActors = new Set();
  let idx = startIndex;
  for (let step = 0; step < state.players.length; step += 1) {
    const player = state.players[idx];
    if (!player.folded && !player.allIn && idx !== aggressorIndex) {
      state.pendingActors.add(idx);
    }
    idx = nextSeat(idx);
  }
}

function startStreet(street) {
  state.street = street;
  state.currentBet = 0;
  state.minRaise = state.settings.bigBlind;
  state.players.forEach((p) => {
    p.streetBet = 0;
  });

  if (street === "flop") state.community.push(drawCard(), drawCard(), drawCard());
  if (street === "turn") state.community.push(drawCard());
  if (street === "river") state.community.push(drawCard());

  const first = findNextEligible(state.dealerIndex);
  initializePendingActors(first, null);
  state.currentPlayerIndex = first;

  renderCommunity();
  log(`${STREET_LABELS[street]} dealt.`);
}

function finalizeSingleWinner(player) {
  player.chips += state.pot;
  log(`${player.name} wins ${state.pot} (everyone else folded).`);
  state.pot = 0;
  state.handActive = false;
  state.street = "showdown";
  updateStatus(`${player.name} wins the hand.`);
  elements.nextHand.hidden = false;
}

function resolveShowdown() {
  state.street = "showdown";
  const contenders = state.players.filter((player) => !player.folded);
  const scored = contenders.map((player) => ({ player, hand: evaluateHand([...player.hand, ...state.community]) }));
  scored.sort((a, b) => compareHands(a.hand, b.hand)).reverse();

  const best = scored[0].hand;
  const winners = scored.filter((entry) => compareHands(entry.hand, best) === 0);
  const payout = Math.floor(state.pot / winners.length);
  winners.forEach((entry) => {
    entry.player.chips += payout;
  });

  if (winners.length === 1) {
    log(`${winners[0].player.name} wins ${payout} with ${handRankLabels[best.rank]}.`);
    updateStatus(`${winners[0].player.name} wins with ${handRankLabels[best.rank]}.`);
  } else {
    log(`Split pot: ${winners.map((w) => w.player.name).join(", ")} each receive ${payout}.`);
    updateStatus(`Split pot between ${winners.map((w) => w.player.name).join(", ")}.`);
  }

  state.pot = 0;
  state.handActive = false;
  elements.nextHand.hidden = false;
}

function maybeProgressHand() {
  const livePlayers = activePlayers();
  if (livePlayers.length === 1) {
    finalizeSingleWinner(livePlayers[0]);
    renderAll();
    return;
  }

  if (state.pendingActors.size > 0) {
    const next = findNextPending(state.currentPlayerIndex);
    if (next >= 0) state.currentPlayerIndex = next;
    renderAll();
    runBotsIfNeeded();
    return;
  }

  const nextStreetIndex = STREETS.indexOf(state.street) + 1;
  if (nextStreetIndex >= STREETS.length) {
    resolveShowdown();
    renderAll();
    return;
  }

  startStreet(STREETS[nextStreetIndex]);
  updateStatus(`${STREET_LABELS[state.street]}: ${state.currentPlayerIndex === 0 ? "your turn" : "bot action"}.`);
  renderAll();
  runBotsIfNeeded();
}

function findNextPending(fromIndex) {
  for (let step = 1; step <= state.players.length; step += 1) {
    const idx = (fromIndex + step) % state.players.length;
    if (state.pendingActors.has(idx)) return idx;
  }
  return -1;
}

function processAction(index, action, requestedRaiseTo = 0) {
  const player = state.players[index];
  if (!state.pendingActors.has(index) || player.folded || player.allIn) return;

  const toCall = Math.max(0, state.currentBet - player.streetBet);

  if (action === "fold") {
    player.folded = true;
    state.pendingActors.delete(index);
    log(`${player.name} folds.`);
  } else if (action === "call") {
    const paid = applyBet(player, toCall);
    state.pendingActors.delete(index);
    if (toCall === 0) {
      log(`${player.name} checks.`);
    } else {
      log(`${player.name} calls ${paid}.`);
    }
  } else if (action === "raise") {
    const minRaiseTo = state.currentBet + state.minRaise;
    const maxRaiseTo = player.streetBet + player.chips;
    const raiseTo = Math.max(minRaiseTo, Math.min(maxRaiseTo, requestedRaiseTo));
    const raiseDelta = raiseTo - state.currentBet;

    applyBet(player, raiseTo - player.streetBet);
    state.currentBet = player.streetBet;
    state.minRaise = Math.max(state.settings.bigBlind, raiseDelta);

    initializePendingActors(findNextEligible(index), index);
    log(`${player.name} raises to ${raiseTo}.`);
  }

  maybeProgressHand();
}

function botDecision(bot) {
  const toCall = Math.max(0, state.currentBet - bot.streetBet);
  const preflopStrength = (6 - getPreflopTier(bot.hand).tier) / 5;
  const boardStrength = state.community.length >= 3 ? evaluateHand([...bot.hand, ...state.community]).rank / 8 : preflopStrength;
  const strength = Math.max(preflopStrength * 0.6, boardStrength * 0.8);
  const pressure = toCall > 0 ? toCall / Math.max(1, bot.chips + bot.streetBet) : 0;

  if (strength < 0.32 && pressure > 0.2 && bot.personality.tightness > 0.55) return { action: "fold" };
  if (toCall > 0 && strength < 0.2) return { action: "fold" };

  const raiseBias = bot.personality.aggression * 0.6 + bot.personality.bluff * 0.25 + strength * 0.5 - pressure;
  if (raiseBias > 0.68 && bot.chips > 0) {
    const target = state.currentBet + Math.max(state.minRaise, Math.floor((state.pot + toCall) * (0.35 + bot.personality.aggression * 0.25)));
    return { action: "raise", amount: target };
  }

  return { action: "call" };
}

function runBotsIfNeeded() {
  while (state.handActive && state.currentPlayerIndex !== 0) {
    const bot = state.players[state.currentPlayerIndex];
    if (!state.pendingActors.has(state.currentPlayerIndex)) {
      maybeProgressHand();
      continue;
    }
    const decision = botDecision(bot);
    processAction(state.currentPlayerIndex, decision.action, decision.amount);
  }

  if (state.handActive && state.currentPlayerIndex === 0) {
    updateStatus(`${STREET_LABELS[state.street]}: your turn.`);
  }
  renderAll();
}

function handlePlayerAction(action) {
  if (!state.handActive || state.currentPlayerIndex !== 0) return;
  const amount = Number(elements.raiseAmount.value);
  processAction(0, action, amount);
  renderAll();
}

function setQuickBet(type) {
  const human = state.players[0];
  const toCall = Math.max(0, state.currentBet - human.streetBet);
  if (type === "allin") elements.raiseAmount.value = human.streetBet + human.chips;
  if (type === "min") elements.raiseAmount.value = state.currentBet + state.minRaise;
  if (type === "half") elements.raiseAmount.value = state.currentBet + Math.floor((state.pot + toCall) * 0.5);
  if (type === "pot") elements.raiseAmount.value = state.currentBet + state.pot + toCall;
}

function startHand() {
  resetLog();
  elements.nextHand.hidden = true;

  resetForNewHand();
  if (!collectBlinds()) {
    updateStatus("Not enough players with chips to continue.");
    state.handActive = false;
    renderAll();
    return;
  }

  updateStatus(`${STREET_LABELS[state.street]}: ${state.currentPlayerIndex === 0 ? "your turn" : "bot action"}.`);
  renderAll();
  runBotsIfNeeded();
}

function resetTable() {
  setSettingsFromInputs();
  createPlayers();
  state.handNumber = 1;
  state.dealerIndex = 0;
  startHand();
}

function nextHand() {
  state.handNumber += 1;
  state.dealerIndex = nextSeat(state.dealerIndex);
  startHand();
}

function updateAssist() {
  if (!state.settings.assistance || !state.players.length) {
    elements.assistPanel.hidden = true;
    return;
  }

  elements.assistPanel.hidden = false;
  const human = state.players[0];
  const tier = human.hand.length ? getPreflopTier(human.hand) : { label: "---", tier: 5 };
  const evaluated = human.hand.length ? evaluateHand([...human.hand, ...state.community]) : { rank: 0 };
  const toCall = Math.max(0, state.currentBet - human.streetBet);

  elements.handStrength.textContent = `Pre-flop tier: ${tier.label}. Current made hand: ${handRankLabels[evaluated.rank]}.`;

  let advice = "Play balanced and prioritize position.";
  if (tier.tier <= 2) advice = "Strong opening range: raising for value is often good.";
  else if (tier.tier >= 4 && toCall > 0) advice = "Marginal holding facing a bet: folding is frequently best.";
  else if (toCall === 0) advice = "No bet to call: check or apply pressure with a small raise.";

  elements.handAdvice.textContent = advice;
  elements.opponentTells.innerHTML = "";

  state.players
    .filter((player) => !player.isHuman && !player.folded)
    .forEach((bot) => {
      const li = document.createElement("li");
      li.textContent = `${bot.name}: aggression ${Math.round(bot.personality.aggression * 100)}%, bluff ${Math.round(bot.personality.bluff * 100)}%.`;
      elements.opponentTells.appendChild(li);
    });

  const potOdds = toCall > 0 ? Math.round((toCall / (state.pot + toCall)) * 100) : 0;
  elements.bettingGuidance.textContent = toCall > 0
    ? `Call requires roughly ${potOdds}% equity.`
    : "You can check behind or open betting this street.";
}

function renderAll() {
  updateHandNumber();
  updatePot();
  renderCommunity();
  renderPlayers();
  renderPlayerHand();
  updateActions();
  updateAssist();
}

function bindEvents() {
  elements.opponentCount.addEventListener("change", renderDynamicSettings);
  elements.startingBankroll.addEventListener("input", renderDynamicSettings);

  elements.botStyleDefault.addEventListener("change", () => {
    renderDynamicSettings();
  });

  elements.assistToggle.addEventListener("change", () => {
    state.settings.assistance = elements.assistToggle.checked;
    updateAssist();
  });

  elements.showFolded.addEventListener("change", () => {
    state.settings.showFolded = elements.showFolded.checked;
    renderPlayers();
  });

  elements.newTable.addEventListener("click", resetTable);
  elements.fold.addEventListener("click", () => handlePlayerAction("fold"));
  elements.checkCall.addEventListener("click", () => handlePlayerAction("call"));
  elements.raise.addEventListener("click", () => handlePlayerAction("raise"));
  elements.quickBets.forEach((button) => {
    button.addEventListener("click", () => setQuickBet(button.dataset.bet));
  });
  elements.nextHand.addEventListener("click", nextHand);
}

bindEvents();
renderDynamicSettings();
resetTable();
