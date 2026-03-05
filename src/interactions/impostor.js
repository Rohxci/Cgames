const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 3;

function pickRandom(arr) {
return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {

match(interaction) {

const id = interaction.customId;

return typeof id === "string" && id.startsWith("imp_");

},

async run(interaction) {

const state = games.get(interaction.channelId);
if (!state) return;

const id = interaction.customId;

/* JOIN */

if (id === "imp_join") {

if (!state.players.includes(interaction.user.id)) {
state.players.push(interaction.user.id);
}

await interaction.update({
embeds: [
createEmbed(
"🎭 Impostor Lobby",
state.players.map(p => `<@${p}>`).join("\n")
)
],
components: interaction.message.components
});

return;

}

/* LEAVE */

if (id === "imp_leave") {

state.players = state.players.filter(p => p !== interaction.user.id);

await interaction.update({
embeds: [
createEmbed(
"🎭 Impostor Lobby",
state.players.map(p => `<@${p}>`).join("\n")
)
],
components: interaction.message.components
});

return;

}

/* START */

if (id === "imp_start") {

if (state.players.length < MIN_PLAYERS) {

return interaction.reply({
content: "Need at least 3 players.",
ephemeral: true
});

}

state.impostor = pickRandom(state.players);

await interaction.update({

embeds: [
createEmbed(
"🎭 Roles",
"Click **Reveal Role** to see your role."
)
],

components: [
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("imp_reveal")
.setLabel("Reveal Role")
.setStyle(ButtonStyle.Success)
)
]

});

return;

}

/* REVEAL */

if (id === "imp_reveal") {

if (interaction.user.id === state.impostor) {

await interaction.reply({
embeds: [
createEmbed(
"🎭 Your Role",
"You are the **IMPOSTOR**"
)
],
ephemeral: true
});

} else {

await interaction.reply({
embeds: [
createEmbed(
"🎭 Your Role",
"You are **CREW**"
)
],
ephemeral: true
});

}

return;

}

/* END DISCUSSION */

if (id === "imp_end") {

await interaction.channel.send({
embeds: [createEmbed("🗳 Voting started", "Vote the impostor.")]
});

return interaction.deferUpdate();

}

/* VOTE */

if (interaction.isStringSelectMenu() && id === "imp_vote") {

state.votes = state.votes || {};
state.votes[interaction.user.id] = interaction.values[0];

await interaction.reply({
content: "Vote registered.",
ephemeral: true
});

return;

}

}

};
