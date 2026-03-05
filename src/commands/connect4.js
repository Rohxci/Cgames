const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const createEmbed = require("../utils/embed");
const channelCheck = require("../utils/channelCheck");

module.exports = {

data: new SlashCommandBuilder()
.setName("connect4")
.setDescription("Challenge someone to Connect4")
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
"🔴 Connect4 Challenge",
`${interaction.user} challenged ${opponent}`
);

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId(`c4_accept_${interaction.user.id}_${opponent.id}`)
.setLabel("Accept")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId(`c4_decline_${interaction.user.id}_${opponent.id}`)
.setLabel("Decline")
.setStyle(ButtonStyle.Danger)

);

await interaction.reply({
embeds:[embed],
components:[row]
});

}

};
