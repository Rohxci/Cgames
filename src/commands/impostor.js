const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const createEmbed = require("../utils/embed");
const channelCheck = require("../utils/channelCheck");
const games = require("../systems/games");

const MAX_PLAYERS = 10;

function lobbyEmbed(state) {
const playersText = state.players.map((id, i) => `${i + 1}. <@${id}>`).join("\n") || "—";

return createEmbed(
"🎭 Impostor Lobby",
[
`**Players:** ${state.players.length}/${MAX_PLAYERS}`,
`**Host:** <@${state.hostId}>`,
"",
"**Rules**",
"• **1 Impostor** is chosen at random.",
"• Crew gets the **secret word** (via **ephemeral** when clicking **Reveal Role**).",
"• Impostor gets **only the category** (via **ephemeral**).",
"• **2 Rounds** of questions (guided turns).",
"• No direct questions like: **“What is the word?”**",
"• Then: **Vote** (one vote each).",
"• If you vote the Impostor → **Crew wins**. Otherwise → **Impostor wins**.",
"",
"**Players**",
playersText
].join("\n")
);
}

function lobbyComponents() {
return [
new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("imp_join").setLabel("Join").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("imp_leave").setLabel("Leave").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("imp_start").setLabel("Start Game").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("imp_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)
)
];
}

module.exports = {

data: new SlashCommandBuilder()
.setName("impostor")
.setDescription("Create an Impostor lobby (public game)"),

async execute(interaction) {

if (!channelCheck(interaction)) return;

/* One game per channel */
if (games.get(interaction.channelId)) {
return interaction.reply({
embeds: [createEmbed("🎮 Game Running", "A game is already running in this channel.")],
ephemeral: true
});
}

const state = {
type: "impostor",
hostId: interaction.user.id,
players: [interaction.user.id],
phase: "lobby", // lobby -> roles -> rounds -> voting -> ended
category: null,
word: null,
impostorId: null,
revealed: [],
round: 1,
turnIndex: 0,
qa: { question: null, answer: null },
votes: {}
};

games.create(interaction.channelId, state);

await interaction.reply({
embeds: [lobbyEmbed(state)],
components: lobbyComponents()
});

}

};
