const { SlashCommandBuilder } = require("discord.js");
const channelCheck = require("../utils/channelCheck");

module.exports = {

data: new SlashCommandBuilder()
.setName("ping")
.setDescription("Check if the bot is online"),

async execute(interaction) {

if (!channelCheck(interaction)) return;

await interaction.reply("🏓 Pong!");

}

};
