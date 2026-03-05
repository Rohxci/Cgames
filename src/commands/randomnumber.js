const { SlashCommandBuilder } = require("discord.js");
const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");

module.exports = {

data: new SlashCommandBuilder()
.setName("randomnumber")
.setDescription("Generate a random number"),

async execute(interaction) {

if (!channelCheck(interaction)) return;

const number = Math.floor(Math.random() * 100) + 1;

const embed = createEmbed(
"🔢 Random Number",
`Your number is: **${number}**`
);

await interaction.reply({ embeds: [embed] });

}

};
