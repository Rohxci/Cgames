const { SlashCommandBuilder } = require("discord.js");
const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");

module.exports = {

data: new SlashCommandBuilder()
.setName("reactiontest")
.setDescription("Test your reaction speed"),

async execute(interaction) {

if (!channelCheck(interaction)) return;

const embed = createEmbed(
"⚡ Reaction Test",
"Click the button as fast as possible!"
);

await interaction.reply({ embeds: [embed] });

}

};
