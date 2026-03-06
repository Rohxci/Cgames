const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  StringSelectMenuBuilder
} = require("discord.js");

const games = require("../systems/games");

const STARTING_FISH = 15;
const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;
const TURN_TIMEOUT_MS = 20000;
const CHALLENGE_TIMEOUT_MS = 7000;

/* ---------------- EVENT POOL ---------------- */

const ECONOMY_EVENTS = [
  "Small Win",
  "Big Win",
  "Lose Fish",
  "Disaster",
  "Casino Tax",
  "Charity",
  "Fish Rain",
  "Fish Storm",
  "Lucky Player",
  "Bomb"
];

const CHALLENGE_EVENTS = [
  "Dice Duel",
  "Rock Paper Scissors",
  "Reaction Duel",
  "Math Duel",
  "High Card Duel",
  "Coin Flip Duel",
  "Lucky Pick",
  "Risk Choice",
  "All In",
  "Pick a Number",
  "Safe or Risk",
  "Fast Type",
  "Trivia",
  "Word Scramble",
  "Quick Click",
  "Emoji Memory",
  "Guess Number",
  "Steal",
  "Gift",
  "Blackjack"
];

const ALL_EVENTS = [...ECONOMY_EVENTS, ...CHALLENGE_EVENTS];

const EMOJI = {
  "Small Win": "💰",
  "Big Win": "💎",
  "Lose Fish": "📉",
  "Disaster": "💀",
  "Casino Tax": "🏛️",
  "Charity": "🎁",
  "Fish Rain": "🐟",
  "Fish Storm": "🌪️",
  "Lucky Player": "🍀",
  "Bomb": "💣",

  "Dice Duel": "🎲",
  "Rock Paper Scissors": "✊",
  "Reaction Duel": "⚡",
  "Math Duel": "➗",
  "High Card Duel": "🃏",
  "Coin Flip Duel": "🪙",
  "Lucky Pick": "🔢",
  "Risk Choice": "🎯",
  "All In": "🎰",
  "Pick a Number": "🎲",
  "Safe or Risk": "🟩",
  "Fast Type": "⌨️",
  "Trivia": "🧠",
  "Word Scramble": "🔤",
  "Quick Click": "⚡",
  "Emoji Memory": "😀",
  "Guess Number": "🔢",
  "Steal": "🦹",
  "Gift": "🎁",
  "Blackjack": "♠️"
};

const TRIVIA_POOL = [
  {
    q: "Which animal says meow?",
    options: ["Dog", "Cat", "Cow", "Duck"],
    answer: 1
  },
  {
    q: "How many days are in a week?",
    options: ["5", "6", "7", "8"],
    answer: 2
  },
  {
    q: "What color is the sky on a clear day?",
    options: ["Blue", "Green", "Red", "Black"],
    answer: 0
  }
];

const SCRAMBLE_POOL = [
  {
    q: "Unscramble: OSACNI",
    options: ["CASION", "CASINO", "COINAS", "SCANIO"],
    answer: 1
  },
  {
    q: "Unscramble: HSFI",
    options: ["FISH", "FISK", "HSIF", "SIFH"],
    answer: 0
  },
  {
    q: "Unscramble: LEEWH",
    options: ["WHELE", "WHEEL", "HEWEL", "ELWHE"],
    answer: 1
  }
];

const EMOJI_MEMORY_POOL = [
  {
    q: "Remember the pattern: 😀 🐟 🎰",
    options: ["😀 🐟 🎰", "🐟 😀 🎰", "🎰 🐟 😀", "😀 🎰 🐟"],
    answer: 0
  },
  {
    q: "Remember the pattern: 💣 🍀 🎲",
    options: ["💣 🎲 🍀", "🍀 💣 🎲", "💣 🍀 🎲", "🎲 🍀 💣"],
    answer: 2
  }
];

/* ---------------- HELPERS ---------------- */

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function findGame(channel) {
  let game = games.get(channel.id);
  if (game) return game;

  if (channel.isThread()) {
    return games.get(channel.parentId);
  }

  return null;
}

function wheelText() {
  const eco = ECONOMY_EVENTS.map((e, i) => `${i + 1} ${EMOJI[e]} ${e}`).join("\n");
  const challenges = CHALLENGE_EVENTS.map((e, i) => `${i + 11} ${EMOJI[e]} ${e}`).join("\n");
  return `💰 **Economy**\n${eco}\n\n🎮 **Challenges**\n${challenges}`;
}

function leaderboard(state) {
  const arr = Object.entries(state.fish)
    .filter(([id]) => state.alive.includes(id))
    .sort((a, b) => b[1] - a[1]);

  return arr.map(([id, fish], i) => {
    let medal = "";
    if (i === 0) medal = "🥇";
    if (i === 1) medal = "🥈";
    if (i === 2) medal = "🥉";
    return `${medal} <@${id}> — ${fish} 🐟`;
  }).join("\n");
}

function lobbyEmbed(state) {
  const players = state.players.map(p => `• <@${p}>`).join("\n") || "No players";

  return {
    title: "🎰 CASINO WHEEL",
    description:
`🎰 **Host**
<@${state.hostId}>

🐟 **Starting Fish**
${STARTING_FISH} 🐟

👥 **Players**
${players}

Players: ${state.players.length} / ${MAX_PLAYERS}
Minimum: ${MIN_PLAYERS}

Spin the wheel and survive the casino.
Last player with fish wins.`
  };
}

function panelEmbed(state, eventText = "Waiting for spin...") {
  return {
    title: "🎰 CASINO WHEEL",
    description:
`🎡 **Active Wheel**

${wheelText()}

🏆 **Leaderboard**

${leaderboard(state)}

🎰 **Turn**
<@${state.alive[state.turn] || state.alive[0] || state.hostId}>

🎯 **Event**
${eventText}`
  };
}

function lobbyRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino_join")
        .setLabel("Join")
        .setEmoji("🎲")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("casino_leave")
        .setLabel("Leave")
        .setEmoji("🚪")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("casino_start")
        .setLabel("Start")
        .setEmoji("🎰")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("casino_cancel")
        .setLabel("Cancel")
        .setEmoji("❌")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function panelRows(state) {
  const disabled = state.phase !== "spin";
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino_spin")
        .setLabel("SPIN")
        .setEmoji("🎡")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),

      new ButtonBuilder()
        .setCustomId("casino_end")
        .setLabel("END")
        .setEmoji("🛑")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function challengeAcceptRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino_ch_accept")
        .setLabel("Accept Challenge")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("casino_ch_decline")
        .setLabel("Decline")
        .setEmoji("❌")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function rpsRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("casino_rps_rock").setLabel("Rock").setEmoji("✊").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("casino_rps_paper").setLabel("Paper").setEmoji("✋").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("casino_rps_scissors").setLabel("Scissors").setEmoji("✌️").setStyle(ButtonStyle.Primary)
    )
  ];
}

function rollRows(labelA = "Roll") {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("casino_roll").setLabel(labelA).setEmoji("🎲").setStyle(ButtonStyle.Primary)
    )
  ];
}

function coinRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("casino_coin_heads").setLabel("Heads").setEmoji("🪙").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("casino_coin_tails").setLabel("Tails").setEmoji("🪙").setStyle(ButtonStyle.Primary)
    )
  ];
}

function reactionRows(enabled) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino_react_click")
        .setLabel("CLICK")
        .setEmoji("⚡")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!enabled)
    )
  ];
}

function chooseNumberRow(customId, max) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder("Choose a number")
        .addOptions(Array.from({ length: max }, (_, i) => ({
          label: String(i + 1),
          value: String(i + 1)
        })))
    )
  ];
}

function targetRow(customId, state, actorId) {
  const options = state.alive
    .filter(id => id !== actorId)
    .slice(0, 25)
    .map(id => ({
      label: `Target ${id.slice(0, 4)}`,
      value: id,
      description: `${state.fish[id]} fish`
    }));

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder("Choose target")
        .addOptions(options)
    )
  ];
}

function quizRows(customId, options) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${customId}_0`).setLabel(options[0]).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`${customId}_1`).setLabel(options[1]).setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${customId}_2`).setLabel(options[2]).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`${customId}_3`).setLabel(options[3]).setStyle(ButtonStyle.Primary)
    )
  ];
}

function riskRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("casino_risk_safe").setLabel("Safe").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("casino_risk_risk").setLabel("Risk").setStyle(ButtonStyle.Danger)
    )
  ];
}

function allInRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("casino_allin_yes").setLabel("All In").setEmoji("🎰").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("casino_allin_no").setLabel("Back Out").setStyle(ButtonStyle.Secondary)
    )
  ];
}

function bjRows(state) {
  const actor = state.challenge.actor;
  const current = state.challenge.data.current;
  const standMap = state.challenge.data.stood || {};
  const canPlay = actor === current && !standMap[current];

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("casino_bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setDisabled(!canPlay),
      new ButtonBuilder().setCustomId("casino_bj_stand").setLabel("Stand").setStyle(ButtonStyle.Success).setDisabled(!canPlay)
    )
  ];
}

function cardValue(card) {
  if (card === "A") return 11;
  if (["K", "Q", "J"].includes(card)) return 10;
  return parseInt(card, 10);
}

function handScore(hand) {
  let total = 0;
  let aces = 0;

  for (const c of hand) {
    total += cardValue(c);
    if (c === "A") aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function drawCard() {
  const cards = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  return cards[rand(0, cards.length - 1)];
}

function currentTurnPlayer(state) {
  return state.alive[state.turn];
}

function clampFish(state) {
  for (const id of Object.keys(state.fish)) {
    if (state.fish[id] < 0) state.fish[id] = 0;
  }
}

function eliminatePlayers(state) {
  const removed = [];
  for (const id of [...state.alive]) {
    if ((state.fish[id] || 0) <= 0) removed.push(id);
  }
  state.alive = state.alive.filter(id => (state.fish[id] || 0) > 0);
  return removed;
}

function setNextTurnAfterResolution(state, actingPlayerId, oldTurnIndex) {
  if (state.alive.length === 0) return;

  const idx = state.alive.indexOf(actingPlayerId);

  if (idx !== -1) {
    state.turn = idx + 1;
    if (state.turn >= state.alive.length) state.turn = 0;
  } else {
    state.turn = oldTurnIndex;
    if (state.turn >= state.alive.length) state.turn = 0;
  }
}

function clearTurnTimer(state) {
  if (state.turnTimer) {
    clearTimeout(state.turnTimer);
    state.turnTimer = null;
  }
}

async function getThread(client, state) {
  return client.channels.cache.get(state.threadId) || await client.channels.fetch(state.threadId).catch(() => null);
}

async function getPanel(client, state) {
  const thread = await getThread(client, state);
  if (!thread) return null;
  return await thread.messages.fetch(state.panelMessageId).catch(() => null);
}

async function getChallengeMessage(client, state) {
  const thread = await getThread(client, state);
  if (!thread || !state.challengeMessageId) return null;
  return await thread.messages.fetch(state.challengeMessageId).catch(() => null);
}

async function sendMainResult(client, state, text) {
  const main = client.channels.cache.get(state.mainChannelId) || await client.channels.fetch(state.mainChannelId).catch(() => null);
  if (!main) return;
  await main.send(text).catch(() => {});
}

async function updatePanel(client, state, text) {
  const panel = await getPanel(client, state);
  if (!panel) return false;

  await panel.edit({
    embeds: [panelEmbed(state, text)],
    components: panelRows(state)
  }).catch(() => {});

  return true;
}

async function closeCasino(client, state, finalText) {
  clearTurnTimer(state);

  const panel = await getPanel(client, state);
  if (panel) {
    await panel.edit({
      embeds: [{
        title: "🏆 CASINO WINNER",
        description: finalText
      }],
      components: []
    }).catch(() => {});
  }

  await sendMainResult(client, state, finalText);

  const thread = await getThread(client, state);
  games.delete(state.mainChannelId);

  if (thread) {
    await thread.delete().catch(() => {});
  }
}

function startTurnTimer(client, state) {
  clearTurnTimer(state);

  if (state.phase !== "spin") return;

  state.turnToken = (state.turnToken || 0) + 1;
  const token = state.turnToken;

  state.turnTimer = setTimeout(async () => {
    if (state.phase !== "spin") return;
    if (state.turnToken !== token) return;
    await processSpin(client, state, true);
  }, TURN_TIMEOUT_MS);
}

function randomAliveExcept(state, playerId) {
  const others = state.alive.filter(id => id !== playerId);
  if (others.length === 0) return null;
  return others[rand(0, others.length - 1)];
}

function isChallengeEvent(event) {
  return CHALLENGE_EVENTS.includes(event);
}

function createChallengeEmbed(state, title, description) {
  return {
    title,
    description
  };
}

async function maybeFinishAfterResolution(client, state, resultText, actingPlayerId, oldTurnIndex) {
  clampFish(state);
  const removed = eliminatePlayers(state);

  let extra = resultText;
  if (removed.length > 0) {
    extra += `\n\n💀 Out:\n${removed.map(id => `<@${id}>`).join("\n")}`;
  }

  if (state.alive.length === 0) {
    await closeCasino(client, state, `🛑 Everyone was eliminated.\n\nWinner: none`);
    return { done: true, result: extra };
  }

  if (state.alive.length === 1) {
    const winner = state.alive[0];
    await closeCasino(client, state, `🏆 <@${winner}> wins the casino!\n\nFinal Fish: ${state.fish[winner]} 🐟`);
    return { done: true, result: extra };
  }

  setNextTurnAfterResolution(state, actingPlayerId, oldTurnIndex);

  return { done: false, result: extra };
}

/* ---------------- CHALLENGE SETUP ---------------- */

function buildChallenge(state, event) {
  const actor = currentTurnPlayer(state);
  const oldTurnIndex = state.turn;

  if (["Dice Duel", "Rock Paper Scissors", "Reaction Duel", "Math Duel", "High Card Duel", "Coin Flip Duel", "Fast Type", "Trivia", "Word Scramble", "Quick Click", "Emoji Memory", "Blackjack"].includes(event)) {
    const target = randomAliveExcept(state, actor);
    if (!target) return null;

    return {
      event,
      actor,
      players: [actor, target],
      accepted: {},
      stage: "accept",
      data: { oldTurnIndex }
    };
  }

  if (["Steal", "Gift"].includes(event)) {
    return {
      event,
      actor,
      players: [actor],
      accepted: {},
      stage: "select-target",
      data: { oldTurnIndex }
    };
  }

  if (["Lucky Pick", "Risk Choice", "All In", "Pick a Number", "Safe or Risk", "Guess Number"].includes(event)) {
    return {
      event,
      actor,
      players: [actor],
      accepted: { [actor]: true },
      stage: "play",
      data: { oldTurnIndex }
    };
  }

  return null;
}

async function openChallenge(client, state, event) {
  clearTurnTimer(state);

  const thread = await getThread(client, state);
  if (!thread) return false;

  const challenge = buildChallenge(state, event);
  if (!challenge) return false;

  state.phase = "challenge";
  state.challenge = challenge;

  let embed;
  let rows = [];

  if (challenge.stage === "accept") {
    embed = createChallengeEmbed(
      `${EMOJI[event] || "🎮"} CASINO CHALLENGE`,
      `<@${challenge.players[0]}> vs <@${challenge.players[1]}>\n\nEvent: **${event}**\n\nBoth players must accept to begin.`
    );
    rows = challengeAcceptRows();
  } else if (challenge.stage === "select-target") {
    embed = createChallengeEmbed(
      `${EMOJI[event] || "🎮"} CASINO CHALLENGE`,
      `<@${challenge.actor}> must choose a target for **${event}**.`
    );
    rows = targetRow("casino_target", state, challenge.actor);
  } else {
    embed = createChallengeEmbed(
      `${EMOJI[event] || "🎮"} CASINO CHALLENGE`,
      `<@${challenge.actor}> begins **${event}**.`
    );
    rows = await challengePlayRows(state);
  }

  const msg = await thread.send({
    embeds: [embed],
    components: rows
  });

  state.challengeMessageId = msg.id;

  await updatePanel(client, state, `${EMOJI[event] || "🎮"} ${event}\n\nWaiting for challenge...`);
  return true;
}

async function challengePlayRows(state) {
  const event = state.challenge.event;

  if (event === "Rock Paper Scissors") return rpsRows();
  if (event === "Dice Duel") return rollRows("Roll");
  if (event === "High Card Duel") return rollRows("Draw Card");
  if (event === "Coin Flip Duel") return coinRows();
  if (event === "Reaction Duel" || event === "Quick Click" || event === "Fast Type") return reactionRows(false);
  if (event === "Lucky Pick") return chooseNumberRow("casino_pick10", 10);
  if (event === "Pick a Number" || event === "Guess Number") return chooseNumberRow("casino_pick5", 5);
  if (event === "Risk Choice" || event === "Safe or Risk") return riskRows();
  if (event === "All In") return allInRows();
  if (event === "Steal" || event === "Gift") return [];
  if (event === "Math Duel") {
    const a = rand(5, 25);
    const b = rand(5, 25);
    const correct = a + b;
    const wrong = shuffle([correct + 1, correct - 1, correct + 2]).slice(0, 3);
    const options = shuffle([correct, ...wrong]).slice(0, 4);
    state.challenge.data.question = `${a} + ${b} = ?`;
    state.challenge.data.answer = options.indexOf(correct);
    state.challenge.data.answered = {};
    return quizRows("casino_quiz", options.map(String));
  }
  if (event === "Trivia") {
    const q = TRIVIA_POOL[rand(0, TRIVIA_POOL.length - 1)];
    state.challenge.data.question = q.q;
    state.challenge.data.answer = q.answer;
    state.challenge.data.answered = {};
    return quizRows("casino_quiz", q.options);
  }
  if (event === "Word Scramble") {
    const q = SCRAMBLE_POOL[rand(0, SCRAMBLE_POOL.length - 1)];
    state.challenge.data.question = q.q;
    state.challenge.data.answer = q.answer;
    state.challenge.data.answered = {};
    return quizRows("casino_quiz", q.options);
  }
  if (event === "Emoji Memory") {
    const q = EMOJI_MEMORY_POOL[rand(0, EMOJI_MEMORY_POOL.length - 1)];
    state.challenge.data.question = q.q;
    state.challenge.data.answer = q.answer;
    state.challenge.data.answered = {};
    return quizRows("casino_quiz", q.options);
  }
  if (event === "Blackjack") {
    const [a, b] = state.challenge.players;
    state.challenge.data.hands = {
      [a]: [drawCard(), drawCard()],
      [b]: [drawCard(), drawCard()]
    };
    state.challenge.data.stood = {};
    state.challenge.data.current = a;
    return bjRows(state);
  }

  return [];
}

async function beginChallengeGameplay(client, state) {
  const challengeMsg = await getChallengeMessage(client, state);
  if (!challengeMsg) return;

  state.challenge.stage = "play";

  if (["Reaction Duel", "Quick Click", "Fast Type"].includes(state.challenge.event)) {
    await challengeMsg.edit({
      embeds: [createChallengeEmbed(
        `${EMOJI[state.challenge.event]} ${state.challenge.event}`,
        `<@${state.challenge.players[0]}> vs <@${state.challenge.players[1]}>\n\nWAIT...`
      )],
      components: reactionRows(false)
    });

    state.challenge.timeout = setTimeout(async () => {
      const msg = await getChallengeMessage(client, state);
      if (!msg || !state.challenge) return;
      state.challenge.stage = "armed";

      await msg.edit({
        embeds: [createChallengeEmbed(
          `${EMOJI[state.challenge.event]} ${state.challenge.event}`,
          `<@${state.challenge.players[0]}> vs <@${state.challenge.players[1]}>\n\nCLICK NOW!`
        )],
        components: reactionRows(true)
      });

      state.challenge.timeout = setTimeout(async () => {
        if (!state.challenge) return;
        await finishChallenge(client, state, `No one reacted in time. No fish changed.`);
      }, CHALLENGE_TIMEOUT_MS);
    }, rand(1500, 3500));

    return;
  }

  const rows = await challengePlayRows(state);
  let description = `<@${state.challenge.players[0]}>`;
  if (state.challenge.players[1]) description += ` vs <@${state.challenge.players[1]}>`;
  description += `\n\n`;

  if (state.challenge.event === "Math Duel" || state.challenge.event === "Trivia" || state.challenge.event === "Word Scramble" || state.challenge.event === "Emoji Memory") {
    description += state.challenge.data.question;
  } else if (state.challenge.event === "Blackjack") {
    const [a, b] = state.challenge.players;
    const hands = state.challenge.data.hands;
    description += `<@${a}> — ${hands[a].join(" ")} (${handScore(hands[a])})\n`;
    description += `<@${b}> — ${hands[b].join(" ")} (${handScore(hands[b])})\n\n`;
    description += `Turn: <@${state.challenge.data.current}>`;
  } else {
    description += `Play the challenge now.`;
  }

  await challengeMsg.edit({
    embeds: [createChallengeEmbed(
      `${EMOJI[state.challenge.event]} ${state.challenge.event}`,
      description
    )],
    components: rows
  });

  if (["Math Duel", "Trivia", "Word Scramble", "Emoji Memory"].includes(state.challenge.event)) {
    state.challenge.timeout = setTimeout(async () => {
      if (!state.challenge) return;
      await finishChallenge(client, state, `${EMOJI[state.challenge.event]} ${state.challenge.event}\n\nTime's up. No fish changed.`);
    }, CHALLENGE_TIMEOUT_MS);
  }
}

async function finishChallenge(client, state, resultText) {
  if (!state.challenge) return;

  if (state.challenge.timeout) {
    clearTimeout(state.challenge.timeout);
    state.challenge.timeout = null;
  }

  const challengeMsg = await getChallengeMessage(client, state);
  if (challengeMsg) {
    await challengeMsg.edit({
      embeds: [createChallengeEmbed("✅ Challenge Finished", resultText)],
      components: []
    }).catch(() => {});
  }

  const actingPlayerId = state.challenge.actor;
  const oldTurnIndex = state.challenge.data.oldTurnIndex ?? state.turn;

  const outcome = await maybeFinishAfterResolution(client, state, resultText, actingPlayerId, oldTurnIndex);
  if (outcome.done) {
    state.challenge = null;
    state.challengeMessageId = null;
    return;
  }

  state.phase = "spin";
  state.challenge = null;
  state.challengeMessageId = null;

  await updatePanel(client, state, outcome.result);

  if (challengeMsg) {
    setTimeout(async () => {
      await challengeMsg.delete().catch(() => {});
    }, 1500);
  }

  startTurnTimer(client, state);
}

/* ---------------- MANUAL/AUTO SPIN ---------------- */

async function processSpin(client, state) {
  if (state.phase !== "spin") return;

  const actingPlayer = currentTurnPlayer(state);
  const panel = await getPanel(client, state);
  if (!panel) {
    games.delete(state.mainChannelId);
    return;
  }

  clearTurnTimer(state);

  await panel.edit({
    embeds: [panelEmbed(state, "🎡 Spinning...")],
    components: []
  }).catch(() => {});

  await new Promise(r => setTimeout(r, 1200));

  await panel.edit({
    embeds: [panelEmbed(state, "🎡 Spinning...")],
    components: []
  }).catch(() => {});

  await new Promise(r => setTimeout(r, 1200));

  const event = ALL_EVENTS[rand(0, ALL_EVENTS.length - 1)];

  if (isChallengeEvent(event)) {
    const opened = await openChallenge(client, state, event);
    if (!opened) {
      await updatePanel(client, state, `${EMOJI[event]} ${event}\n\nChallenge could not start.`);
      setNextTurnAfterResolution(state, actingPlayer, state.turn);
      startTurnTimer(client, state);
    }
    return;
  }

  let result = runEconomyEvent(state, event) || `🎲 Event triggered: ${event}`;
  const oldTurnIndex = state.turn;
  const outcome = await maybeFinishAfterResolution(client, state, result, actingPlayer, oldTurnIndex);
  if (outcome.done) return;

  await updatePanel(client, state, `${EMOJI[event]} ${event}\n\n${outcome.result}`);
  startTurnTimer(client, state);
}

/* ---------------- MODULE ---------------- */

module.exports = {
  match(interaction) {
    return (
      (interaction.isButton() || interaction.isStringSelectMenu()) &&
      interaction.customId.startsWith("casino_")
    );
  },

  async run(interaction) {
    const state = findGame(interaction.channel);
    if (!state) return;

    const id = interaction.customId;

    /* ---------------- LOBBY ---------------- */

    if (id === "casino_join") {
      if (state.phase !== "lobby") return;

      if (state.players.includes(interaction.user.id)) {
        return interaction.reply({ content: "You already joined.", ephemeral: true });
      }

      if (state.players.length >= MAX_PLAYERS) {
        return interaction.reply({ content: "Lobby is full.", ephemeral: true });
      }

      state.players.push(interaction.user.id);

      await interaction.update({
        embeds: [lobbyEmbed(state)],
        components: lobbyRows()
      });
      return;
    }

    if (id === "casino_leave") {
      if (state.phase !== "lobby") return;

      if (!state.players.includes(interaction.user.id)) {
        return interaction.reply({ content: "You are not in the lobby.", ephemeral: true });
      }

      state.players = state.players.filter(p => p !== interaction.user.id);

      if (state.players.length === 0) {
        games.delete(interaction.channelId);
        await interaction.update({ content: "❌ Casino cancelled.", embeds: [], components: [] });
        return;
      }

      if (state.hostId === interaction.user.id) {
        state.hostId = state.players[0];
      }

      await interaction.update({
        embeds: [lobbyEmbed(state)],
        components: lobbyRows()
      });
      return;
    }

    if (id === "casino_cancel") {
      if (state.phase !== "lobby") return;

      if (interaction.user.id !== state.hostId) {
        return interaction.reply({ content: "Only host can cancel.", ephemeral: true });
      }

      games.delete(interaction.channelId);

      await interaction.update({
        content: "❌ Casino cancelled.",
        embeds: [],
        components: []
      });
      return;
    }

    if (id === "casino_start") {
      if (state.phase !== "lobby") return;

      if (interaction.user.id !== state.hostId) {
        return interaction.reply({ content: "Only host can start.", ephemeral: true });
      }

      if (state.players.length < MIN_PLAYERS) {
        return interaction.reply({ content: "Not enough players.", ephemeral: true });
      }

      state.phase = "spin";
      state.mainChannelId = interaction.channelId;
      state.alive = [...state.players];
      state.turn = 0;
      state.fish = {};
      state.challenge = null;
      state.challengeMessageId = null;
      state.turnToken = 0;

      state.players.forEach(id => {
        state.fish[id] = STARTING_FISH;
      });

      const thread = await interaction.channel.threads.create({
        name: `casino-${interaction.user.username}`,
        type: ChannelType.PrivateThread,
        invitable: false
      });

      state.threadId = thread.id;

      for (const id of state.players) {
        try {
          await thread.members.add(id);
        } catch {}
      }

      const panel = await thread.send({
        embeds: [panelEmbed(state)],
        components: panelRows(state)
      });

      state.panelMessageId = panel.id;

      await interaction.update({
        content: `🎰 Casino game started in <#${thread.id}>`,
        embeds: [],
        components: []
      });

      startTurnTimer(interaction.client, state);
      return;
    }

    /* ---------------- GAME CONTROL ---------------- */

    if (id === "casino_end") {
      if (state.phase !== "spin" && state.phase !== "challenge") return;

      if (interaction.user.id !== state.hostId) {
        return interaction.reply({ content: "Only host can end the game.", ephemeral: true });
      }

      await interaction.deferUpdate();
      await closeCasino(interaction.client, state, `🛑 Casino ended by host.\n\nWinner: none`);
      return;
    }

    if (id === "casino_spin") {
      if (state.phase !== "spin") {
        return interaction.reply({ content: "A challenge is in progress.", ephemeral: true });
      }

      const player = currentTurnPlayer(state);
      if (interaction.user.id !== player) {
        return interaction.reply({ content: "Not your turn.", ephemeral: true });
      }

      await interaction.deferUpdate();
      await processSpin(interaction.client, state);
      return;
    }

    /* ---------------- CHALLENGE ACCEPT/DECLINE ---------------- */

    if (id === "casino_ch_accept") {
      if (state.phase !== "challenge" || !state.challenge) return;

      const players = state.challenge.players;
      if (!players.includes(interaction.user.id)) {
        return interaction.reply({ content: "You are not part of this challenge.", ephemeral: true });
      }

      await interaction.deferUpdate();

      state.challenge.accepted[interaction.user.id] = true;

      const msg = await getChallengeMessage(interaction.client, state);
      if (!msg) return;

      const acceptedText = players
        .map(id => `${state.challenge.accepted[id] ? "✅" : "⏳"} <@${id}>`)
        .join("\n");

      const allAccepted = players.every(id => state.challenge.accepted[id]);

      if (!allAccepted) {
        await msg.edit({
          embeds: [createChallengeEmbed(
            `${EMOJI[state.challenge.event]} CASINO CHALLENGE`,
            `${players.map(id => `<@${id}>`).join(" vs ")}\n\nEvent: **${state.challenge.event}**\n\n${acceptedText}`
          )],
          components: challengeAcceptRows()
        }).catch(() => {});
        return;
      }

      await beginChallengeGameplay(interaction.client, state);
      await updatePanel(interaction.client, state, `${EMOJI[state.challenge.event]} ${state.challenge.event}\n\nChallenge in progress...`);
      return;
    }

    if (id === "casino_ch_decline") {
      if (state.phase !== "challenge" || !state.challenge) return;

      const players = state.challenge.players;
      if (!players.includes(interaction.user.id)) {
        return interaction.reply({ content: "You are not part of this challenge.", ephemeral: true });
      }

      await interaction.deferUpdate();

      const other = players.find(id => id !== interaction.user.id);
      if (other) {
        state.fish[interaction.user.id] -= 3;
        state.fish[other] += 3;
        await finishChallenge(
          interaction.client,
          state,
          `${EMOJI[state.challenge.event]} ${state.challenge.event}\n\n<@${interaction.user.id}> declined.\n<@${other}> wins +3 🐟`
        );
      } else {
        state.fish[interaction.user.id] -= 2;
        await finishChallenge(
          interaction.client,
          state,
          `${EMOJI[state.challenge.event]} ${state.challenge.event}\n\n<@${interaction.user.id}> declined and loses 2 🐟`
        );
      }

      return;
    }

    /* ---------------- TARGET SELECTION ---------------- */

    if (id === "casino_target") {
      if (state.phase !== "challenge" || !state.challenge) return;
      if (!interaction.isStringSelectMenu()) return;

      const actor = state.challenge.actor;
      if (interaction.user.id !== actor) {
        return interaction.reply({ content: "Only the active player can choose a target.", ephemeral: true });
      }

      const target = interaction.values[0];
      if (!state.alive.includes(target) || target === actor) {
        return interaction.reply({ content: "Invalid target.", ephemeral: true });
      }

      await interaction.deferUpdate();

      state.challenge.players = [actor, target];
      state.challenge.accepted = {};
      state.challenge.stage = "accept";

      const msg = await getChallengeMessage(interaction.client, state);
      if (!msg) return;

      await msg.edit({
        embeds: [createChallengeEmbed(
          `${EMOJI[state.challenge.event]} CASINO CHALLENGE`,
          `<@${actor}> vs <@${target}>\n\nEvent: **${state.challenge.event}**\n\nBoth players must accept to begin.`
        )],
        components: challengeAcceptRows()
      }).catch(() => {});

      await updatePanel(interaction.client, state, `${EMOJI[state.challenge.event]} ${state.challenge.event}\n\nWaiting for challenge acceptance...`);
      return;
    }

    /* ---------------- SOLO / SHARED CHALLENGES ---------------- */

    if (id === "casino_pick10" && interaction.isStringSelectMenu()) {
      if (state.phase !== "challenge" || !state.challenge) return;
      if (interaction.user.id !== state.challenge.actor) {
        return interaction.reply({ content: "Only the active player can choose.", ephemeral: true });
      }

      await interaction.deferUpdate();

      const num = parseInt(interaction.values[0], 10);
      state.fish[interaction.user.id] += num;

      await finishChallenge(
        interaction.client,
        state,
        `🔢 Lucky Pick\n<@${interaction.user.id}> picked ${num} and wins ${num} 🐟`
      );
      return;
    }

    if (id === "casino_pick5" && interaction.isStringSelectMenu()) {
      if (state.phase !== "challenge" || !state.challenge) return;
      if (interaction.user.id !== state.challenge.actor) {
        return interaction.reply({ content: "Only the active player can choose.", ephemeral: true });
      }

      await interaction.deferUpdate();

      const pick = parseInt(interaction.values[0], 10);
      const correct = rand(1, 5);
      const event = state.challenge.event;

      if (event === "Pick a Number") {
        if (pick === correct) {
          state.fish[interaction.user.id] += 4;
          await finishChallenge(
            interaction.client,
            state,
            `🎲 Pick a Number\n<@${interaction.user.id}> picked ${pick}\nCorrect was ${correct}\n+4 🐟`
          );
          return;
        }

        await finishChallenge(
          interaction.client,
          state,
          `🎲 Pick a Number\n<@${interaction.user.id}> picked ${pick}\nCorrect was ${correct}\nNo reward.`
        );
        return;
      }

      if (event === "Guess Number") {
        if (pick === correct) {
          state.fish[interaction.user.id] += 4;
          await finishChallenge(
            interaction.client,
            state,
            `🔢 Guess Number\n<@${interaction.user.id}> guessed ${pick}\nCorrect!\n+4 🐟`
          );
          return;
        }

        await finishChallenge(
          interaction.client,
          state,
          `🔢 Guess Number\n<@${interaction.user.id}> guessed ${pick}\nCorrect was ${correct}\nNo reward.`
        );
        return;
      }

      return;
    }

    if (id === "casino_risk_safe") {
      if (state.phase !== "challenge" || !state.challenge) return;
      if (interaction.user.id !== state.challenge.actor) {
        return interaction.reply({ content: "Only the active player can choose.", ephemeral: true });
      }

      await interaction.deferUpdate();

      const event = state.challenge.event;
      if (event === "Risk Choice") {
        state.fish[interaction.user.id] += 1;
        await finishChallenge(
          interaction.client,
          state,
          `🎯 Risk Choice\n<@${interaction.user.id}> played safe and gains +1 🐟`
        );
        return;
      }

      await finishChallenge(
        interaction.client,
        state,
        `🟩 Safe or Risk\n<@${interaction.user.id}> played safe.\nNo fish changed.`
      );
      return;
    }

    if (id === "casino_risk_risk") {
      if (state.phase !== "challenge" || !state.challenge) return;
      if (interaction.user.id !== state.challenge.actor) {
        return interaction.reply({ content: "Only the active player can choose.", ephemeral: true });
      }

      await interaction.deferUpdate();

      const event = state.challenge.event;

      if (event === "Risk Choice") {
        if (Math.random() < 0.5) {
          state.fish[interaction.user.id] += 5;
          await finishChallenge(interaction.client, state, `🎯 Risk Choice\n<@${interaction.user.id}> took the risk and won +5 🐟`);
          return;
        }
        state.fish[interaction.user.id] -= 3;
        await finishChallenge(interaction.client, state, `🎯 Risk Choice\n<@${interaction.user.id}> took the risk and lost 3 🐟`);
        return;
      }

      if (Math.random() < 0.5) {
        state.fish[interaction.user.id] += 4;
        await finishChallenge(interaction.client, state, `🟩 Safe or Risk\n<@${interaction.user.id}> took the risk and won +4 🐟`);
        return;
      }

      state.fish[interaction.user.id] -= 2;
      await finishChallenge(interaction.client, state, `🟩 Safe or Risk\n<@${interaction.user.id}> took the risk and lost 2 🐟`);
      return;
    }

    if (id === "casino_allin_yes") {
      if (state.phase !== "challenge" || !state.challenge) return;
      if (interaction.user.id !== state.challenge.actor) {
        return interaction.reply({ content: "Only the active player can choose.", ephemeral: true });
      }

      await interaction.deferUpdate();

      const amount = state.fish[interaction.user.id];
      if (amount <= 0) {
        await finishChallenge(interaction.client, state, `🎰 All In\n<@${interaction.user.id}> had nothing to bet.`);
        return;
      }

      if (Math.random() < 0.5) {
        state.fish[interaction.user.id] += amount;
        await finishChallenge(interaction.client, state, `🎰 All In\n<@${interaction.user.id}> doubled to ${state.fish[interaction.user.id]} 🐟`);
        return;
      }

      state.fish[interaction.user.id] = 0;
      await finishChallenge(interaction.client, state, `🎰 All In\n<@${interaction.user.id}> lost everything!`);
      return;
    }

    if (id === "casino_allin_no") {
      if (state.phase !== "challenge" || !state.challenge) return;
      if (interaction.user.id !== state.challenge.actor) {
        return interaction.reply({ content: "Only the active player can choose.", ephemeral: true });
      }

      await interaction.deferUpdate();
      await finishChallenge(interaction.client, state, `🎰 All In\n<@${interaction.user.id}> backed out.`);
      return;
    }

    /* ---------------- RPS ---------------- */

    if (["casino_rps_rock", "casino_rps_paper", "casino_rps_scissors"].includes(id)) {
      if (state.phase !== "challenge" || !state.challenge) return;

      if (!state.challenge.players.includes(interaction.user.id)) {
        return interaction.reply({ content: "You are not in this challenge.", ephemeral: true });
      }

      await interaction.deferUpdate();

      const choice = id.replace("casino_rps_", "");
      state.challenge.data.choices = state.challenge.data.choices || {};
      state.challenge.data.choices[interaction.user.id] = choice;

      const [a, b] = state.challenge.players;
      const ca = state.challenge.data.choices[a];
      const cb = state.challenge.data.choices[b];

      if (!ca || !cb) {
        const msg = await getChallengeMessage(interaction.client, state);
        if (msg) {
          await msg.edit({
            embeds: [createChallengeEmbed(
              `✊ ${state.challenge.event}`,
              `<@${a}> ${ca ? "✅" : "⏳"}\n<@${b}> ${cb ? "✅" : "⏳"}`
            )],
            components: rpsRows()
          }).catch(() => {});
        }
        return;
      }

      if (ca === cb) {
        await finishChallenge(interaction.client, state, `✊ Rock Paper Scissors\n<@${a}> chose ${ca}\n<@${b}> chose ${cb}\nTie!`);
        return;
      }

      const aWins =
        (ca === "rock" && cb === "scissors") ||
        (ca === "paper" && cb === "rock") ||
        (ca === "scissors" && cb === "paper");

      const winner = aWins ? a : b;
      const loser = aWins ? b : a;

      state.fish[winner] += 3;
      state.fish[loser] -= 3;

      await finishChallenge(
        interaction.client,
        state,
        `✊ Rock Paper Scissors\n<@${a}> chose ${ca}\n<@${b}> chose ${cb}\n<@${winner}> wins +3 🐟`
      );
      return;
    }

    /* ---------------- ROLL / DRAW ---------------- */

    if (id === "casino_roll") {
      if (state.phase !== "challenge" || !state.challenge) return;

      if (!state.challenge.players.includes(interaction.user.id)) {
        return interaction.reply({ content: "You are not in this challenge.", ephemeral: true });
      }

      await interaction.deferUpdate();

      state.challenge.data.rolls = state.challenge.data.rolls || {};
      state.challenge.data.rolls[interaction.user.id] = rand(1, 6);

      const [a, b] = state.challenge.players;
      const ra = state.challenge.data.rolls[a];
      const rb = state.challenge.data.rolls[b];

      const msg = await getChallengeMessage(interaction.client, state);

      if (!ra || !rb) {
        if (msg) {
          const label = state.challenge.event === "High Card Duel" ? "Draw Card" : "Roll";
          await msg.edit({
            embeds: [createChallengeEmbed(
              `${EMOJI[state.challenge.event]} ${state.challenge.event}`,
              `<@${a}> ${ra ? `(${ra})` : "⏳"}\n<@${b}> ${rb ? `(${rb})` : "⏳"}`
            )],
            components: rollRows(label)
          }).catch(() => {});
        }
        return;
      }

      if (ra === rb) {
        await finishChallenge(interaction.client, state, `${EMOJI[state.challenge.event]} ${state.challenge.event}\nTie! ${ra} - ${rb}\nNo fish changed.`);
        return;
      }

      const winner = ra > rb ? a : b;
      const loser = winner === a ? b : a;

      state.fish[winner] += 3;
      state.fish[loser] -= 3;

      await finishChallenge(
        interaction.client,
        state,
        `${EMOJI[state.challenge.event]} ${state.challenge.event}\n<@${a}> ${ra}\n<@${b}> ${rb}\n<@${winner}> wins +3 🐟`
      );
      return;
    }

    /* ---------------- COIN FLIP DUEL ---------------- */

    if (id === "casino_coin_heads" || id === "casino_coin_tails") {
      if (state.phase !== "challenge" || !state.challenge) return;

      if (!state.challenge.players.includes(interaction.user.id)) {
        return interaction.reply({ content: "You are not in this challenge.", ephemeral: true });
      }

      await interaction.deferUpdate();

      state.challenge.data.coinChoices = state.challenge.data.coinChoices || {};
      state.challenge.data.coinChoices[interaction.user.id] = id === "casino_coin_heads" ? "heads" : "tails";

      const [a, b] = state.challenge.players;
      const ca = state.challenge.data.coinChoices[a];
      const cb = state.challenge.data.coinChoices[b];

      if (!ca || !cb) {
        const msg = await getChallengeMessage(interaction.client, state);
        if (msg) {
          await msg.edit({
            embeds: [createChallengeEmbed(
              `🪙 Coin Flip Duel`,
              `<@${a}> ${ca ? "✅" : "⏳"}\n<@${b}> ${cb ? "✅" : "⏳"}`
            )],
            components: coinRows()
          }).catch(() => {});
        }
        return;
      }

      const result = Math.random() < 0.5 ? "heads" : "tails";
      const aCorrect = ca === result;
      const bCorrect = cb === result;

      if (aCorrect && !bCorrect) {
        state.fish[a] += 3;
        state.fish[b] -= 3;
        await finishChallenge(interaction.client, state, `🪙 Coin Flip Duel\nResult: ${result}\n<@${a}> wins +3 🐟`);
        return;
      }

      if (bCorrect && !aCorrect) {
        state.fish[b] += 3;
        state.fish[a] -= 3;
        await finishChallenge(interaction.client, state, `🪙 Coin Flip Duel\nResult: ${result}\n<@${b}> wins +3 🐟`);
        return;
      }

      await finishChallenge(interaction.client, state, `🪙 Coin Flip Duel\nResult: ${result}\nTie! No fish changed.`);
      return;
    }

    /* ---------------- REACTION / QUICK CLICK / FAST TYPE ---------------- */

    if (id === "casino_react_click") {
      if (state.phase !== "challenge" || !state.challenge) return;
      if (state.challenge.stage !== "armed") return;

      if (!state.challenge.players.includes(interaction.user.id)) {
        return interaction.reply({ content: "You are not in this challenge.", ephemeral: true });
      }

      await interaction.deferUpdate();

      const winner = interaction.user.id;
      const loser = state.challenge.players.find(id2 => id2 !== winner);

      state.fish[winner] += 3;
      if (loser) state.fish[loser] -= 3;

      await finishChallenge(
        interaction.client,
        state,
        `${EMOJI[state.challenge.event]} ${state.challenge.event}\n<@${winner}> clicked first and wins +3 🐟`
      );
      return;
    }

    /* ---------------- QUIZ CHALLENGES ---------------- */

    if (id.startsWith("casino_quiz_")) {
      if (state.phase !== "challenge" || !state.challenge) return;

      if (!state.challenge.players.includes(interaction.user.id)) {
        return interaction.reply({ content: "You are not in this challenge.", ephemeral: true });
      }

      await interaction.deferUpdate();

      const choice = parseInt(id.split("_")[2], 10);
      state.challenge.data.answered = state.challenge.data.answered || {};
      state.challenge.data.answered[interaction.user.id] = choice;

      if (choice === state.challenge.data.answer) {
        const winner = interaction.user.id;
        const loser = state.challenge.players.find(id2 => id2 !== winner);

        state.fish[winner] += 3;
        if (loser) state.fish[loser] -= 3;

        await finishChallenge(
          interaction.client,
          state,
          `${EMOJI[state.challenge.event]} ${state.challenge.event}\n<@${winner}> answered correctly and wins +3 🐟`
        );
        return;
      }

      const answeredCount = Object.keys(state.challenge.data.answered).length;
      if (answeredCount >= state.challenge.players.length) {
        await finishChallenge(
          interaction.client,
          state,
          `${EMOJI[state.challenge.event]} ${state.challenge.event}\nNo correct answers. No fish changed.`
        );
      }

      return;
    }

    /* ---------------- STEAL / GIFT ---------------- */

    if (id === "casino_target_select_done") {
      return;
    }

    /* target selection uses casino_target handled earlier, actual effect starts after both accept */

    /* ---------------- BLACKJACK ---------------- */

    if (id === "casino_bj_hit" || id === "casino_bj_stand") {
      if (state.phase !== "challenge" || !state.challenge || state.challenge.event !== "Blackjack") return;

      const current = state.challenge.data.current;
      if (interaction.user.id !== current) {
        return interaction.reply({ content: "Not your turn in blackjack.", ephemeral: true });
      }

      await interaction.deferUpdate();

      const hands = state.challenge.data.hands;
      const stood = state.challenge.data.stood;
      const players = state.challenge.players;
      const idx = players.indexOf(current);

      if (id === "casino_bj_hit") {
        hands[current].push(drawCard());
        if (handScore(hands[current]) > 21) {
          stood[current] = true;
        }
      } else {
        stood[current] = true;
      }

      const nextPlayer = players.find(p => !stood[p] && handScore(hands[p]) <= 21);

      if (!nextPlayer) {
        const [a, b] = players;
        const sa = handScore(hands[a]);
        const sb = handScore(hands[b]);

        const aBust = sa > 21;
        const bBust = sb > 21;

        if ((aBust && bBust) || sa === sb) {
          await finishChallenge(
            interaction.client,
            state,
            `♠️ Blackjack\n<@${a}> ${sa}\n<@${b}> ${sb}\nPush! No fish changed.`
          );
          return;
        }

        const winner = (!aBust && (bBust || sa > sb)) ? a : b;
        const loser = winner === a ? b : a;

        state.fish[winner] += 4;
        state.fish[loser] -= 4;

        await finishChallenge(
          interaction.client,
          state,
          `♠️ Blackjack\n<@${a}> ${sa}\n<@${b}> ${sb}\n<@${winner}> wins +4 🐟`
        );
        return;
      }

      state.challenge.data.current = nextPlayer;
      const msg = await getChallengeMessage(interaction.client, state);
      if (!msg) return;

      const [a, b] = players;

      await msg.edit({
        embeds: [createChallengeEmbed(
          `♠️ Blackjack`,
          `<@${a}> — ${hands[a].join(" ")} (${handScore(hands[a])})\n<@${b}> — ${hands[b].join(" ")} (${handScore(hands[b])})\n\nTurn: <@${state.challenge.data.current}>`
        )],
        components: bjRows(state)
      }).catch(() => {});
      return;
    }

    /* ---------------- CHALLENGE SPECIAL START FOR STEAL/GIFT ---------------- */

    if (state.phase === "challenge" && state.challenge && (state.challenge.event === "Steal" || state.challenge.event === "Gift")) {
      if (state.challenge.stage === "play") {
        const actor = state.challenge.actor;
        const target = state.challenge.players[1];

        if (state.challenge.event === "Steal") {
          const amount = Math.min(2, state.fish[target]);
          state.fish[target] -= amount;
          state.fish[actor] += amount;
          await finishChallenge(interaction.client, state, `🦹 Steal\n<@${actor}> steals ${amount} 🐟 from <@${target}>`);
          return;
        }

        const amount = Math.min(2, state.fish[actor]);
        state.fish[actor] -= amount;
        state.fish[target] += amount;
        await finishChallenge(interaction.client, state, `🎁 Gift\n<@${actor}> gives ${amount} 🐟 to <@${target}>`);
        return;
      }
    }
  }
};
