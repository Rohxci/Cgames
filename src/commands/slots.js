const { SlashCommandBuilder } = require("discord.js");
const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");

const symbols = ["🍒","🍋","🍇","🍉","⭐"];

module.exports = {

data: new SlashCommandBuilder()
.setName("slots")
.setDescription("Play the slot machine"),

async execute(interaction) {

if (!channelCheck(interaction)) return;

const s1 = symbols[Math.floor(Math.random()*symbols.length)];
const s2 = symbols[Math.floor(Math.random()*symbols.length)];
const s3 = symbols[Math.floor(Math.random()*symbols.length)];

let result = "You lost.";

if (s1 === s2 && s2 === s3) {
result = "🎉 Jackpot!";
}

const embed = createEmbed(
"🎰 Slots",
`${s1} | ${s2} | ${s3}\n\n${result}`
);

await interaction.reply({ embeds: [embed] });

}

};
