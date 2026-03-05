const { SlashCommandBuilder } = require("discord.js");
const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");

module.exports = {

data: new SlashCommandBuilder()
.setName("ping")
.setDescription("Check if the bot is online"),

async execute(interaction) {

if (!channelCheck(interaction)) return;

const embed = createEmbed(
"🏓 Pong!",
"Bot is online and running."
);

await interaction.reply({ embeds: [embed] });

}

};
