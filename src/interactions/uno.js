const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType
} = require("discord.js");

const games = require("../systems/games");

const COLORS = ["🔴", "🟡", "🟢", "🔵"];

/* ---------------- helpers ---------------- */

function buildDeck() {
  const deck = [];

  for (const c of COLORS) {
    for (let i = 0; i < 10; i++) {
      deck.push(`${c} ${i}`);
    }
    deck.push(`${c} Skip`);
    deck.push(`${c} +2`);
  }

  for (let i = 0; i < 4; i++) {
    deck.push("🌈 Wild");
  }

  return deck.sort(() => Math.random() - 0.5);
}

function getGame(channel) {
  let game = games.get(channel.id);
  if (game) return game;

  if (channel.isThread()) {
    return games.get(channel.id);
  }

  return null;
}

function getHand(game, userId) {
  return userId === game.player1 ? game.hand1 : game.hand2;
}

function getOpponentId(game, userId) {
  return userId === game.player1 ? game.player2 : game.player1;
}

function setNextTurn(game, currentUserId) {
  game.turn = getOpponentId(game, currentUserId);
}

function isPlayable(card, top) {
  if (card === "🌈 Wild") return true;

  const [topColor, topValue] = top.split(" ");
  const [cardColor, cardValue] = card.split(" ");

  return cardColor === topColor || cardValue === topValue;
}

function playableIndexes(hand, top) {
  const indexes = [];

  for (let i = 0; i < hand.length; i++) {
    if (isPlayable(hand[i], top)) indexes.push(i);
  }

  return indexes;
}

function tableEmbed(game) {
  return {
    title: "🃏 UNO Duel",
    description: `Top Card
${game.top}

Turn
<@${game.turn}>

Cards
<@${game.player1}>: ${game.hand1.length}
<@${game.player2}>: ${game.hand2.length}`
  };
}

function buttonsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("uno_draw")
      .setLabel("Draw Card")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("uno_surrender")
      .setLabel("Surrender")
      .setStyle(ButtonStyle.Danger)
  );
}

function cardMenuRow(hand, top) {
  const playable = playableIndexes(hand, top);
  const indexes = playable.length > 0 ? playable : hand.map((_, i) => i);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("uno_play")
      .setPlaceholder("Select card")
      .addOptions(
        indexes.slice(0, 25).map((i) => ({
          label: hand[i],
          value: String(i)
        }))
      )
  );
}

function colorMenuRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("uno_color")
      .setPlaceholder("Choose color")
      .addOptions([
        { label: "Red", value: "🔴" },
        { label: "Yellow", value: "🟡" },
        { label: "Green", value: "🟢" },
        { label: "Blue", value: "🔵" }
      ])
  );
}

async function renderTable(interaction, game) {
  const hand = getHand(game, game.turn);

  await interaction.update({
    content: null,
    embeds: [tableEmbed(game)],
    components: [
      cardMenuRow(hand, game.top),
      buttonsRow()
    ]
  });
}

async function finishGame(interaction, game, winnerId, extraText = "") {
  const mainChannel = await interaction.client.channels.fetch(game.mainChannelId).catch(() => null);

  if (mainChannel) {
    await mainChannel.send({
      embeds: [{
        title: "🃏 UNO Duel Finished",
        description: `${extraText ? `${extraText}\n\n` : ""}Winner: <@${winnerId}>`
      }]
    }).catch(() => {});
  }

  games.delete(interaction.channelId);

  await interaction.update({
    embeds: [{
      title: "🃏 UNO Duel",
      description: `${extraText ? `${extraText}\n\n` : ""}Winner: <@${winnerId}>`
    }],
    components: []
  }).catch(() => {});

  await interaction.channel.delete().catch(() => {});
}

/* ---------------- main ---------------- */

module.exports = {
  match(interaction) {
    if (interaction.isButton()) return interaction.customId.startsWith("uno_");
    if (interaction.isStringSelectMenu()) return interaction.customId.startsWith("uno_");
    return false;
  },

  async run(interaction) {
    const id = interaction.customId;

    /* ACCEPT */
    if (id.startsWith("uno_accept_")) {
      const parts = id.split("_");
      const p1 = parts[2];
      const p2 = parts[3];

      if (interaction.user.id !== p2) {
        return interaction.reply({
          content: "Only the challenged player can accept.",
          ephemeral: true
        });
      }

      const thread = await interaction.channel.threads.create({
        name: `uno-${interaction.user.username}`,
        type: ChannelType.PrivateThread,
        autoArchiveDuration: 60,
        invitable: false
      });

      await thread.members.add(p1).catch(() => {});
      await thread.members.add(p2).catch(() => {});

      const deck = buildDeck();
      const hand1 = deck.splice(0, 7);
      const hand2 = deck.splice(0, 7);
      const top = deck.shift();

      games.create(thread.id, {
        type: "uno",
        player1: p1,
        player2: p2,
        turn: p1,
        deck,
        hand1,
        hand2,
        top,
        mainChannelId: interaction.channel.id,
        pendingWildPlayer: null
      });

      await interaction.update({
        content: `🃏 UNO started in <#${thread.id}>`,
        embeds: [],
        components: []
      });

      const game = games.get(thread.id);

      await thread.send({
        embeds: [tableEmbed(game)],
        components: [
          cardMenuRow(game.hand1, game.top),
          buttonsRow()
        ]
      });

      return;
    }

    /* DECLINE */
    if (id.startsWith("uno_decline_")) {
      const p2 = id.split("_")[3];

      if (interaction.user.id !== p2) {
        return interaction.reply({
          content: "Only the challenged player can decline.",
          ephemeral: true
        });
      }

      await interaction.update({
        content: "Challenge declined.",
        embeds: [],
        components: []
      });

      return;
    }

    /* CANCEL */
    if (id.startsWith("uno_cancel_")) {
      const p1 = id.split("_")[2];

      if (interaction.user.id !== p1) {
        return interaction.reply({
          content: "Only the challenger can cancel.",
          ephemeral: true
        });
      }

      await interaction.update({
        content: "Challenge cancelled.",
        embeds: [],
        components: []
      });

      return;
    }

    /* GAME */
    const game = getGame(interaction.channel);
    if (!game || game.type !== "uno") return;

    /* DRAW */
    if (id === "uno_draw") {
      if (interaction.user.id !== game.turn) {
        return interaction.reply({
          content: "Not your turn.",
          ephemeral: true
        });
      }

      const hand = getHand(game, interaction.user.id);
      const drawn = game.deck.shift();

      if (drawn) hand.push(drawn);

      setNextTurn(game, interaction.user.id);

      return renderTable(interaction, game);
    }

    /* SURRENDER */
    if (id === "uno_surrender") {
      const winner = getOpponentId(game, interaction.user.id);
      return finishGame(interaction, game, winner, `<@${interaction.user.id}> surrendered.`);
    }

    /* PLAY CARD */
    if (id === "uno_play") {
      if (interaction.user.id !== game.turn) {
        return interaction.reply({
          content: "Not your turn.",
          ephemeral: true
        });
      }

      const hand = getHand(game, interaction.user.id);
      const selectedIndex = parseInt(interaction.values[0], 10);

      if (Number.isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= hand.length) {
        return interaction.reply({
          content: "Invalid card.",
          ephemeral: true
        });
      }

      const selectedCard = hand[selectedIndex];

      if (!isPlayable(selectedCard, game.top)) {
        return interaction.reply({
          content: "You cannot play that card.",
          ephemeral: true
        });
      }

      hand.splice(selectedIndex, 1);

      if (selectedCard === "🌈 Wild") {
        game.pendingWildPlayer = interaction.user.id;

        return interaction.update({
          content: "Choose color",
          embeds: [],
          components: [colorMenuRow()]
        });
      }

      return applyCard(interaction, game, selectedCard, interaction.user.id);
    }

    /* COLOR CHOICE */
    if (id === "uno_color") {
      if (game.pendingWildPlayer !== interaction.user.id) {
        return interaction.reply({
          content: "You cannot choose the color.",
          ephemeral: true
        });
      }

      const color = interaction.values[0];
      game.pendingWildPlayer = null;
      game.top = `${color} Wild`;

      const currentHand = getHand(game, interaction.user.id);

      if (currentHand.length === 0) {
        return finishGame(interaction, game, interaction.user.id);
      }

      setNextTurn(game, interaction.user.id);
      return renderTable(interaction, game);
    }
  }
};

async function applyCard(interaction, game, card, userId) {
  const currentHand = getHand(game, userId);

  if (card.includes("+2")) {
    const opp = getOpponentId(game, userId);
    const oppHand = getHand(game, opp);

    const c1 = game.deck.shift();
    const c2 = game.deck.shift();

    if (c1) oppHand.push(c1);
    if (c2) oppHand.push(c2);
  }

  game.top = card;

  if (currentHand.length === 0) {
    return finishGame(interaction, game, userId);
  }

  if (card.includes("Skip")) {
    game.turn = userId;
  } else {
    setNextTurn(game, userId);
  }

  return renderTable(interaction, game);
}
