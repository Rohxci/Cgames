const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType
} = require("discord.js");

const games = require("../systems/games");

const GRID_SIZE = 8;
const SHIP_SIZES = [4, 3, 3, 2];

/* ---------------- BASIC HELPERS ---------------- */

function safeReply(interaction, payload) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ ...payload, ephemeral: payload.ephemeral ?? true }).catch(() => null);
  }
  return interaction.reply(payload).catch(() => null);
}

async function safeDefer(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate().catch(() => {});
  }
}

function findGame(channel) {
  let game = games.get(channel.id);
  if (game) return game;

  if (channel.isThread()) {
    game = games.get(channel.parentId);
    if (game) return game;
  }

  return null;
}

function otherPlayer(game, playerId) {
  return game.player1 === playerId ? game.player2 : game.player1;
}

function inGame(game, userId) {
  return userId === game.player1 || userId === game.player2;
}

function coordToIndex(coord) {
  const col = coord.charCodeAt(0) - 65;
  const row = parseInt(coord.slice(1), 10) - 1;
  return { row, col };
}

function indexToCoord(row, col) {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ".")
  );
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

/* ---------------- SHIP PLACEMENT ---------------- */

function canPlaceShip(board, row, col, size, horizontal) {
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;

    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (board[r][c] !== ".") return false;
  }
  return true;
}

function placeShip(board, row, col, size, horizontal) {
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    board[r][c] = "S";
  }
}

function generateRandomBoard() {
  const board = createEmptyBoard();

  for (const size of SHIP_SIZES) {
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 500) {
      attempts++;
      const horizontal = Math.random() < 0.5;
      const row = randomInt(GRID_SIZE);
      const col = randomInt(GRID_SIZE);

      if (canPlaceShip(board, row, col, size, horizontal)) {
        placeShip(board, row, col, size, horizontal);
        placed = true;
      }
    }
  }

  return board;
}

/* ---------------- BOARD RENDER ---------------- */

function renderEnemyBoard(board) {
  const header = "⬛ 🇦 🇧 🇨 🇩 🇪 🇫 🇬 🇭";
  const lines = [header];

  for (let r = 0; r < GRID_SIZE; r++) {
    let line = `${r + 1}️⃣`;
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = board[r][c];

      if (cell === "H") line += " 💥";
      else if (cell === "M") line += " ❌";
      else line += " 🌊";
    }
    lines.push(line);
  }

  return lines.join("\n");
}

function renderOwnBoard(board) {
  const header = "⬛ 🇦 🇧 🇨 🇩 🇪 🇫 🇬 🇭";
  const lines = [header];

  for (let r = 0; r < GRID_SIZE; r++) {
    let line = `${r + 1}️⃣`;
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = board[r][c];

      if (cell === "S") line += " 🚢";
      else if (cell === "H") line += " 💥";
      else if (cell === "M") line += " ❌";
      else line += " 🌊";
    }
    lines.push(line);
  }

  return lines.join("\n");
}

function remainingShipCells(board) {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === "S") count++;
    }
  }
  return count;
}

/* ---------------- EMBEDS ---------------- */

function gameEmbed(game) {
  const enemyId = otherPlayer(game, game.turn);
  const enemyBoard = game.boards[enemyId];

  return {
    title: "🛳 Battleship",
    description:
`<@${game.player1}> vs <@${game.player2}>

🎯 **Turn**
<@${game.turn}>

🚢 **Enemy Ship Cells Remaining**
${remainingShipCells(enemyBoard)}

📡 **Radar**
<@${game.player1}>: ${game.radarUsed[game.player1] ? "Used" : "Ready"}
<@${game.player2}>: ${game.radarUsed[game.player2] ? "Used" : "Ready"}

📝 **Last Action**
${game.lastAction || "No actions yet."}

🌊 **Enemy Board**
${renderEnemyBoard(enemyBoard)}`
  };
}

function inviteRows(challengerId, opponentId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`battleship_accept_${challengerId}_${opponentId}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`battleship_decline_${challengerId}_${opponentId}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`battleship_cancel_${challengerId}_${opponentId}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function gameRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("battleship_fire")
        .setLabel("Fire")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("battleship_radar")
        .setLabel("Radar")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("battleship_board")
        .setLabel("Board")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("battleship_surrender")
        .setLabel("Surrender")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

/* ---------------- FIRE / RADAR PICKERS ---------------- */

function letterOptions(start = 0, end = 7) {
  const arr = [];
  for (let c = start; c <= end; c++) {
    arr.push({
      label: String.fromCharCode(65 + c),
      value: String.fromCharCode(65 + c)
    });
  }
  return arr;
}

function numberOptions(start = 1, end = 8) {
  const arr = [];
  for (let r = start; r <= end; r++) {
    arr.push({
      label: String(r),
      value: String(r)
    });
  }
  return arr;
}

function firePickerRows() {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("battleship_fire_letter")
        .setPlaceholder("Choose column")
        .addOptions(letterOptions(0, 7))
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("battleship_fire_number")
        .setPlaceholder("Choose row")
        .addOptions(numberOptions(1, 8))
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("battleship_fire_confirm")
        .setLabel("Confirm Fire")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function radarPickerRows() {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("battleship_radar_letter")
        .setPlaceholder("Choose radar column")
        .addOptions(letterOptions(1, 6))
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("battleship_radar_number")
        .setPlaceholder("Choose radar row")
        .addOptions(numberOptions(2, 7))
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("battleship_radar_confirm")
        .setLabel("Confirm Radar")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

/* ---------------- PANEL FETCH / UPDATE ---------------- */

async function getThread(client, game) {
  return (
    client.channels.cache.get(game.threadId) ||
    await client.channels.fetch(game.threadId).catch(() => null)
  );
}

async function getPanel(client, game) {
  const thread = await getThread(client, game);
  if (!thread) return null;
  return await thread.messages.fetch(game.panelMessageId).catch(() => null);
}

async function updatePanel(client, game) {
  const panel = await getPanel(client, game);
  if (!panel) return false;

  await panel.edit({
    embeds: [gameEmbed(game)],
    components: gameRows()
  }).catch(() => {});

  return true;
}

async function finishGame(client, game, winnerId, reasonText) {
  const panel = await getPanel(client, game);

  if (panel) {
    await panel.edit({
      embeds: [{
        title: "🏆 Battleship Winner",
        description:
`${reasonText}

Winner: <@${winnerId}>`
      }],
      components: []
    }).catch(() => {});
  }

  const main =
    client.channels.cache.get(game.mainChannelId) ||
    await client.channels.fetch(game.mainChannelId).catch(() => null);

  if (main) {
    await main.send(
      `🛳 Battleship finished\nWinner: <@${winnerId}>`
    ).catch(() => {});
  }

  const thread = await getThread(client, game);

  games.delete(game.mainChannelId);

  if (thread) {
    await thread.delete().catch(() => {});
  }
}

/* ---------------- CORE ACTIONS ---------------- */

function sinkCheck(board, row, col) {
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ];

  const visited = new Set();
  const stack = [[row, col]];
  let hasRemainingShip = false;
  let size = 0;

  while (stack.length) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = board[r]?.[c];
    if (cell !== "H" && cell !== "S") continue;

    size++;

    if (cell === "S") {
      hasRemainingShip = true;
    }

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        const next = board[nr][nc];
        if (next === "H" || next === "S") {
          stack.push([nr, nc]);
        }
      }
    }
  }

  return {
    sunk: !hasRemainingShip,
    size
  };
}

function fireAt(game, shooterId, coord) {
  const defenderId = otherPlayer(game, shooterId);
  const board = game.boards[defenderId];
  const { row, col } = coordToIndex(coord);

  const cell = board[row][col];

  if (cell === "H" || cell === "M") {
    return {
      valid: false,
      message: "You already fired there."
    };
  }

  if (cell === "S") {
    board[row][col] = "H";

    const sink = sinkCheck(board, row, col);
    if (sink.sunk) {
      return {
        valid: true,
        hit: true,
        sunk: true,
        sunkSize: sink.size
      };
    }

    return {
      valid: true,
      hit: true,
      sunk: false
    };
  }

  board[row][col] = "M";
  return {
    valid: true,
    hit: false
  };
}

function radarScan(game, userId, centerCoord) {
  const enemyId = otherPlayer(game, userId);
  const board = game.boards[enemyId];
  const { row, col } = coordToIndex(centerCoord);

  let ships = 0;

  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        if (board[r][c] === "S") ships++;
      }
    }
  }

  const startCoord = indexToCoord(row - 1, col - 1);
  const endCoord = indexToCoord(row + 1, col + 1);

  return {
    ships,
    text: `📡 Radar scan on ${startCoord}-${endCoord}\nShips detected: ${ships}`
  };
}

function isWinner(game, playerId) {
  const enemyId = otherPlayer(game, playerId);
  return remainingShipCells(game.boards[enemyId]) === 0;
}

function nextTurn(game) {
  game.turn = otherPlayer(game, game.turn);
}

/* ---------------- MODULE ---------------- */

module.exports = {
  match(interaction) {
    return (
      (interaction.isButton() || interaction.isStringSelectMenu()) &&
      interaction.customId.startsWith("battleship_")
    );
  },

  async run(interaction) {
    const game = findGame(interaction.channel);
    if (!game) return;

    try {
      const id = interaction.customId;

      /* ---------------- INVITE ACTIONS ---------------- */

      if (id.startsWith("battleship_accept_")) {
        if (game.phase !== "invite") return;

        const parts = id.split("_");
        const challengerId = parts[2];
        const opponentId = parts[3];

        if (interaction.user.id !== opponentId) {
          await safeReply(interaction, {
            content: "Only the challenged player can accept.",
            ephemeral: true
          });
          return;
        }

        game.phase = "playing";
        game.player1 = challengerId;
        game.player2 = opponentId;
        game.turn = challengerId;
        game.radarUsed = {
          [challengerId]: false,
          [opponentId]: false
        };
        game.pendingFire = {
          [challengerId]: { letter: null, number: null },
          [opponentId]: { letter: null, number: null }
        };
        game.pendingRadar = {
          [challengerId]: { letter: null, number: null },
          [opponentId]: { letter: null, number: null }
        };
        game.boards = {
          [challengerId]: generateRandomBoard(),
          [opponentId]: generateRandomBoard()
        };
        game.lastAction = "Battle started.";

        const thread = await interaction.channel.threads.create({
          name: `battleship-${interaction.user.username}`,
          type: ChannelType.PrivateThread,
          invitable: false,
          autoArchiveDuration: 60
        });

        game.threadId = thread.id;

        try { await thread.members.add(challengerId); } catch {}
        try { await thread.members.add(opponentId); } catch {}

        const panel = await thread.send({
          embeds: [gameEmbed(game)],
          components: gameRows()
        });

        game.panelMessageId = panel.id;

        await interaction.update({
          content: `🛳 Battleship match started in <#${thread.id}>`,
          embeds: [],
          components: []
        }).catch(() => {});

        return;
      }

      if (id.startsWith("battleship_decline_")) {
        if (game.phase !== "invite") return;

        const parts = id.split("_");
        const opponentId = parts[3];

        if (interaction.user.id !== opponentId) {
          await safeReply(interaction, {
            content: "Only the challenged player can decline.",
            ephemeral: true
          });
          return;
        }

        games.delete(game.mainChannelId);

        await interaction.update({
          content: "Challenge declined.",
          embeds: [],
          components: []
        }).catch(() => {});

        return;
      }

      if (id.startsWith("battleship_cancel_")) {
        if (game.phase !== "invite") return;

        const parts = id.split("_");
        const challengerId = parts[2];

        if (interaction.user.id !== challengerId) {
          await safeReply(interaction, {
            content: "Only the challenger can cancel.",
            ephemeral: true
          });
          return;
        }

        games.delete(game.mainChannelId);

        await interaction.update({
          content: "Challenge cancelled.",
          embeds: [],
          components: []
        }).catch(() => {});

        return;
      }

      /* ---------------- PLAYER CHECK ---------------- */

      if (game.phase !== "playing") return;

      if (!inGame(game, interaction.user.id)) {
        await safeReply(interaction, {
          content: "You are not in this game.",
          ephemeral: true
        });
        return;
      }

      /* ---------------- BOARD ---------------- */

      if (id === "battleship_board") {
        await safeReply(interaction, {
          content:
`🛳 Your Board

🚢 = ship
💥 = hit
❌ = miss
🌊 = water

${renderOwnBoard(game.boards[interaction.user.id])}`,
          ephemeral: true
        });
        return;
      }

      /* ---------------- SURRENDER ---------------- */

      if (id === "battleship_surrender") {
        await safeDefer(interaction);

        const winner = otherPlayer(game, interaction.user.id);

        await finishGame(
          interaction.client,
          game,
          winner,
          `<@${interaction.user.id}> surrendered.`
        );

        return;
      }

      /* ---------------- TURN CHECK ---------------- */

      const turnOnly =
        id === "battleship_fire" ||
        id === "battleship_radar" ||
        id === "battleship_fire_confirm" ||
        id === "battleship_radar_confirm" ||
        id === "battleship_fire_letter" ||
        id === "battleship_fire_number" ||
        id === "battleship_radar_letter" ||
        id === "battleship_radar_number";

      if (turnOnly && interaction.user.id !== game.turn) {
        await safeReply(interaction, {
          content: "Not your turn.",
          ephemeral: true
        });
        return;
      }

      /* ---------------- FIRE BUTTON ---------------- */

      if (id === "battleship_fire") {
        game.pendingFire[interaction.user.id] = { letter: null, number: null };

        await safeReply(interaction, {
          content: "Choose column, row, then confirm your shot.",
          components: firePickerRows(),
          ephemeral: true
        });
        return;
      }

      /* ---------------- FIRE PICKERS ---------------- */

      if (id === "battleship_fire_letter" && interaction.isStringSelectMenu()) {
        game.pendingFire[interaction.user.id].letter = interaction.values[0];

        await safeReply(interaction, {
          content: `Column selected: ${interaction.values[0]}`,
          ephemeral: true
        });
        return;
      }

      if (id === "battleship_fire_number" && interaction.isStringSelectMenu()) {
        game.pendingFire[interaction.user.id].number = interaction.values[0];

        await safeReply(interaction, {
          content: `Row selected: ${interaction.values[0]}`,
          ephemeral: true
        });
        return;
      }

      if (id === "battleship_fire_confirm") {
        const pick = game.pendingFire[interaction.user.id];

        if (!pick.letter || !pick.number) {
          await safeReply(interaction, {
            content: "Choose both a column and a row first.",
            ephemeral: true
          });
          return;
        }

        const coord = `${pick.letter}${pick.number}`;
        const result = fireAt(game, interaction.user.id, coord);

        if (!result.valid) {
          await safeReply(interaction, {
            content: result.message,
            ephemeral: true
          });
          return;
        }

        if (result.hit && result.sunk) {
          game.lastAction = `💥 <@${interaction.user.id}> fired at ${coord} — SHIP DESTROYED (${result.sunkSize})`;
        } else if (result.hit) {
          game.lastAction = `💥 <@${interaction.user.id}> fired at ${coord} — HIT`;
        } else {
          game.lastAction = `💦 <@${interaction.user.id}> fired at ${coord} — MISS`;
        }

        game.pendingFire[interaction.user.id] = { letter: null, number: null };

        await safeReply(interaction, {
          content: game.lastAction,
          ephemeral: true
        });

        if (isWinner(game, interaction.user.id)) {
          await finishGame(
            interaction.client,
            game,
            interaction.user.id,
            `🏆 <@${interaction.user.id}> destroyed all enemy ships!`
          );
          return;
        }

        nextTurn(game);
        await updatePanel(interaction.client, game);
        return;
      }

      /* ---------------- RADAR BUTTON ---------------- */

      if (id === "battleship_radar") {
        if (game.radarUsed[interaction.user.id]) {
          await safeReply(interaction, {
            content: "You already used your radar.",
            ephemeral: true
          });
          return;
        }

        game.pendingRadar[interaction.user.id] = { letter: null, number: null };

        await safeReply(interaction, {
          content: "Choose the center of your 3x3 radar scan, then confirm.",
          components: radarPickerRows(),
          ephemeral: true
        });
        return;
      }

      /* ---------------- RADAR PICKERS ---------------- */

      if (id === "battleship_radar_letter" && interaction.isStringSelectMenu()) {
        game.pendingRadar[interaction.user.id].letter = interaction.values[0];

        await safeReply(interaction, {
          content: `Radar column selected: ${interaction.values[0]}`,
          ephemeral: true
        });
        return;
      }

      if (id === "battleship_radar_number" && interaction.isStringSelectMenu()) {
        game.pendingRadar[interaction.user.id].number = interaction.values[0];

        await safeReply(interaction, {
          content: `Radar row selected: ${interaction.values[0]}`,
          ephemeral: true
        });
        return;
      }

      if (id === "battleship_radar_confirm") {
        if (game.radarUsed[interaction.user.id]) {
          await safeReply(interaction, {
            content: "You already used your radar.",
            ephemeral: true
          });
          return;
        }

        const pick = game.pendingRadar[interaction.user.id];

        if (!pick.letter || !pick.number) {
          await safeReply(interaction, {
            content: "Choose both a column and a row first.",
            ephemeral: true
          });
          return;
        }

        const center = `${pick.letter}${pick.number}`;
        const scan = radarScan(game, interaction.user.id, center);

        game.radarUsed[interaction.user.id] = true;
        game.pendingRadar[interaction.user.id] = { letter: null, number: null };
        game.lastAction = `📡 <@${interaction.user.id}> used Radar on ${center}`;

        await safeReply(interaction, {
          content: scan.text,
          ephemeral: true
        });

        nextTurn(game);
        await updatePanel(interaction.client, game);
        return;
      }

    } catch (err) {
      console.error("battleship interaction error:", err);

      if (!interaction.deferred && !interaction.replied) {
        await safeReply(interaction, {
          content: "A temporary error happened, but the game is still there.",
          ephemeral: true
        });
      }
    }
  }
};
