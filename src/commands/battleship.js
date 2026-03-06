const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const games = require("../systems/games");

function inviteEmbed(challengerId, opponentId) {
  return {
    title: "🛳 Battleship Challenge",
    description:
`<@${challengerId}> challenged <@${opponentId}>

🎯 **Objective**
Sink all enemy ships.

🗺 **Grid**
8x8

🚢 **Ships**
Battleship (4)
Cruiser (3)
Cruiser (3)
Destroyer (2)

📡 **Radar**
Scan a 3x3 area (1 use)

⚔️ **Rules**
• Ships are placed automatically
• Fire and Radar are only usable on your turn
• Board shows your private grid
• First player to destroy all enemy ships wins.`
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("battleship")
    .setDescription("Challenge someone to Battleship")
    .addUserOption(option =>
      option
        .setName("opponent")
        .setDescription("Player to challenge")
        .setRequired(true)
    ),

  async execute(interaction) {
    const opponent = interaction.options.getUser("opponent");

    if (opponent.bot) {
      return interaction.reply({
        content: "You cannot challenge a bot.",
        ephemeral: true
      });
    }

    if (opponent.id === interaction.user.id) {
      return interaction.reply({
        content: "You cannot challenge yourself.",
        ephemeral: true
      });
    }

    if (games.get(interaction.channelId)) {
      return interaction.reply({
        content: "A game is already running in this channel.",
        ephemeral: true
      });
    }

    games.create(interaction.channelId, {
      type: "battleship",
      phase: "invite",
      hostId: interaction.user.id,
      challengerId: interaction.user.id,
      opponentId: opponent.id,
      mainChannelId: interaction.channelId,
      threadId: null,
      panelMessageId: null
    });

    await interaction.reply({
      embeds: [inviteEmbed(interaction.user.id, opponent.id)],
      components: inviteRows(interaction.user.id, opponent.id)
    });
  }
};
