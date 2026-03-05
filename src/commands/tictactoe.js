const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");

let games = {};

module.exports = {

data: new SlashCommandBuilder()
.setName("tictactoe")
.setDescription("Challenge someone to TicTacToe")
.addUserOption(option =>
option.setName("opponent")
.setDescription("Player to challenge")
.setRequired(true)
),

async execute(interaction) {

if (!channelCheck(interaction)) return;

const opponent = interaction.options.getUser("opponent");

if (opponent.bot) {

return interaction.reply({
embeds: [createEmbed("❌ Error","You cannot challenge a bot.")]
});

}

if (opponent.id === interaction.user.id) {

return interaction.reply({
embeds: [createEmbed("❌ Error","You cannot challenge yourself.")]
});

}

const board = [
["⬜","⬜","⬜"],
["⬜","⬜","⬜"],
["⬜","⬜","⬜"]
];

games[interaction.channelId] = {
player1: interaction.user.id,
player2: opponent.id,
turn: interaction.user.id,
board
};

const embed = createEmbed(
"🎮 TicTacToe",
`${interaction.user} vs ${opponent}\n\nTurn: ${interaction.user}`
);

const row1 = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("ttt_0_0").setLabel(" ").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("ttt_0_1").setLabel(" ").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("ttt_0_2").setLabel(" ").setStyle(ButtonStyle.Secondary)
);

const row2 = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("ttt_1_0").setLabel(" ").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("ttt_1_1").setLabel(" ").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("ttt_1_2").setLabel(" ").setStyle(ButtonStyle.Secondary)
);

const row3 = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("ttt_2_0").setLabel(" ").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("ttt_2_1").setLabel(" ").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("ttt_2_2").setLabel(" ").setStyle(ButtonStyle.Secondary)
);

await interaction.reply({
embeds: [embed],
components: [row1,row2,row3]
});

}

};
