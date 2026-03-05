const { SlashCommandBuilder } = require("discord.js");
const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");

const answers = [
"Yes.",
"No.",
"Maybe.",
"Definitely.",
"I don't think so.",
"Absolutely.",
"Not sure.",
"Ask again later."
];

module.exports = {

data: new SlashCommandBuilder()
.setName("8ball")
.setDescription("Ask the magic 8ball a question")
.addStringOption(option =>
option.setName("question")
.setDescription("Your question")
.setRequired(true)
),

async execute(interaction) {

if (!channelCheck(interaction)) return;

const question = interaction.options.getString("question");
const answer = answers[Math.floor(Math.random() * answers.length)];

const embed = createEmbed(
"🎱 Magic 8Ball",
`**Question:** ${question}\n\n**Answer:** ${answer}`
);

await interaction.reply({ embeds: [embed] });

}

};
