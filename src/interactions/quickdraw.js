const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const createEmbed = require("../utils/embed");
const games = require("../systems/games");
const { lockChannel, unlockChannel } = require("../systems/channelLock");

function surrenderRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("qd_surrender")
      .setLabel("Surrender")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function drawRow(enabled) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("qd_draw")
      .setLabel("DRAW!")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!enabled)
  );
}

function safeClearTimer(game) {
  if (game && game.timer) {
    clearTimeout(game.timer);
    game.timer = null;
  }
}

module.exports = {

  match(interaction) {
    if (!interaction.isButton()) return false;
    const id = interaction.customId;

    return (
      id.startsWith("qd_accept_") ||
      id.startsWith("qd_decline_") ||
      id === "qd_draw" ||
      id === "qd_surrender"
    );
  },

  async run(interaction) {

    const id = interaction.customId;

    /* ACCEPT */

    if (id.startsWith("qd_accept_")) {

      const parts = id.split("_");
      const challenger = parts[2];
      const opponent = parts[3];

      if (interaction.user.id !== opponent) {
        return interaction.reply({
          content: "Only the challenged player can accept.",
          ephemeral: true
        });
      }

      const existing = games.get(interaction.channelId);
      if (existing) {
        return interaction.reply({
          content: "A game is already running in this channel.",
          ephemeral: true
        });
      }

      const game = {
        type: "quickdraw",
        player1: challenger,
        player2: opponent,
        phase: "waiting",
        messageId: interaction.message.id,
        fired: false,
        timer: null,
        drawStartedAt: null
      };

      games.create(interaction.channelId, game);

      await interaction.update({
        embeds: [
          createEmbed(
            "🔫 Quick Draw",
            `<@${challenger}> vs <@${opponent}>\n\nGet ready...`
          )
        ],
        components: [drawRow(false), surrenderRow(false)]
      });

      const currentGame = games.get(interaction.channelId);
      currentGame.originalChannelName = await lockChannel(
        interaction.channel,
        [challenger, opponent]
      );

      const delayMs = 2000 + Math.floor(Math.random() * 4000);

      game.timer = setTimeout(async () => {

        const current = games.get(interaction.channelId);
        if (!current || current.messageId !== interaction.message.id) return;
        if (current.phase !== "waiting") return;

        current.phase = "draw";
        current.drawStartedAt = Date.now();

        try {
          await interaction.message.edit({
            embeds: [
              createEmbed(
                "🔫 Quick Draw",
                `<@${current.player1}> vs <@${current.player2}>\n\n**DRAW!** Click the button!`
              )
            ],
            components: [drawRow(true), surrenderRow(false)]
          });
        } catch {
          games.delete(interaction.channelId);
        }

      }, delayMs);

      return;
    }

    /* DECLINE */

    if (id.startsWith("qd_decline_")) {

      const parts = id.split("_");
      const opponent = parts[3];

      if (interaction.user.id !== opponent) {
        return interaction.reply({
          content: "Only the challenged player can decline.",
          ephemeral: true
        });
      }

      await interaction.update({
        embeds: [
          createEmbed(
            "❌ Challenge Declined",
            "The challenge was declined."
          )
        ],
        components: []
      });

      return;
    }

    /* SURRENDER */

    if (id === "qd_surrender") {

      const game = games.get(interaction.channelId);
      if (!game) return;

      if (
        interaction.user.id !== game.player1 &&
        interaction.user.id !== game.player2
      ) {
        return interaction.reply({
          content: "Only the players can surrender.",
          ephemeral: true
        });
      }

      safeClearTimer(game);

      const winner =
        interaction.user.id === game.player1
          ? game.player2
          : game.player1;

      await unlockChannel(interaction.channel, game.originalChannelName);
      games.delete(interaction.channelId);

      await interaction.update({
        embeds: [
          createEmbed(
            "🏳️ Surrender",
            `<@${interaction.user.id}> surrendered.\n\nWinner: <@${winner}>`
          )
        ],
        components: [drawRow(false), surrenderRow(true)]
      });

      return;
    }

    /* DRAW CLICK */

    if (id === "qd_draw") {

      const game = games.get(interaction.channelId);
      if (!game) return;

      if (
        interaction.user.id !== game.player1 &&
        interaction.user.id !== game.player2
      ) {
        return interaction.reply({
          content: "Only the players can use this button.",
          ephemeral: true
        });
      }

      if (game.phase !== "draw") {
        return interaction.reply({
          content: "Too early. Wait for DRAW!",
          ephemeral: true
        });
      }

      if (game.fired) {
        return interaction.reply({
          content: "Already finished.",
          ephemeral: true
        });
      }

      game.fired = true;
      safeClearTimer(game);

      const reactionMs = game.drawStartedAt
        ? Date.now() - game.drawStartedAt
        : null;

      await unlockChannel(interaction.channel, game.originalChannelName);
      games.delete(interaction.channelId);

      const text =
        reactionMs !== null
          ? `Winner: <@${interaction.user.id}> 🎉\nReaction time: **${reactionMs}ms**`
          : `Winner: <@${interaction.user.id}> 🎉`;

      await interaction.update({
        embeds: [
          createEmbed("🏆 Quick Draw", text)
        ],
        components: [drawRow(false), surrenderRow(true)]
      });

      return;
    }
  }
};
