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

/* ---------------- EVENTS ---------------- */

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

/* ---------------- BASIC HELPERS ---------------- */

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

function isChallengeEvent(event) {
  return CHALLENGE_EVENTS.includes(event);
}

function currentTurnPlayer(state) {
  return state.alive[state.turn];
}

function randomAliveExcept(state, playerId) {
  const others = state.alive.filter(id => id !== playerId);
  if (!others.length) return null;
  return others[rand(0, others.length - 1)];
}

function clampFish(state) {
  for (const id of Object.keys(state.fish)) {
    if (state.fish[id] < 0) state.fish[id] = 0;
  }
}

function eliminatePlayers(state) {
  const removed = [];

  for (const id of [...state.alive]) {
    if ((state.fish[id] || 0) <= 0) {
      removed.push(id);
    }
  }

  state.alive = state.alive.filter(id => (state.fish[id] || 0) > 0);
  return removed;
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

function wheelText() {
  const economy = ECONOMY_EVENTS.map((e, i) => `${i + 1} ${EMOJI[e]} ${e}`).join("\n");
  const challenges = CHALLENGE_EVENTS.map((e, i) => `${i + 11} ${EMOJI[e]} ${e}`).join("\n");

  return `💰 **Economy**\n${economy}\n\n🎮 **Challenges**\n${challenges}`;
}

function lobbyEmbed(state) {
  const players = state.players.map(id => `• <@${id}>`).join("\n") || "No players";

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

function challengeEmbed(title, description) {
  return { title, description };
}

/* ---------------- COMPONENT ROWS ---------------- */

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
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino_spin")
        .setLabel("SPIN")
        .setEmoji("🎡")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(state.phase !== "spin"),

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

function rollRows(label = "Roll") {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("casino_roll")
        .setLabel(label)
        .setEmoji("🎲")
        .setStyle(ButtonStyle.Primary)
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

function amountRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("casino_amount_1").setLabel("1 Fish").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("casino_amount_2").setLabel("2 Fish").setStyle(ButtonStyle.Primary)
    )
  ];
}

function pickRows(customId, max) {
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

function quizRows(options) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("casino_quiz_0").setLabel(options[0]).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("casino_quiz_1").setLabel(options[1]).setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("casino_quiz_2").setLabel(options[2]).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("casino_quiz_3").setLabel(options[3]).setStyle(ButtonStyle.Primary)
    )
  ];
}

function bjRows(state) {
  const data = state.challenge.data;
  const current = data.current;
  const stood = data.stood || {};
  const canPlay = !stood[current];

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("casino_bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setDisabled(!canPlay),
      new ButtonBuilder().setCustomId("casino_bj_stand").setLabel("Stand").setStyle(ButtonStyle.Success).setDisabled(!canPlay)
    )
  ];
}

/* ---------------- SAFE ACK ---------------- */

async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp({ ...payload, ephemeral: payload.ephemeral ?? true }).catch(() => null);
    }
    return await interaction.reply(payload).catch(() => null);
  } catch {
    return null;
  }
}

async function safeDefer(interaction) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }
  } catch {}
}

/* ---------------- FETCH/UPDATE HELPERS ---------------- */

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

async function updatePanel(client, state, text) {
  const panel = await getPanel(client, state);
  if (!panel) return false;

  await panel.edit({
    embeds: [panelEmbed(state, text)],
    components: panelRows(state)
  }).catch(() => {});

  return true;
}

async function sendMainResult(client, state, text) {
  const main =
    client.channels.cache.get(state.mainChannelId) ||
    await client.channels.fetch(state.mainChannelId).catch(() => null);

  if (!main) return;
  await main.send(text).catch(() => {});
}

/* ---------------- TIMERS ---------------- */

function clearTurnTimer(state) {
  if (state.turnTimer) {
    clearTimeout(state.turnTimer);
    state.turnTimer = null;
  }
}

function clearChallengeTimer(state) {
  if (state.challengeTimer) {
    clearTimeout(state.challengeTimer);
    state.challengeTimer = null;
  }
}

function startTurnTimer(client, state) {
  clearTurnTimer(state);

  if (state.phase !== "spin") return;

  state.turnToken = (state.turnToken || 0) + 1;
  const token = state.turnToken;

  state.turnTimer = setTimeout(async () => {
    try {
      if (state.phase !== "spin") return;
      if (state.turnToken !== token) return;
      await processSpin(client, state);
    } catch (err) {
      console.error("casino turn timer error:", err);
      state.phase = "spin";
      await updatePanel(client, state, "⚠️ Turn timer failed. The game recovered.");
      startTurnTimer(client, state);
    }
  }, TURN_TIMEOUT_MS);
}

/* ---------------- CARD HELPERS ---------------- */

function drawCard() {
  const cards = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  return cards[rand(0, cards.length - 1)];
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

/* ---------------- END/CLOSE ---------------- */

async function closeCasino(client, state, finalText) {
  clearTurnTimer(state);
  clearChallengeTimer(state);

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

function setNextTurnAfterResolution(state, actingPlayerId, oldTurnIndex) {
  if (!state.alive.length) return;

  const idx = state.alive.indexOf(actingPlayerId);

  if (idx !== -1) {
    state.turn = idx + 1;
    if (state.turn >= state.alive.length) state.turn = 0;
  } else {
    state.turn = oldTurnIndex;
    if (state.turn >= state.alive.length) state.turn = 0;
  }
}

async function maybeFinishAfterResolution(client, state, resultText, actingPlayerId, oldTurnIndex) {
  clampFish(state);
  const removed = eliminatePlayers(state);

  let finalResult = resultText;
  if (removed.length) {
    finalResult += `\n\n💀 Out:\n${removed.map(id => `<@${id}>`).join("\n")}`;
  }

  if (state.alive.length === 0) {
    await closeCasino(client, state, `🛑 Everyone was eliminated.\n\nWinner: none`);
    return { done: true, result: finalResult };
  }

  if (state.alive.length === 1) {
    const winner = state.alive[0];
    await closeCasino(client, state, `🏆 <@${winner}> wins the casino!\n\nFinal Fish: ${state.fish[winner]} 🐟`);
    return { done: true, result: finalResult };
  }

  setNextTurnAfterResolution(state, actingPlayerId, oldTurnIndex);
  return { done: false, result: finalResult };
}

/* ---------------- ECONOMY EVENTS ---------------- */

function runEconomyEvent(state, event) {
  const player = currentTurnPlayer(state);

  if (event === "Small Win") {
    state.fish[player] += 2;
    return `<@${player}> wins +2 🐟`;
  }

  if (event === "Big Win") {
    state.fish[player] += 5;
    return `<@${player}> wins +5 🐟`;
  }

  if (event === "Lose Fish") {
    state.fish[player] -= 2;
    return `<@${player}> loses 2 🐟`;
  }

  if (event === "Disaster") {
    state.fish[player] -= 4;
    return `<@${player}> loses 4 🐟`;
  }

  if (event === "Casino Tax") {
    state.alive.forEach(id => { state.fish[id] -= 1; });
    return `🏛️ Casino Tax!\nEveryone loses 1 🐟`;
  }

  if (event === "Charity") {
    state.alive.forEach(id => { state.fish[id] += 1; });
    return `🎁 Charity!\nEveryone gains 1 🐟`;
  }

  if (event === "Fish Rain") {
    state.alive.forEach(id => { state.fish[id] += 2; });
    return `🐟 Fish Rain!\nEveryone gains 2 🐟`;
  }

  if (event === "Fish Storm") {
    state.alive.forEach(id => { state.fish[id] -= 2; });
    return `🌪️ Fish Storm!\nEveryone loses 2 🐟`;
  }

  if (event === "Lucky Player") {
    const target = state.alive[rand(0, state.alive.length - 1)];
    state.fish[target] += 3;
    return `🍀 Lucky Player!\n<@${target}> gains 3 🐟`;
  }

  if (event === "Bomb") {
    const target = state.alive[rand(0, state.alive.length - 1)];
    state.fish[target] -= 3;
    return `💣 Bomb!\n<@${target}> loses 3 🐟`;
  }

  return null;
}

/* ---------------- CHALLENGE CREATION ---------------- */

function buildChallenge(state, event) {
  const actor = currentTurnPlayer(state);
  const oldTurnIndex = state.turn;
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

async function openChallenge(client, state, event) {
  clearTurnTimer(state);

  const thread = await getThread(client, state);
  if (!thread) return false;

  const challenge = buildChallenge(state, event);
  if (!challenge) return false;

  state.phase = "challenge";
  state.challenge = challenge;

  const msg = await thread.send({
    embeds: [challengeEmbed(
      `${EMOJI[event]} CASINO CHALLENGE`,
      `<@${challenge.players[0]}> vs <@${challenge.players[1]}>\n\nEvent: **${event}**\n\nBoth players must accept to begin.`
    )],
    components: challengeAcceptRows()
  }).catch(() => null);

  if (!msg) {
    state.phase = "spin";
    state.challenge = null;
    return false;
  }

  state.challengeMessageId = msg.id;
  await updatePanel(client, state, `${EMOJI[event]} ${event}\n\nWaiting for challenge...`);
  return true;
}

/* ---------------- CHALLENGE PLAY START ---------------- */

async function beginChallengeGameplay(client, state) {
  const msg = await getChallengeMessage(client, state);
  if (!msg || !state.challenge) return;

  state.challenge.stage = "play";
  const event = state.challenge.event;
  const [a, b] = state.challenge.players;

  if (["Reaction Duel", "Quick Click", "Fast Type"].includes(event)) {
    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\nWAIT...`
      )],
      components: reactionRows(false)
    }).catch(() => {});

    clearChallengeTimer(state);
    state.challengeTimer = setTimeout(async () => {
      try {
        if (!state.challenge) return;
        state.challenge.stage = "armed";

        const armedMsg = await getChallengeMessage(client, state);
        if (!armedMsg) return;

        await armedMsg.edit({
          embeds: [challengeEmbed(
            `${EMOJI[event]} ${event}`,
            `<@${a}> vs <@${b}>\n\nCLICK NOW!`
          )],
          components: reactionRows(true)
        }).catch(() => {});

        clearChallengeTimer(state);
        state.challengeTimer = setTimeout(async () => {
          if (!state.challenge) return;
          await finishChallenge(client, state, `${EMOJI[event]} ${event}\n\nNo one reacted in time. No fish changed.`);
        }, CHALLENGE_TIMEOUT_MS);
      } catch (err) {
        console.error("beginChallengeGameplay reaction error:", err);
        await finishChallenge(client, state, `${EMOJI[event]} ${event}\n\nChallenge failed. No fish changed.`);
      }
    }, rand(1500, 3500));

    return;
  }

  if (event === "Rock Paper Scissors") {
    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\nChoose your move.`
      )],
      components: rpsRows()
    }).catch(() => {});
    return;
  }

  if (event === "Dice Duel") {
    state.challenge.data.rolls = {};
    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\nBoth players must roll.`
      )],
      components: rollRows("Roll")
    }).catch(() => {});
    return;
  }

  if (event === "High Card Duel") {
    state.challenge.data.rolls = {};
    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\nBoth players draw a card.`
      )],
      components: rollRows("Draw Card")
    }).catch(() => {});
    return;
  }

  if (event === "Coin Flip Duel") {
    state.challenge.data.coinChoices = {};
    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\nChoose Heads or Tails.`
      )],
      components: coinRows()
    }).catch(() => {});
    return;
  }

  if (event === "Lucky Pick") {
    state.challenge.data.picks = {};
    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\nBoth players choose 1-10. Closest to the hidden target wins.`
      )],
      components: pickRows("casino_pick10", 10)
    }).catch(() => {});
    return;
  }

  if (event === "Pick a Number" || event === "Guess Number") {
    state.challenge.data.picks = {};
    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\nBoth players choose 1-5.`
      )],
      components: pickRows("casino_pick5", 5)
    }).catch(() => {});
    return;
  }

  if (event === "Risk Choice" || event === "Safe or Risk") {
    state.challenge.data.choices = {};
    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\nBoth players choose Safe or Risk.`
      )],
      components: riskRows()
    }).catch(() => {});
    return;
  }

  if (event === "All In") {
    state.challenge.data.choices = {};
    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\nBoth players decide whether to go all in.`
      )],
      components: allInRows()
    }).catch(() => {});
    return;
  }

  if (event === "Steal" || event === "Gift") {
    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\n<@${a}> chooses the amount.`
      )],
      components: amountRows()
    }).catch(() => {});
    return;
  }

  if (event === "Math Duel") {
    const x = rand(5, 25);
    const y = rand(5, 25);
    const correct = x + y;
    const wrong = shuffle([correct + 1, correct - 1, correct + 2]).slice(0, 3);
    const options = shuffle([correct, ...wrong]).slice(0, 4);

    state.challenge.data.answer = options.indexOf(correct);
    state.challenge.data.answered = {};

    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\n${x} + ${y} = ?`
      )],
      components: quizRows(options.map(String))
    }).catch(() => {});

    clearChallengeTimer(state);
    state.challengeTimer = setTimeout(async () => {
      try {
        if (!state.challenge) return;
        await finishChallenge(client, state, `${EMOJI[event]} ${event}\n\nTime's up. No fish changed.`);
      } catch (err) {
        console.error("Math Duel timeout error:", err);
      }
    }, CHALLENGE_TIMEOUT_MS);
    return;
  }

  if (event === "Trivia") {
    const q = TRIVIA_POOL[rand(0, TRIVIA_POOL.length - 1)];
    state.challenge.data.answer = q.answer;
    state.challenge.data.answered = {};

    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\n${q.q}`
      )],
      components: quizRows(q.options)
    }).catch(() => {});

    clearChallengeTimer(state);
    state.challengeTimer = setTimeout(async () => {
      try {
        if (!state.challenge) return;
        await finishChallenge(client, state, `${EMOJI[event]} ${event}\n\nTime's up. No fish changed.`);
      } catch (err) {
        console.error("Trivia timeout error:", err);
      }
    }, CHALLENGE_TIMEOUT_MS);
    return;
  }

  if (event === "Word Scramble") {
    const q = SCRAMBLE_POOL[rand(0, SCRAMBLE_POOL.length - 1)];
    state.challenge.data.answer = q.answer;
    state.challenge.data.answered = {};

    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\n${q.q}`
      )],
      components: quizRows(q.options)
    }).catch(() => {});

    clearChallengeTimer(state);
    state.challengeTimer = setTimeout(async () => {
      try {
        if (!state.challenge) return;
        await finishChallenge(client, state, `${EMOJI[event]} ${event}\n\nTime's up. No fish changed.`);
      } catch (err) {
        console.error("Word Scramble timeout error:", err);
      }
    }, CHALLENGE_TIMEOUT_MS);
    return;
  }

  if (event === "Emoji Memory") {
    const q = EMOJI_MEMORY_POOL[rand(0, EMOJI_MEMORY_POOL.length - 1)];
    state.challenge.data.answer = q.answer;
    state.challenge.data.answered = {};

    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> vs <@${b}>\n\n${q.q}`
      )],
      components: quizRows(q.options)
    }).catch(() => {});

    clearChallengeTimer(state);
    state.challengeTimer = setTimeout(async () => {
      try {
        if (!state.challenge) return;
        await finishChallenge(client, state, `${EMOJI[event]} ${event}\n\nTime's up. No fish changed.`);
      } catch (err) {
        console.error("Emoji Memory timeout error:", err);
      }
    }, CHALLENGE_TIMEOUT_MS);
    return;
  }

  if (event === "Blackjack") {
    state.challenge.data.hands = {
      [a]: [drawCard(), drawCard()],
      [b]: [drawCard(), drawCard()]
    };
    state.challenge.data.stood = {};
    state.challenge.data.current = a;

    await msg.edit({
      embeds: [challengeEmbed(
        `${EMOJI[event]} ${event}`,
        `<@${a}> — ${state.challenge.data.hands[a].join(" ")} (${handScore(state.challenge.data.hands[a])})\n` +
        `<@${b}> — ${state.challenge.data.hands[b].join(" ")} (${handScore(state.challenge.data.hands[b])})\n\n` +
        `Turn: <@${state.challenge.data.current}>`
      )],
      components: bjRows(state)
    }).catch(() => {});
  }
}

/* ---------------- CHALLENGE FINISH ---------------- */

async function finishChallenge(client, state, resultText) {
  if (!state.challenge) return;

  clearChallengeTimer(state);

  const msg = await getChallengeMessage(client, state);
  if (msg) {
    await msg.edit({
      embeds: [challengeEmbed("✅ Challenge Finished", resultText)],
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

  if (msg) {
    setTimeout(async () => {
      await msg.delete().catch(() => {});
    }, 1500);
  }

  startTurnTimer(client, state);
}

/* ---------------- SPIN PROCESS ---------------- */

async function processSpin(client, state) {
  if (state.phase !== "spin") return;

  const actingPlayer = currentTurnPlayer(state);
  const oldTurnIndex = state.turn;
  const panel = await getPanel(client, state);

  if (!panel) {
    games.delete(state.mainChannelId);
    return;
  }

  clearTurnTimer(state);

  try {
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
        const fallback = `${EMOJI[event]} ${event}\n\nChallenge could not start.`;
        const outcome = await maybeFinishAfterResolution(client, state, fallback, actingPlayer, oldTurnIndex);

        if (!outcome.done) {
          await updatePanel(client, state, outcome.result);
          startTurnTimer(client, state);
        }
      }

      return;
    }

    const result = runEconomyEvent(state, event) || `${EMOJI[event]} ${event}`;

    const outcome = await maybeFinishAfterResolution(
      client,
      state,
      `${EMOJI[event]} ${event}\n\n${result}`,
      actingPlayer,
      oldTurnIndex
    );

    if (outcome.done) return;

    await updatePanel(client, state, outcome.result);
    startTurnTimer(client, state);

  } catch (err) {
    console.error("processSpin error:", err);

    state.phase = "spin";
    clearChallengeTimer(state);
    clearTurnTimer(state);

    await updatePanel(
      client,
      state,
      "⚠️ Spin failed.\nThe game recovered and is ready again."
    ).catch(() => {});

    startTurnTimer(client, state);
  }
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

    try {
      const id = interaction.customId;

      /* ---------------- LOBBY ---------------- */

      if (id === "casino_join") {
        if (state.phase !== "lobby") return;

        if (state.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You already joined.", ephemeral: true });
          return;
        }

        if (state.players.length >= MAX_PLAYERS) {
          await safeReply(interaction, { content: "Lobby is full.", ephemeral: true });
          return;
        }

        state.players.push(interaction.user.id);

        await interaction.update({
          embeds: [lobbyEmbed(state)],
          components: lobbyRows()
        }).catch(() => {});
        return;
      }

      if (id === "casino_leave") {
        if (state.phase !== "lobby") return;

        if (!state.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not in the lobby.", ephemeral: true });
          return;
        }

        state.players = state.players.filter(id2 => id2 !== interaction.user.id);

        if (!state.players.length) {
          games.delete(interaction.channelId);
          await interaction.update({
            content: "❌ Casino cancelled.",
            embeds: [],
            components: []
          }).catch(() => {});
          return;
        }

        if (state.hostId === interaction.user.id) {
          state.hostId = state.players[0];
        }

        await interaction.update({
          embeds: [lobbyEmbed(state)],
          components: lobbyRows()
        }).catch(() => {});
        return;
      }

      if (id === "casino_cancel") {
        if (state.phase !== "lobby") return;

        if (interaction.user.id !== state.hostId) {
          await safeReply(interaction, { content: "Only host can cancel.", ephemeral: true });
          return;
        }

        games.delete(interaction.channelId);

        await interaction.update({
          content: "❌ Casino cancelled.",
          embeds: [],
          components: []
        }).catch(() => {});
        return;
      }

      if (id === "casino_start") {
        if (state.phase !== "lobby") return;

        if (interaction.user.id !== state.hostId) {
          await safeReply(interaction, { content: "Only host can start.", ephemeral: true });
          return;
        }

        if (state.players.length < MIN_PLAYERS) {
          await safeReply(interaction, { content: "Not enough players.", ephemeral: true });
          return;
        }

        state.phase = "spin";
        state.mainChannelId = interaction.channelId;
        state.alive = [...state.players];
        state.turn = 0;
        state.fish = {};
        state.turnToken = 0;
        state.challenge = null;
        state.challengeMessageId = null;

        state.players.forEach(id2 => {
          state.fish[id2] = STARTING_FISH;
        });

        const thread = await interaction.channel.threads.create({
          name: `casino-${interaction.user.username}`,
          type: ChannelType.PrivateThread,
          invitable: false
        });

        state.threadId = thread.id;

        for (const id2 of state.players) {
          try {
            await thread.members.add(id2);
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
        }).catch(() => {});

        startTurnTimer(interaction.client, state);
        return;
      }

      /* ---------------- GAME CONTROL ---------------- */

      if (id === "casino_end") {
        if (state.phase !== "spin" && state.phase !== "challenge") return;

        if (interaction.user.id !== state.hostId) {
          await safeReply(interaction, { content: "Only host can end the game.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);
        await closeCasino(interaction.client, state, `🛑 Casino ended by host.\n\nWinner: none`);
        return;
      }

      if (id === "casino_spin") {
        if (state.phase !== "spin") {
          await safeReply(interaction, {
            content: "You cannot spin right now.",
            ephemeral: true
          });
          return;
        }

        const player = currentTurnPlayer(state);

        if (!player) {
          games.delete(state.mainChannelId);
          await safeReply(interaction, {
            content: "Game state lost. The game was closed.",
            ephemeral: true
          });
          return;
        }

        if (interaction.user.id !== player) {
          await safeReply(interaction, {
            content: "Not your turn.",
            ephemeral: true
          });
          return;
        }

        try {
          await safeDefer(interaction);
          await processSpin(interaction.client, state);
        } catch (err) {
          console.error("casino_spin error:", err);

          state.phase = "spin";
          clearChallengeTimer(state);
          clearTurnTimer(state);

          await updatePanel(
            interaction.client,
            state,
            "⚠️ Spin failed.\nThe game recovered and is ready again."
          ).catch(() => {});

          startTurnTimer(interaction.client, state);
        }

        return;
      }

      /* ---------------- ACCEPT / DECLINE ---------------- */

      if (id === "casino_ch_accept") {
        if (state.phase !== "challenge" || !state.challenge) return;

        if (!state.challenge.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not part of this challenge.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

        state.challenge.accepted[interaction.user.id] = true;

        const allAccepted = state.challenge.players.every(id2 => state.challenge.accepted[id2]);
        const msg = await getChallengeMessage(interaction.client, state);

        if (!allAccepted) {
          if (msg) {
            await msg.edit({
              embeds: [challengeEmbed(
                `${EMOJI[state.challenge.event]} CASINO CHALLENGE`,
                `${state.challenge.players.map(id2 => `${state.challenge.accepted[id2] ? "✅" : "⏳"} <@${id2}>`).join("\n")}\n\nEvent: **${state.challenge.event}**`
              )],
              components: challengeAcceptRows()
            }).catch(() => {});
          }
          return;
        }

        await beginChallengeGameplay(interaction.client, state);
        await updatePanel(interaction.client, state, `${EMOJI[state.challenge.event]} ${state.challenge.event}\n\nChallenge in progress...`);
        return;
      }

      if (id === "casino_ch_decline") {
        if (state.phase !== "challenge" || !state.challenge) return;

        if (!state.challenge.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not part of this challenge.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

        const other = state.challenge.players.find(id2 => id2 !== interaction.user.id);
        state.fish[interaction.user.id] -= 3;
        if (other) state.fish[other] += 3;

        await finishChallenge(
          interaction.client,
          state,
          `${EMOJI[state.challenge.event]} ${state.challenge.event}\n\n<@${interaction.user.id}> declined.\n${other ? `<@${other}> wins +3 🐟` : ""}`
        );
        return;
      }

      /* ---------------- RPS ---------------- */

      if (["casino_rps_rock", "casino_rps_paper", "casino_rps_scissors"].includes(id)) {
        if (state.phase !== "challenge" || !state.challenge) return;

        if (!state.challenge.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not in this challenge.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

        state.challenge.data.choices = state.challenge.data.choices || {};
        state.challenge.data.choices[interaction.user.id] = id.replace("casino_rps_", "");

        const [a, b] = state.challenge.players;
        const ca = state.challenge.data.choices[a];
        const cb = state.challenge.data.choices[b];

        if (!ca || !cb) {
          const msg = await getChallengeMessage(interaction.client, state);
          if (msg) {
            await msg.edit({
              embeds: [challengeEmbed(
                `✊ Rock Paper Scissors`,
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

      /* ---------------- ROLL / DRAW CARD ---------------- */

      if (id === "casino_roll") {
        if (state.phase !== "challenge" || !state.challenge) return;

        if (!state.challenge.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not in this challenge.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

        state.challenge.data.rolls = state.challenge.data.rolls || {};
        state.challenge.data.rolls[interaction.user.id] = rand(1, 6);

        const [a, b] = state.challenge.players;
        const ra = state.challenge.data.rolls[a];
        const rb = state.challenge.data.rolls[b];

        if (!ra || !rb) {
          const msg = await getChallengeMessage(interaction.client, state);
          if (msg) {
            const label = state.challenge.event === "High Card Duel" ? "Draw Card" : "Roll";
            await msg.edit({
              embeds: [challengeEmbed(
                `${EMOJI[state.challenge.event]} ${state.challenge.event}`,
                `<@${a}> ${ra ? `(${ra})` : "⏳"}\n<@${b}> ${rb ? `(${rb})` : "⏳"}`
              )],
              components: rollRows(label)
            }).catch(() => {});
          }
          return;
        }

        if (ra === rb) {
          await finishChallenge(
            interaction.client,
            state,
            `${EMOJI[state.challenge.event]} ${state.challenge.event}\nTie! ${ra} - ${rb}\nNo fish changed.`
          );
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

      /* ---------------- COIN FLIP ---------------- */

      if (id === "casino_coin_heads" || id === "casino_coin_tails") {
        if (state.phase !== "challenge" || !state.challenge) return;

        if (!state.challenge.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not in this challenge.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

        state.challenge.data.coinChoices = state.challenge.data.coinChoices || {};
        state.challenge.data.coinChoices[interaction.user.id] =
          id === "casino_coin_heads" ? "heads" : "tails";

        const [a, b] = state.challenge.players;
        const ca = state.challenge.data.coinChoices[a];
        const cb = state.challenge.data.coinChoices[b];

        if (!ca || !cb) {
          const msg = await getChallengeMessage(interaction.client, state);
          if (msg) {
            await msg.edit({
              embeds: [challengeEmbed(
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

      /* ---------------- PICKS ---------------- */

      if ((id === "casino_pick10" || id === "casino_pick5") && interaction.isStringSelectMenu()) {
        if (state.phase !== "challenge" || !state.challenge) return;

        if (!state.challenge.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not in this challenge.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

        state.challenge.data.picks = state.challenge.data.picks || {};
        state.challenge.data.picks[interaction.user.id] = parseInt(interaction.values[0], 10);

        const [a, b] = state.challenge.players;
        const pa = state.challenge.data.picks[a];
        const pb = state.challenge.data.picks[b];

        if (pa == null || pb == null) {
          const msg = await getChallengeMessage(interaction.client, state);
          if (msg) {
            const max = id === "casino_pick10" ? 10 : 5;
            await msg.edit({
              embeds: [challengeEmbed(
                `${EMOJI[state.challenge.event]} ${state.challenge.event}`,
                `<@${a}> ${pa != null ? `(${pa})` : "⏳"}\n<@${b}> ${pb != null ? `(${pb})` : "⏳"}`
              )],
              components: pickRows(id, max)
            }).catch(() => {});
          }
          return;
        }

        const max = id === "casino_pick10" ? 10 : 5;
        const target = rand(1, max);
        const da = Math.abs(pa - target);
        const db = Math.abs(pb - target);

        if (da === db) {
          await finishChallenge(interaction.client, state, `${EMOJI[state.challenge.event]} ${state.challenge.event}\nTarget: ${target}\nTie!`);
          return;
        }

        const winner = da < db ? a : b;
        const loser = winner === a ? b : a;

        state.fish[winner] += 3;
        state.fish[loser] -= 3;

        await finishChallenge(
          interaction.client,
          state,
          `${EMOJI[state.challenge.event]} ${state.challenge.event}\nTarget: ${target}\n<@${winner}> wins +3 🐟`
        );
        return;
      }

      /* ---------------- RISK / SAFE ---------------- */

      if (id === "casino_risk_safe" || id === "casino_risk_risk") {
        if (state.phase !== "challenge" || !state.challenge) return;

        if (!state.challenge.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not in this challenge.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

        state.challenge.data.choices = state.challenge.data.choices || {};
        state.challenge.data.choices[interaction.user.id] = id === "casino_risk_safe" ? "safe" : "risk";

        const [a, b] = state.challenge.players;
        const ca = state.challenge.data.choices[a];
        const cb = state.challenge.data.choices[b];

        if (!ca || !cb) {
          const msg = await getChallengeMessage(interaction.client, state);
          if (msg) {
            await msg.edit({
              embeds: [challengeEmbed(
                `${EMOJI[state.challenge.event]} ${state.challenge.event}`,
                `<@${a}> ${ca ? "✅" : "⏳"}\n<@${b}> ${cb ? "✅" : "⏳"}`
              )],
              components: riskRows()
            }).catch(() => {});
          }
          return;
        }

        let text = `${EMOJI[state.challenge.event]} ${state.challenge.event}\n`;

        for (const p of [a, b]) {
          const c = state.challenge.data.choices[p];

          if (state.challenge.event === "Risk Choice") {
            if (c === "safe") {
              state.fish[p] += 1;
              text += `\n<@${p}> played safe (+1 🐟)`;
            } else if (Math.random() < 0.5) {
              state.fish[p] += 5;
              text += `\n<@${p}> risked and won +5 🐟`;
            } else {
              state.fish[p] -= 3;
              text += `\n<@${p}> risked and lost 3 🐟`;
            }
          } else {
            if (c === "safe") {
              text += `\n<@${p}> played safe (0)`;
            } else if (Math.random() < 0.5) {
              state.fish[p] += 4;
              text += `\n<@${p}> risked and won +4 🐟`;
            } else {
              state.fish[p] -= 2;
              text += `\n<@${p}> risked and lost 2 🐟`;
            }
          }
        }

        await finishChallenge(interaction.client, state, text);
        return;
      }

      /* ---------------- ALL IN ---------------- */

      if (id === "casino_allin_yes" || id === "casino_allin_no") {
        if (state.phase !== "challenge" || !state.challenge) return;

        if (!state.challenge.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not in this challenge.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

        state.challenge.data.choices = state.challenge.data.choices || {};
        state.challenge.data.choices[interaction.user.id] = id === "casino_allin_yes" ? "yes" : "no";

        const [a, b] = state.challenge.players;
        const ca = state.challenge.data.choices[a];
        const cb = state.challenge.data.choices[b];

        if (!ca || !cb) {
          const msg = await getChallengeMessage(interaction.client, state);
          if (msg) {
            await msg.edit({
              embeds: [challengeEmbed(
                `🎰 All In`,
                `<@${a}> ${ca ? "✅" : "⏳"}\n<@${b}> ${cb ? "✅" : "⏳"}`
              )],
              components: allInRows()
            }).catch(() => {});
          }
          return;
        }

        if (ca === "no" && cb === "no") {
          await finishChallenge(interaction.client, state, `🎰 All In\nBoth backed out. No fish changed.`);
          return;
        }

        if (ca === "yes" && cb === "no") {
          state.fish[a] += 2;
          state.fish[b] -= 2;
          await finishChallenge(interaction.client, state, `🎰 All In\n<@${a}> went all in.\n<@${b}> backed out.\n<@${a}> wins +2 🐟`);
          return;
        }

        if (cb === "yes" && ca === "no") {
          state.fish[b] += 2;
          state.fish[a] -= 2;
          await finishChallenge(interaction.client, state, `🎰 All In\n<@${b}> went all in.\n<@${a}> backed out.\n<@${b}> wins +2 🐟`);
          return;
        }

        const winner = Math.random() < 0.5 ? a : b;
        const loser = winner === a ? b : a;

        state.fish[winner] += 5;
        state.fish[loser] -= 5;

        await finishChallenge(interaction.client, state, `🎰 All In\nBoth went all in!\n<@${winner}> wins +5 🐟`);
        return;
      }

      /* ---------------- STEAL / GIFT ---------------- */

      if (id === "casino_amount_1" || id === "casino_amount_2") {
        if (state.phase !== "challenge" || !state.challenge) return;

        if (interaction.user.id !== state.challenge.actor) {
          await safeReply(interaction, { content: "Only the active player can choose the amount.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

        const amount = id === "casino_amount_1" ? 1 : 2;
        const actor = state.challenge.actor;
        const target = state.challenge.players.find(id2 => id2 !== actor);

        if (state.challenge.event === "Steal") {
          const realAmount = Math.min(amount, state.fish[target]);
          state.fish[target] -= realAmount;
          state.fish[actor] += realAmount;
          await finishChallenge(interaction.client, state, `🦹 Steal\n<@${actor}> steals ${realAmount} 🐟 from <@${target}>`);
          return;
        }

        const realAmount = Math.min(amount, state.fish[actor]);
        state.fish[actor] -= realAmount;
        state.fish[target] += realAmount;
        await finishChallenge(interaction.client, state, `🎁 Gift\n<@${actor}> gives ${realAmount} 🐟 to <@${target}>`);
        return;
      }

      /* ---------------- REACTION ---------------- */

      if (id === "casino_react_click") {
        if (state.phase !== "challenge" || !state.challenge) return;
        if (state.challenge.stage !== "armed") return;

        if (!state.challenge.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not in this challenge.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

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

      /* ---------------- QUIZ ---------------- */

      if (id.startsWith("casino_quiz_")) {
        if (state.phase !== "challenge" || !state.challenge) return;

        if (!state.challenge.players.includes(interaction.user.id)) {
          await safeReply(interaction, { content: "You are not in this challenge.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

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

      /* ---------------- BLACKJACK ---------------- */

      if (id === "casino_bj_hit" || id === "casino_bj_stand") {
        if (state.phase !== "challenge" || !state.challenge || state.challenge.event !== "Blackjack") return;

        const current = state.challenge.data.current;

        if (interaction.user.id !== current) {
          await safeReply(interaction, { content: "Not your turn in blackjack.", ephemeral: true });
          return;
        }

        await safeDefer(interaction);

        const hands = state.challenge.data.hands;
        const stood = state.challenge.data.stood;
        const players = state.challenge.players;

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
        if (msg) {
          const [a, b] = players;
          await msg.edit({
            embeds: [challengeEmbed(
              `♠️ Blackjack`,
              `<@${a}> — ${hands[a].join(" ")} (${handScore(hands[a])})\n` +
              `<@${b}> — ${hands[b].join(" ")} (${handScore(hands[b])})\n\n` +
              `Turn: <@${state.challenge.data.current}>`
            )],
            components: bjRows(state)
          }).catch(() => {});
        }
        return;
      }

    } catch (err) {
      console.error("casino interaction error:", err);

      state.phase = "spin";
      clearChallengeTimer(state);
      clearTurnTimer(state);

      await updatePanel(
        interaction.client,
        state,
        "⚠️ A casino interaction failed.\nThe game recovered and is ready again."
      ).catch(() => {});

      startTurnTimer(interaction.client, state);

      if (!interaction.deferred && !interaction.replied) {
        await safeReply(interaction, {
          content: "A temporary error happened, but the game recovered.",
          ephemeral: true
        });
      }
    }
  }
};
