const { SlashCommandBuilder } = require("discord.js");
const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");

module.exports = {

data: new SlashCommandBuilder()
.setName("dice")
.setDescription("Roll a dice"),

async execute(interaction) {

if (!channelCheck(interaction)) return;

const roll = Math.floor(Math.random() * 6) + 1;

const embed = createEmbed(
"🎲 Dice Roll",
`You rolled: **${roll}**`
);

await interaction.reply({ embeds: [embed] });

}

};
