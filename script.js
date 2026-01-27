const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const VALUE_LABELS = {
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

const state = {
  players: [],
  community: [],
  pot: 0,
  currentBet: 0,
  handNumber: 1,
  deck: [],
  phase: "idle",
  dealerIndex: 0,
  currentPlayerIndex: 0,
  lastAggressorIndex: 0,
  actedThisRound: [],
  activePlayerId: null,
  actionInProgress: false,
  settings: {
    opponents: 3,
    showFolded: false,
    showAllHands: false,
    showWinOdds: false,
    showStreetHelp: true,
    showPositionHelp: true,
    fastForward: false,
    assistance: false,
    startingBankroll: 1000,
    theme: "emerald",
    actionDelay: 800,
  },
  auth: {
    username: null,
  },
};

const elements = {
  opponentCount: document.getElementById("opponent-count"),
  assistToggle: document.getElementById("assist-toggle"),
  showFolded: document.getElementById("show-folded"),
  showAllHands: document.getElementById("show-all-hands"),
  showWinOdds: document.getElementById("show-win-odds"),
  showStreetHelp: document.getElementById("show-street-help"),
  showPositionHelp: document.getElementById("show-position-help"),
  fastForward: document.getElementById("fast-forward"),
  startingBankroll: document.getElementById("starting-bankroll"),
  themeSelect: document.getElementById("theme-select"),
  actionDelay: document.getElementById("action-delay"),
  newTable: document.getElementById("new-table"),
  potValue: document.getElementById("pot-value"),
  players: document.getElementById("players"),
  playerArea: document.getElementById("player-area"),
  playerHand: document.getElementById("player-hand"),
  playerChips: document.getElementById("player-chips"),
  playerBet: document.getElementById("player-bet"),
  playerPosition: document.getElementById("player-position"),
  playerAction: document.getElementById("player-action"),
  community: document.getElementById("community-cards"),
  handStatus: document.getElementById("hand-status"),
  streetLabel: document.getElementById("street-label"),
  handNumber: document.getElementById("hand-number"),
  fold: document.getElementById("fold"),
  checkCall: document.getElementById("check-call"),
  raise: document.getElementById("raise"),
  raiseAmount: document.getElementById("raise-amount"),
  quickBets: document.querySelectorAll(".quick-bets button"),
  continueHand: document.getElementById("continue-hand"),
  nextHand: document.getElementById("next-hand"),
  assistPanel: document.getElementById("assist-panel"),
  handStrength: document.getElementById("hand-strength"),
  handAdvice: document.getElementById("hand-advice"),
  opponentTells: document.getElementById("opponent-tells"),
  bettingGuidance: document.getElementById("betting-guidance"),
  log: document.getElementById("log"),
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  signIn: document.getElementById("sign-in"),
  signOut: document.getElementById("sign-out"),
  authStatus: document.getElementById("auth-status"),
  tabs: document.querySelectorAll(".tab-button"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  positionTips: document.getElementById("position-tips"),
};

const personalities = [
  "Patient",
  "Loose",
  "Aggressive",
  "Tricky",
  "Balanced",
  "Bold",
  "Quiet",
  "Analytical",
  "Showman",
  "Stone-face",
];

const preflopTiers = [
  { name: "Premium", hands: ["AA", "KK", "QQ", "JJ", "AKs", "AQs", "AK"] },
  { name: "Strong", hands: ["TT", "99", "AQ", "AJs", "KQs", "ATs", "KJs"] },
  { name: "Playable", hands: ["88", "77", "66", "55", "44", "33", "22", "QJs", "JTs", "KTs", "QTs", "A9s", "A8s"] },
  { name: "Speculative", hands: ["J9s", "T9s", "98s", "87s", "76s", "65s", "A5s", "A4s", "KQo", "QJo", "JTo"] },
];

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

const positionOrder = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "MP+1", "HJ", "CO"];

const streetLabels = {
  preflop: "Pre-flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

function createDeck() {
  const deck = [];
  SUITS.forEach((suit) => {
    VALUES.forEach((value) => deck.push({ suit, value }));
  });
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

function log(message) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = message;
  elements.log.prepend(entry);
}

function resetLog() {
  elements.log.innerHTML = "";
}

function generatePersonality(index) {
  const archetype = personalities[index % personalities.length];
  return {
    name: `${archetype} Bot ${index + 1}`,
    aggression: 0.3 + Math.random() * 0.7,
    bluff: 0.1 + Math.random() * 0.4,
    tightness: 0.3 + Math.random() * 0.6,
    archetype,
  };
}

function setupPlayers() {
  const players = [];
  const bankroll = Number(state.settings.startingBankroll) || 1000;
  players.push({
    id: "human",
    name: "You",
    chips: bankroll,
    hand: [],
    bet: 0,
    folded: false,
    isHuman: true,
  });

  for (let i = 0; i < state.settings.opponents; i += 1) {
    const personality = generatePersonality(i);
    players.push({
      id: `bot-${i}`,
      name: personality.name,
      chips: bankroll,
      hand: [],
      bet: 0,
      folded: false,
      lastAction: null,
      isHuman: false,
      personality,
    });
  }

  state.players = players;
}

function getPositionLabel(index) {
  const playerCount = state.players.length;
  const offset = (index - state.dealerIndex + playerCount) % playerCount;
  if (playerCount === 2) {
    return offset === 0 ? "BTN/SB" : "BB";
  }
  return positionOrder[offset] || `Seat ${offset + 1}`;
}

function setActivePlayer(index) {
  const player = state.players[index];
  state.activePlayerId = player ? player.id : null;
}

function renderPlayers() {
  elements.players.innerHTML = "";
  state.players
    .filter((player) => !player.isHuman)
    .forEach((player) => {
      const wrapper = document.createElement("div");
      wrapper.className = "player";
      wrapper.dataset.playerId = player.id;
      if (player.folded) {
        wrapper.classList.add("folded");
      }
      if (player.id === state.activePlayerId) {
        wrapper.classList.add("is-active");
      }
      const cards = document.createElement("div");
      cards.className = "hand";
      const reveal = state.settings.showAllHands || (state.settings.showFolded && player.folded);
      player.hand.forEach((card) => {
        cards.appendChild(cardElement(card, !reveal && state.phase !== "showdown"));
      });
      const odds = player.odds ? ` · Win: ${player.odds}%` : "";
      wrapper.innerHTML = `
        <div class="player-name">${player.name}</div>
        <div class="player-meta">
          <span>Chips: ${player.chips} · Bet: ${player.bet}${odds}</span>
          ${state.settings.showPositionHelp ? `<span class="player-position">${getPositionLabel(state.players.indexOf(player))}</span>` : ""}
        </div>
        <div class="action-indicator ${player.lastAction ? "show" : ""}">
          ${player.lastAction === "raise" ? "▲" : player.lastAction === "call" || player.lastAction === "check" ? "●" : player.lastAction === "fold" ? "✕" : ""}
        </div>
      `;
      wrapper.appendChild(cards);
      elements.players.appendChild(wrapper);
    });
}

function renderCommunity() {
  elements.community.innerHTML = "";
  state.community.forEach((card) => {
    elements.community.appendChild(cardElement(card, false));
  });
}

function renderPlayerHand() {
  elements.playerHand.innerHTML = "";
  const human = state.players[0];
  human.hand.forEach((card) => {
    elements.playerHand.appendChild(cardElement(card, false));
  });
  elements.playerChips.textContent = human.chips;
  elements.playerBet.textContent = human.bet;
  elements.playerPosition.textContent = getPositionLabel(0);
  elements.playerAction.textContent = human.lastAction
    ? `Last action: ${human.lastAction}`
    : state.activePlayerId === human.id
      ? "Your turn"
      : "Awaiting action";
  if (state.activePlayerId === human.id) {
    elements.playerArea.classList.add("is-active");
  } else {
    elements.playerArea.classList.remove("is-active");
  }
}

function updateStatus(message) {
  elements.handStatus.textContent = message;
}

function updateStreetLabel() {
  if (!elements.streetLabel) return;
  if (!state.settings.showStreetHelp) {
    elements.streetLabel.textContent = "";
    return;
  }
  elements.streetLabel.textContent = streetLabels[state.phase] || "";
}

function updatePot() {
  elements.potValue.textContent = state.pot;
}

function updateHandNumber() {
  elements.handNumber.textContent = state.handNumber;
}

function dealHands() {
  state.players.forEach((player) => {
    player.hand = [drawCard(), drawCard()];
    player.folded = false;
    player.bet = 0;
    player.lastAction = null;
    player.odds = null;
  });
}

function postBlinds() {
  const smallBlind = 5;
  const bigBlind = 10;
  const playerCount = state.players.length;
  const smallBlindIndex = playerCount === 2
    ? state.dealerIndex
    : (state.dealerIndex + 1) % playerCount;
  const bigBlindIndex = playerCount === 2
    ? (state.dealerIndex + 1) % playerCount
    : (state.dealerIndex + 2) % playerCount;
  const smallBlindPlayer = state.players[smallBlindIndex];
  const bigBlindPlayer = state.players[bigBlindIndex];

  applyBet(smallBlindPlayer, smallBlind);
  applyBet(bigBlindPlayer, bigBlind);

  state.pot = smallBlind + bigBlind;
  state.currentBet = bigBlind;
  state.lastAggressorIndex = bigBlindIndex;

  log(`Blinds posted. ${smallBlindPlayer.name}: ${smallBlind}, ${bigBlindPlayer.name}: ${bigBlind}.`);
}

function nextActiveIndex(fromIndex) {
  const total = state.players.length;
  for (let i = 1; i <= total; i += 1) {
    const idx = (fromIndex + i) % total;
    const player = state.players[idx];
    if (!player.folded && player.chips > 0) {
      return idx;
    }
  }
  return fromIndex;
}

function resetBetsForRound() {
  state.players.forEach((player) => {
    player.bet = 0;
  });
  state.currentBet = 0;
  state.actedThisRound = state.players.map((player) => player.folded || player.chips === 0);
}

function beginBettingRound(startIndex) {
  state.actedThisRound = state.players.map((player) => player.folded || player.chips === 0);
  state.currentPlayerIndex = startIndex;
  setActivePlayer(startIndex);
  updateStreetLabel();
  renderPlayers();
  renderPlayerHand();
}

function startHand() {
  resetLog();
  state.deck = shuffle(createDeck());
  state.community = [];
  state.phase = "preflop";
  state.actionInProgress = false;

  dealHands();
  postBlinds();

  const playerCount = state.players.length;
  const bigBlindIndex = playerCount === 2
    ? (state.dealerIndex + 1) % playerCount
    : (state.dealerIndex + 2) % playerCount;
  const firstToAct = nextActiveIndex(bigBlindIndex);
  beginBettingRound(firstToAct);

  updateStatus(`${streetLabels[state.phase]}: ${state.players[firstToAct].name} to act.`);
  updatePot();
  updateHandNumber();
  updateActions();
  renderCommunity();
  updateAssist();
  updateWinOdds();
  maybeProcessBots();
}

function updateActions() {
  const human = state.players[0];
  const toCall = Math.max(0, state.currentBet - human.bet);
  elements.checkCall.textContent = toCall === 0 ? "Check" : `Call ${toCall}`;
  elements.raiseAmount.value = Math.max(state.currentBet + 10, 10);
  const isHumanTurn = state.activePlayerId === human.id;
  [elements.fold, elements.checkCall, elements.raise].forEach((button) => {
    button.disabled = !isHumanTurn;
  });
  elements.raiseAmount.disabled = !isHumanTurn;
  elements.continueHand.hidden = true;
  elements.nextHand.hidden = true;
}

function getHandCode(cards) {
  const [a, b] = cards;
  const values = [a.value, b.value].sort((x, y) => y - x);
  const suited = a.suit === b.suit;
  const labelA = VALUE_LABELS[values[0]] || values[0];
  const labelB = VALUE_LABELS[values[1]] || values[1];
  if (values[0] === values[1]) {
    return `${labelA}${labelB}`;
  }
  return `${labelA}${labelB}${suited ? "s" : "o"}`;
}

function getPreflopTier(cards) {
  const code = getHandCode(cards);
  for (let i = 0; i < preflopTiers.length; i += 1) {
    if (preflopTiers[i].hands.includes(code)) {
      return { tier: i + 1, label: preflopTiers[i].name };
    }
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
      if (slice[0] - slice[4] === 4) {
        return slice[0];
      }
    }
    if (ordered.includes(14) && ordered.includes(5) && ordered.includes(4) && ordered.includes(3) && ordered.includes(2)) {
      return 5;
    }
    return null;
  };

  let flushSuit = null;
  Object.keys(suits).forEach((suit) => {
    if (suits[suit].length >= 5) {
      flushSuit = suit;
    }
  });

  if (flushSuit) {
    const straightFlushHigh = isStraight(suits[flushSuit]);
    if (straightFlushHigh) {
      return { rank: 8, values: [straightFlushHigh] };
    }
  }

  const countValues = Object.entries(counts).sort((a, b) => {
    if (b[1] === a[1]) {
      return Number(b[0]) - Number(a[0]);
    }
    return b[1] - a[1];
  });

  if (countValues[0][1] === 4) {
    const quad = Number(countValues[0][0]);
    const kicker = sortedUnique.find((value) => value !== quad);
    return { rank: 7, values: [quad, kicker] };
  }

  if (countValues[0][1] === 3 && countValues[1] && countValues[1][1] >= 2) {
    return { rank: 6, values: [Number(countValues[0][0]), Number(countValues[1][0])] };
  }

  if (flushSuit) {
    const flushValues = suits[flushSuit].sort((a, b) => b - a).slice(0, 5);
    return { rank: 5, values: flushValues };
  }

  const straightHigh = isStraight(values);
  if (straightHigh) {
    return { rank: 4, values: [straightHigh] };
  }

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
    const kickers = sortedUnique.filter((value) => value !== pair).slice(0, 3);
    return { rank: 1, values: [pair, ...kickers] };
  }

  return { rank: 0, values: sortedUnique.slice(0, 5) };
}

function compareHands(a, b) {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  for (let i = 0; i < a.values.length; i += 1) {
    if (a.values[i] !== b.values[i]) {
      return a.values[i] - b.values[i];
    }
  }
  return 0;
}

function resolveShowdown() {
  state.phase = "showdown";
  setActivePlayer(null);
  while (state.community.length < 5) {
    state.community.push(drawCard());
  }
  updateStreetLabel();
  renderCommunity();

  const activePlayers = state.players.filter((player) => !player.folded);
  const evaluated = activePlayers.map((player) => {
    const hand = evaluateHand([...player.hand, ...state.community]);
    return { player, hand };
  });

  evaluated.sort((a, b) => compareHands(a.hand, b.hand)).reverse();
  const best = evaluated[0];
  const winners = evaluated.filter((entry) => compareHands(entry.hand, best.hand) === 0);
  const payout = Math.floor(state.pot / winners.length);

  winners.forEach((entry) => {
    entry.player.chips += payout;
  });

  if (winners.length === 1) {
    log(`${winners[0].player.name} wins ${payout} with ${handRankLabels[best.hand.rank]}.`);
    updateStatus(`${winners[0].player.name} wins the hand.`);
  } else {
    log(`Split pot between ${winners.map((entry) => entry.player.name).join(", ")}.`);
    updateStatus(`Split pot between ${winners.map((entry) => entry.player.name).join(", ")}.`);
  }

  state.pot = 0;
  updatePot();
  renderPlayers();
  renderPlayerHand();
  updateAssist();
  updateWinOdds();
  updateActions();
  elements.nextHand.hidden = false;
  saveProgress();
}

function botDecision(bot) {
  const tier = getPreflopTier(bot.hand);
  const strength = 1 - tier.tier / 5;
  const toCall = Math.max(0, state.currentBet - bot.bet);
  const willBluff = Math.random() < bot.personality.bluff;

  if (strength > 0.7 && bot.personality.aggression > 0.5) {
    return { action: "raise", amount: Math.max(10, Math.floor(state.pot * 0.5)) };
  }

  if (willBluff && bot.personality.aggression > 0.4) {
    return { action: "raise", amount: Math.max(10, Math.floor(state.pot * 0.3)) };
  }

  if (strength < 0.35 && bot.personality.tightness > 0.5 && toCall > 0) {
    return { action: "fold" };
  }

  return { action: toCall > 0 ? "call" : "check" };
}

function applyBet(player, amount) {
  const betAmount = Math.min(player.chips, amount);
  player.chips -= betAmount;
  player.bet += betAmount;
  state.pot += betAmount;
}

function isRoundComplete() {
  return state.players.every((player, index) => {
    if (player.folded) return true;
    return state.actedThisRound[index] && player.bet === state.currentBet;
  });
}

function awardPotToLastStanding() {
  const remaining = state.players.filter((player) => !player.folded);
  if (remaining.length === 1) {
    const winner = remaining[0];
    winner.chips += state.pot;
    log(`${winner.name} wins the pot uncontested.`);
    updateStatus(`${winner.name} wins. New hand ready.`);
    setActivePlayer(null);
    state.pot = 0;
    updatePot();
    renderPlayers();
    renderPlayerHand();
    updateAssist();
    updateWinOdds();
    updateActions();
    elements.nextHand.hidden = false;
    return true;
  }
  return false;
}

function advancePhase() {
  if (awardPotToLastStanding()) {
    return;
  }

  if (state.phase === "preflop") {
    state.community.push(drawCard(), drawCard(), drawCard());
    state.phase = "flop";
  } else if (state.phase === "flop") {
    state.community.push(drawCard());
    state.phase = "turn";
  } else if (state.phase === "turn") {
    state.community.push(drawCard());
    state.phase = "river";
  } else if (state.phase === "river") {
    resolveShowdown();
    return;
  }

  renderCommunity();
  resetBetsForRound();
  const startIndex = nextActiveIndex(state.dealerIndex);
  beginBettingRound(startIndex);
  updateStatus(`${streetLabels[state.phase]}: ${state.players[startIndex].name} to act.`);
  updateActions();
  updateAssist();
  updateWinOdds();
  maybeProcessBots();
}

function applyAction(player, action, amount = 0) {
  const toCall = Math.max(0, state.currentBet - player.bet);
  if (action === "fold") {
    player.folded = true;
    player.lastAction = "fold";
    log(`${player.name} folds.`);
  } else if (action === "call") {
    applyBet(player, toCall);
    player.lastAction = toCall > 0 ? "call" : "check";
    log(`${player.name} ${toCall > 0 ? "calls" : "checks"}.`);
  } else if (action === "raise") {
    const raiseTo = Math.max(state.currentBet + 10, amount);
    const totalNeeded = Math.min(player.chips + player.bet, raiseTo) - player.bet;
    applyBet(player, totalNeeded);
    state.currentBet = player.bet;
    player.lastAction = "raise";
    state.actedThisRound = state.players.map((entry) => entry.folded || entry.chips === 0);
    state.actedThisRound[state.currentPlayerIndex] = true;
    state.lastAggressorIndex = state.currentPlayerIndex;
    log(`${player.name} raises to ${state.currentBet}.`);
    return;
  }
  state.actedThisRound[state.currentPlayerIndex] = true;
}

function advanceTurn() {
  if (awardPotToLastStanding()) {
    return;
  }

  if (isRoundComplete()) {
    advancePhase();
    return;
  }

  state.currentPlayerIndex = nextActiveIndex(state.currentPlayerIndex);
  setActivePlayer(state.currentPlayerIndex);
  updateStatus(`${streetLabels[state.phase]}: ${state.players[state.currentPlayerIndex].name} to act.`);
  renderPlayers();
  renderPlayerHand();
  updateActions();
  updateAssist();
  updateWinOdds();
  maybeProcessBots();
}

async function processBotTurn(bot) {
  const decision = botDecision(bot);
  const action = decision.action;
  const amount = decision.amount || 0;
  applyAction(bot, action, amount);
  renderPlayers();
  updatePot();
  updateAssist();
  updateWinOdds();
  await wait(state.settings.actionDelay);
  state.actionInProgress = false;
  advanceTurn();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function maybeProcessBots() {
  if (state.actionInProgress) {
    return;
  }
  const current = state.players[state.currentPlayerIndex];
  if (!current || current.isHuman || current.folded) {
    return;
  }
  state.actionInProgress = true;
  await processBotTurn(current);
}

function handlePlayerAction(action, amount = 0) {
  const human = state.players[0];
  if (human.folded || state.activePlayerId !== human.id) {
    return;
  }

  if (action === "fold" && state.settings.fastForward) {
    human.folded = true;
    human.lastAction = "fold";
    log("You fold.");
    renderPlayerHand();
    renderPlayers();
    resolveShowdown();
    return;
  }

  applyAction(human, action, amount);
  renderPlayerHand();
  renderPlayers();
  updatePot();
  updateAssist();
  updateWinOdds();
  advanceTurn();
}

function continueAfterFold() {
  elements.continueHand.hidden = true;
  resolveShowdown();
}

function nextHand() {
  state.handNumber += 1;
  elements.nextHand.hidden = true;
  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
  startHand();
}

function updateAssist() {
  if (!state.settings.assistance) {
    elements.assistPanel.hidden = true;
    return;
  }

  elements.assistPanel.hidden = false;
  const human = state.players[0];
  const tier = getPreflopTier(human.hand);
  const activeOpponents = state.players.filter((player) => !player.isHuman && !player.folded);
  const toCall = Math.max(0, state.currentBet - human.bet);

  elements.handStrength.textContent = `Pre-flop tier: ${tier.label}. Hand rank: ${handRankLabels[evaluateHand([...human.hand, ...state.community]).rank]}.`;

  let advice = "Lean toward cautious play.";
  if (tier.tier <= 2) {
    advice = "Strong opening hand. Consider raising to build the pot.";
  } else if (tier.tier === 3 && toCall === 0) {
    advice = "Playable hand. Checking or small raise is reasonable.";
  } else if (tier.tier === 4 && toCall > 0) {
    advice = "Speculative hand. Call only if pot odds are favorable.";
  } else if (tier.tier >= 5 && toCall > 0) {
    advice = "Marginal hand. Folding is often best unless the bet is tiny.";
  }
  elements.handAdvice.textContent = advice;

  elements.opponentTells.innerHTML = "";
  activeOpponents.forEach((bot) => {
    const tell = document.createElement("li");
    let profile = "Balanced";
    if (bot.personality.aggression > 0.6) profile = "Aggressive";
    if (bot.personality.tightness > 0.6) profile = "Tight";
    if (bot.personality.bluff > 0.35) profile = `${profile}, Bluff-prone`;
    tell.textContent = `${bot.name}: ${profile}. Big bets from tight players signal strength; sudden raises from bluff-prone players can indicate a bluff.`;
    elements.opponentTells.appendChild(tell);
  });

  const potOdds = toCall > 0 ? Math.round((toCall / (state.pot + toCall)) * 100) : 0;
  elements.bettingGuidance.textContent = toCall > 0
    ? `You need about ${potOdds}% equity to call. Larger pots with small calls can justify looser calls.`
    : "No bet to call. You can check or open with a raise to apply pressure.";
}

function updateWinOdds() {
  if (!state.settings.showWinOdds) {
    state.players.forEach((player) => {
      player.odds = null;
    });
    renderPlayers();
    return;
  }

  const activePlayers = state.players.filter((player) => !player.folded);
  if (activePlayers.length === 0) {
    return;
  }

  const totalSimulations = 200;
  const wins = new Map(activePlayers.map((player) => [player.id, 0]));
  const usedCards = [...state.community, ...state.players.flatMap((player) => player.hand)];
  const usedSet = new Set(usedCards.map((card) => `${card.value}${card.suit}`));
  const remainingDeck = createDeck().filter((card) => !usedSet.has(`${card.value}${card.suit}`));

  for (let i = 0; i < totalSimulations; i += 1) {
    const deck = shuffle([...remainingDeck]);
    const simulatedCommunity = [...state.community];
    while (simulatedCommunity.length < 5) {
      simulatedCommunity.push(deck.pop());
    }
    const evaluated = activePlayers.map((player) => ({
      player,
      hand: evaluateHand([...player.hand, ...simulatedCommunity]),
    }));
    evaluated.sort((a, b) => compareHands(a.hand, b.hand)).reverse();
    const best = evaluated[0];
    const winners = evaluated.filter((entry) => compareHands(entry.hand, best.hand) === 0);
    winners.forEach((entry) => {
      wins.set(entry.player.id, wins.get(entry.player.id) + 1 / winners.length);
    });
  }

  state.players.forEach((player) => {
    if (!wins.has(player.id)) {
      player.odds = null;
      return;
    }
    const winRate = (wins.get(player.id) / totalSimulations) * 100;
    player.odds = Math.round(winRate);
  });
  renderPlayers();
}

function applyTheme() {
  document.body.dataset.theme = state.settings.theme;
}

function updatePositionTips() {
  elements.positionTips.hidden = !state.settings.showPositionHelp;
  elements.playerPosition.style.display = state.settings.showPositionHelp ? "block" : "none";
}

function setSettingsFromInputs() {
  state.settings.opponents = Number(elements.opponentCount.value);
  state.settings.showFolded = elements.showFolded.checked;
  state.settings.showAllHands = elements.showAllHands.checked;
  state.settings.showWinOdds = elements.showWinOdds.checked;
  state.settings.showStreetHelp = elements.showStreetHelp.checked;
  state.settings.showPositionHelp = elements.showPositionHelp.checked;
  state.settings.fastForward = elements.fastForward.checked;
  state.settings.assistance = elements.assistToggle.checked;
  state.settings.startingBankroll = Number(elements.startingBankroll.value);
  state.settings.theme = elements.themeSelect.value;
  state.settings.actionDelay = Number(elements.actionDelay.value);
}

function setupTable() {
  setSettingsFromInputs();
  setupPlayers();
  state.dealerIndex = 0;
  state.handNumber = 1;
  applyTheme();
  updatePositionTips();
  startHand();
  updateAssist();
}

function saveProgress() {
  if (!state.auth.username) {
    return;
  }
  const accounts = JSON.parse(localStorage.getItem("pokerTrainerAccounts") || "{}");
  accounts[state.auth.username] = {
    password: state.auth.password,
    chips: state.players[0].chips,
  };
  localStorage.setItem("pokerTrainerAccounts", JSON.stringify(accounts));
}

function signIn() {
  const username = elements.username.value.trim();
  const password = elements.password.value.trim();
  if (!username || !password) {
    elements.authStatus.textContent = "Enter a username and password to sign in.";
    return;
  }
  const accounts = JSON.parse(localStorage.getItem("pokerTrainerAccounts") || "{}");
  if (accounts[username] && accounts[username].password !== password) {
    elements.authStatus.textContent = "Password mismatch. Try a different password or username.";
    return;
  }
  state.auth.username = username;
  state.auth.password = password;
  elements.authStatus.textContent = `Signed in as ${username}. Bankroll will be saved locally.`;
  elements.signOut.disabled = false;

  if (accounts[username]) {
    const bankroll = accounts[username].chips || state.settings.startingBankroll;
    state.settings.startingBankroll = bankroll;
    elements.startingBankroll.value = bankroll;
    setupTable();
  }
  saveProgress();
}

function signOut() {
  state.auth.username = null;
  state.auth.password = null;
  elements.authStatus.textContent = "Playing as guest.";
  elements.signOut.disabled = true;
}

function setQuickBet(type) {
  const human = state.players[0];
  if (type === "allin") {
    elements.raiseAmount.value = human.bet + human.chips;
  }
  if (type === "half") {
    elements.raiseAmount.value = state.currentBet + Math.floor(state.pot * 0.5);
  }
  if (type === "pot") {
    elements.raiseAmount.value = state.currentBet + state.pot;
  }
}

function bindEvents() {
  elements.newTable.addEventListener("click", setupTable);
  elements.opponentCount.addEventListener("change", setupTable);
  elements.assistToggle.addEventListener("change", () => {
    state.settings.assistance = elements.assistToggle.checked;
    updateAssist();
  });
  elements.showFolded.addEventListener("change", () => {
    state.settings.showFolded = elements.showFolded.checked;
    renderPlayers();
  });
  elements.showAllHands.addEventListener("change", () => {
    state.settings.showAllHands = elements.showAllHands.checked;
    renderPlayers();
  });
  elements.showWinOdds.addEventListener("change", () => {
    state.settings.showWinOdds = elements.showWinOdds.checked;
    updateWinOdds();
  });
  elements.showStreetHelp.addEventListener("change", () => {
    state.settings.showStreetHelp = elements.showStreetHelp.checked;
    updateStreetLabel();
  });
  elements.showPositionHelp.addEventListener("change", () => {
    state.settings.showPositionHelp = elements.showPositionHelp.checked;
    updatePositionTips();
    renderPlayerHand();
    renderPlayers();
  });
  elements.fastForward.addEventListener("change", () => {
    state.settings.fastForward = elements.fastForward.checked;
  });
  elements.themeSelect.addEventListener("change", () => {
    state.settings.theme = elements.themeSelect.value;
    applyTheme();
  });
  elements.actionDelay.addEventListener("change", () => {
    state.settings.actionDelay = Number(elements.actionDelay.value);
  });
  elements.fold.addEventListener("click", () => handlePlayerAction("fold"));
  elements.checkCall.addEventListener("click", () => handlePlayerAction("call"));
  elements.raise.addEventListener("click", () => {
    handlePlayerAction("raise", Number(elements.raiseAmount.value));
  });
  elements.quickBets.forEach((button) => {
    button.addEventListener("click", () => setQuickBet(button.dataset.bet));
  });
  elements.continueHand.addEventListener("click", continueAfterFold);
  elements.nextHand.addEventListener("click", nextHand);
  elements.signIn.addEventListener("click", signIn);
  elements.signOut.addEventListener("click", signOut);
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const selected = tab.dataset.tab;
      elements.tabs.forEach((button) => button.classList.toggle("is-active", button === tab));
      elements.tabPanels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.tabPanel === selected);
      });
    });
  });
}

bindEvents();
setupTable();
