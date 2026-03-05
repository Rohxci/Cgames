const { SlashCommandBuilder } = require("discord.js");
const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");

module.exports = {

data: new SlashCommandBuilder()
.setName("coinflip")
.setDescription("Flip a coin"),

async execute(interaction) {

if (!channelCheck(interaction)) return;

const result = Math.random() < 0.5 ? "Heads" : "Tails";

const embed = createEmbed(
"🪙 Coinflip",
`Result: **${result}**`
);

await interaction.reply({ embeds: [embed] });

}

};
