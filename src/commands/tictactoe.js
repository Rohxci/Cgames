const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");
const games = require("../systems/games");

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
embeds:[createEmbed("❌ Error","You cannot challenge a bot.")]
});
}

if (opponent.id === interaction.user.id) {
return interaction.reply({
embeds:[createEmbed("❌ Error","You cannot challenge yourself.")]
});
}

const embed = createEmbed(
"🎮 TicTacToe Challenge",
`${interaction.user} challenged ${opponent}`
);

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("ttt_accept")
.setLabel("Accept")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("ttt_decline")
.setLabel("Decline")
.setStyle(ButtonStyle.Danger)

);

await interaction.reply({
embeds:[embed],
components:[row]
});

}

};
