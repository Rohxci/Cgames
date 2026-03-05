const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");
const games = require("../systems/games");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("duel")
    .setDescription("Quick Draw duel (1v1)")
    .addUserOption(option =>
      option
        .setName("opponent")
        .setDescription("Player to challenge")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!channelCheck(interaction)) return;

    const opponent = interaction.options.getUser("opponent");

    if (opponent.bot) {
      return interaction.reply({ embeds: [createEmbed("❌ Error", "You cannot challenge a bot.")] });
    }

    if (opponent.id === interaction.user.id) {
      return interaction.reply({ embeds: [createEmbed("❌ Error", "You cannot challenge yourself.")] });
    }

    // 1 game per canale
    const existing = games.get(interaction.channelId);
    if (existing) {
      return interaction.reply({
        embeds: [createEmbed("❌ Busy", "A game is already running in this channel.")],
        ephemeral: true
      });
    }

    const embed = createEmbed(
      "🔫 Quick Draw Challenge",
      `${interaction.user} challenged ${opponent}\n\nOnly ${opponent} can accept.`
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`qd_accept_${interaction.user.id}_${opponent.id}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`qd_decline_${interaction.user.id}_${opponent.id}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
