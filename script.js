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
  pendingRaise: false,
  nextBotIndex: 0,
  settings: {
    opponents: 3,
    showFolded: false,
    fastForward: true,
    assistance: false,
    startingBankroll: 1000,
  },
  auth: {
    username: null,
  },
};

const elements = {
  opponentCount: document.getElementById("opponent-count"),
  assistToggle: document.getElementById("assist-toggle"),
  showFolded: document.getElementById("show-folded"),
  fastForward: document.getElementById("fast-forward"),
  startingBankroll: document.getElementById("starting-bankroll"),
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
      isHuman: false,
      personality,
    });
  }

  state.players = players;
}

function renderPlayers() {
  elements.players.innerHTML = "";
  state.players
    .filter((player) => !player.isHuman)
    .forEach((player) => {
      const wrapper = document.createElement("div");
      wrapper.className = "player";
      if (player.folded) {
        wrapper.classList.add("folded");
      }
      const cards = document.createElement("div");
      cards.className = "hand";
      const reveal = state.settings.showFolded && player.folded;
      player.hand.forEach((card) => {
        cards.appendChild(cardElement(card, !reveal && state.phase !== "showdown"));
      });
      wrapper.innerHTML = `
        <div class="player-name">${player.name}</div>
        <div class="player-meta">Chips: ${player.chips} · Bet: ${player.bet}</div>
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
}

function updateStatus(message) {
  elements.handStatus.textContent = message;
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
  });
}

function postBlinds() {
  const smallBlind = 5;
  const bigBlind = 10;
  const human = state.players[0];
  const bigBlindPlayer = state.players[1] || human;

  human.chips -= smallBlind;
  human.bet += smallBlind;
  bigBlindPlayer.chips -= bigBlind;
  bigBlindPlayer.bet += bigBlind;

  state.pot = smallBlind + bigBlind;
  state.currentBet = bigBlind;

  log(`Blinds posted. You: ${smallBlind}, ${bigBlindPlayer.name}: ${bigBlind}.`);
}

function startHand() {
  resetLog();
  state.deck = shuffle(createDeck());
  state.community = [];
  state.phase = "preflop";
  state.pendingRaise = false;
  state.nextBotIndex = 1;

  dealHands();
  postBlinds();

  updateStatus("Pre-flop: your turn.");
  updatePot();
  updateHandNumber();
  updateActions();
  renderCommunity();
  renderPlayers();
  renderPlayerHand();
  updateAssist();
}

function updateActions() {
  const human = state.players[0];
  const toCall = Math.max(0, state.currentBet - human.bet);
  elements.checkCall.textContent = toCall === 0 ? "Check" : `Call ${toCall}`;
  elements.raiseAmount.value = state.currentBet + 10;
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
  state.community = [drawCard(), drawCard(), drawCard(), drawCard(), drawCard()];
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

function runBots({ allowRaise }) {
  state.pendingRaise = false;
  const bots = state.players.filter((player) => !player.isHuman);
  for (let i = state.nextBotIndex; i < bots.length; i += 1) {
    const bot = bots[i];
    if (bot.folded) {
      continue;
    }
    const decision = botDecision(bot);
    const toCall = Math.max(0, state.currentBet - bot.bet);

    if (decision.action === "fold") {
      bot.folded = true;
      log(`${bot.name} folds.`);
    } else if (decision.action === "raise" && allowRaise) {
      const raiseTo = state.currentBet + decision.amount;
      const totalNeeded = raiseTo - bot.bet;
      applyBet(bot, totalNeeded);
      state.currentBet = raiseTo;
      state.pendingRaise = true;
      state.nextBotIndex = i + 1;
      log(`${bot.name} raises to ${raiseTo}.`);
      break;
    } else {
      applyBet(bot, toCall);
      log(`${bot.name} ${toCall > 0 ? "calls" : "checks"}.`);
    }
  }

  renderPlayers();
  updatePot();

  if (state.pendingRaise) {
    updateStatus("Opponent raised. Your response?");
    updateActions();
    return;
  }

  resolveShowdown();
}

function handlePlayerAction(action, amount = 0) {
  const human = state.players[0];
  if (human.folded) {
    return;
  }

  const toCall = Math.max(0, state.currentBet - human.bet);
  const respondingToRaise = state.pendingRaise;

  if (action === "fold") {
    human.folded = true;
    log("You fold.");
    renderPlayerHand();
    renderPlayers();
    if (state.settings.fastForward) {
      resolveShowdown();
    } else {
      updateStatus("You folded. Continue to finish the hand.");
      elements.continueHand.hidden = false;
    }
    return;
  }

  if (action === "call") {
    applyBet(human, toCall);
    log(toCall > 0 ? `You call ${toCall}.` : "You check.");
  }

  if (action === "raise") {
    const raiseTo = Math.max(state.currentBet + 10, amount);
    const totalNeeded = Math.min(human.chips + human.bet, raiseTo) - human.bet;
    applyBet(human, totalNeeded);
    state.currentBet = human.bet;
    log(`You raise to ${state.currentBet}.`);
  }

  renderPlayerHand();
  renderPlayers();
  updatePot();
  updateAssist();

  runBots({ allowRaise: !respondingToRaise });
}

function continueAfterFold() {
  elements.continueHand.hidden = true;
  resolveShowdown();
}

function nextHand() {
  state.handNumber += 1;
  elements.nextHand.hidden = true;
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

function setSettingsFromInputs() {
  state.settings.opponents = Number(elements.opponentCount.value);
  state.settings.showFolded = elements.showFolded.checked;
  state.settings.fastForward = elements.fastForward.checked;
  state.settings.assistance = elements.assistToggle.checked;
  state.settings.startingBankroll = Number(elements.startingBankroll.value);
}

function setupTable() {
  setSettingsFromInputs();
  setupPlayers();
  state.handNumber = 1;
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
  elements.fastForward.addEventListener("change", () => {
    state.settings.fastForward = elements.fastForward.checked;
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
}

bindEvents();
setupTable();
