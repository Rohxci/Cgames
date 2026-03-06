const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder,
ChannelType
} = require("discord.js");

const games = require("../systems/games");

const COLORS = ["🔴", "🟡", "🟢", "🔵"];

/* -------------------- DECK -------------------- */

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

/* -------------------- HELPERS -------------------- */

function getGame(channel) {
  let game = games.get(channel.id);
  if (game) return game;

  if (channel.isThread()) {
    return games.get(channel.id);
  }

  return null;
}

function isPlayable(card, top) {
  if (card === "🌈 Wild") return true;

  const [topColor, topValue] = top.split(" ");
  const [cardColor, cardValue] = card.split(" ");

  return cardColor === topColor || cardValue === topValue;
}

function getHand(game, userId) {
  return userId === game.player1 ? game.hand1 : game.hand2;
}

function setNextTurn(game, currentUserId) {
  game.turn = currentUserId === game.player1 ? game.player2 : game.player1;
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

function actionButtons() {
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

/*
  IMPORTANT:
  Select menu option values MUST be unique.
  So we use the card INDEX in the player's hand, not the card text itself.
*/
function cardMenuFromHand(hand, top) {
  const playableIndices = [];

  for (let i = 0; i < hand.length; i++) {
    if (isPlayable(hand[i], top)) {
      playableIndices.push(i);
    }
  }

  const indicesToShow = playableIndices.length > 0
    ? playableIndices
    : hand.map((_, i) => i);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("uno_play")
      .setPlaceholder("Select card")
      .addOptions(
        indicesToShow.slice(0, 25).map((index) => ({
          label: hand[index],
          value: String(index)
        }))
      )
  );
}

function colorMenu() {
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

async function updateTableMessage(message, game) {
  const currentHand = getHand(game, game.turn);

  await message.edit({
    content: null,
    embeds: [tableEmbed(game)],
    components: [
      cardMenuFromHand(currentHand, game.top),
      actionButtons()
    ]
  });
}

async function finishUnoGame(interaction, game, winnerId, reasonText = null) {
  const mainChannel = await interaction.client.channels.fetch(game.mainChannelId).catch(() => null);

  let resultText = reasonText
    ? `${reasonText}\n\nWinner: <@${winnerId}>`
    : `Winner: <@${winnerId}>`;

  if (mainChannel) {
    await mainChannel.send({
      embeds: [{
        title: "🃏 UNO Duel Finished",
        description: resultText
      }]
    }).catch(() => {});
  }

  games.delete(interaction.channelId);

  await interaction.channel.delete().catch(() => {});
}

/* -------------------- MAIN -------------------- */

module.exports = {

  match(interaction) {
    if (interaction.isButton()) {
      return interaction.customId.startsWith("uno_");
    }

    if (interaction.isStringSelectMenu()) {
      return interaction.customId.startsWith("uno_");
    }

    return false;
  },

  async run(interaction) {
    const id = interaction.customId;

    /* ---------- ACCEPT ---------- */

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
          cardMenuFromHand(game.hand1, game.top),
          actionButtons()
        ]
      });

      return;
    }

    /* ---------- DECLINE ---------- */

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

    /* ---------- CANCEL ---------- */

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

    /* ---------- GAME LOOKUP ---------- */

    const game = getGame(interaction.channel);
    if (!game || game.type !== "uno") return;

    /* ---------- DRAW ---------- */

    if (id === "uno_draw") {
      if (interaction.user.id !== game.turn) {
        return interaction.reply({
          content: "Not your turn.",
          ephemeral: true
        });
      }

      await interaction.deferUpdate();

      const drawn = game.deck.shift();
      const hand = getHand(game, interaction.user.id);
      hand.push(drawn);

      setNextTurn(game, interaction.user.id);

      await updateTableMessage(interaction.message, game);
      return;
    }

    /* ---------- SURRENDER ---------- */

    if (id === "uno_surrender") {
      const winner =
        interaction.user.id === game.player1
          ? game.player2
          : game.player1;

      await interaction.deferUpdate();
      await finishUnoGame(interaction, game, winner, `<@${interaction.user.id}> surrendered.`);
      return;
    }

    /* ---------- PLAY CARD ---------- */

    if (id === "uno_play") {
      if (interaction.user.id !== game.turn) {
        return interaction.reply({
          content: "Not your turn.",
          ephemeral: true
        });
      }

      await interaction.deferUpdate();

      const hand = getHand(game, interaction.user.id);
      const selectedIndex = parseInt(interaction.values[0], 10);

      if (Number.isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= hand.length) {
        return;
      }

      const selectedCard = hand[selectedIndex];

      if (!isPlayable(selectedCard, game.top)) {
        return interaction.followUp({
          content: "You cannot play that card.",
          ephemeral: true
        }).catch(() => {});
      }

      hand.splice(selectedIndex, 1);

      if (selectedCard === "🌈 Wild") {
        game.pendingWildPlayer = interaction.user.id;

        await interaction.message.edit({
          content: "Choose color",
          embeds: [],
          components: [colorMenu()]
        });

        return;
      }

      await applyCardEffect(interaction, game, selectedCard, interaction.user.id);
      return;
    }

    /* ---------- CHOOSE COLOR ---------- */

    if (id === "uno_color") {
      if (game.pendingWildPlayer !== interaction.user.id) {
        return interaction.reply({
          content: "You cannot choose the color.",
          ephemeral: true
        });
      }

      await interaction.deferUpdate();

      const color = interaction.values[0];
      game.top = `${color} Wild`;
      game.pendingWildPlayer = null;

      const currentHand = getHand(game, interaction.user.id);

      if (currentHand.length === 0) {
        await finishUnoGame(interaction, game, interaction.user.id);
        return;
      }

      setNextTurn(game, interaction.user.id);

      await updateTableMessage(interaction.message, game);
      return;
    }
  }
};

/* -------------------- EFFECTS -------------------- */

async function applyCardEffect(interaction, game, card, userId) {
  const currentHand = getHand(game, userId);

  if (card.includes("+2")) {
    const opponentId = userId === game.player1 ? game.player2 : game.player1;
    const opponentHand = getHand(game, opponentId);

    const draw1 = game.deck.shift();
    const draw2 = game.deck.shift();

    if (draw1) opponentHand.push(draw1);
    if (draw2) opponentHand.push(draw2);
  }

  game.top = card;

  if (currentHand.length === 0) {
    await finishUnoGame(interaction, game, userId);
    return;
  }

  if (card.includes("Skip")) {
    game.turn = userId;
  } else {
    setNextTurn(game, userId);
  }

  await updateTableMessage(interaction.message, game);
}
