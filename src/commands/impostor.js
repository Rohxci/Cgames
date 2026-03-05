const { SlashCommandBuilder } = require("discord.js");
const createEmbed = require("../utils/embed");
const channelCheck = require("../utils/channelCheck");

module.exports = {

data: new SlashCommandBuilder()
.setName("impostor")
.setDescription("Create an Impostor lobby (public game)"),

async execute(interaction){

if(!channelCheck(interaction)) return;

const embed = createEmbed(
"🎭 Impostor Lobby",
[
`**Players:** 1/10`,
`**Host:** ${interaction.user}`,
"",
"**Rules**",
"• **1 Impostor** is chosen at random.",
"• Crew gets the **secret word** (via **ephemeral** when clicking **Reveal Role**).",
"• Impostor gets **only the category** (via **ephemeral**).",
"• **2 Rounds** of questions (guided turns).",
"• No direct questions like: **“What is the word?”**",
"• Then: **Vote** (one vote each).",
"• If you vote the Impostor → **Crew wins**. Otherwise → **Impostor wins**."
].join("\n")
);

await interaction.reply({
embeds:[embed],
components:[]
});

}

};
