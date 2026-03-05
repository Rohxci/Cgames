const fs = require("fs");
const path = require("path");

const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder,
ModalBuilder,
TextInputBuilder,
TextInputStyle
} = require("discord.js");

const createEmbed = require("../utils/embed");
const games = require("../systems/games");

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 4;
const ROUNDS = 2;

const WORDS_PATH = path.join(__dirname, "..", "data", "impostor_words.json");

function pickRandom(arr) {
return arr[Math.floor(Math.random() * arr.length)];
}

function loadWords() {
const raw = fs.readFileSync(WORDS_PATH, "utf8");
return JSON.parse(raw);
}

function pickWord() {
const words = loadWords();
const categories = Object.keys(words);
const category = pickRandom(categories);
const word = pickRandom(words[category]);
return { category, word };
}

function uniq(arr) {
return Array.from(new Set(arr));
}

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

function rolesEmbed(state) {
return createEmbed(
"🎭 Impostor — Roles",
[
`**Category:** ${state.category}`,
"",
"Everyone must click **Reveal Role** to receive their role as an **ephemeral** message.",
`Revealed: **${state.revealed.length}/${state.players.length}**`,
"",
"Host can start rounds when everyone revealed."
].join("\n")
);
}

function rolesComponents(state) {
const allRevealed = state.revealed.length === state.players.length;

return [
new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("imp_reveal").setLabel("Reveal Role").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("imp_begin_rounds").setLabel("Start Rounds").setStyle(ButtonStyle.Primary).setDisabled(!allRevealed),
new ButtonBuilder().setCustomId("imp_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)
)
];
}

function discussionEmbed(state) {
const asker = state.players[state.turnIndex];
const target = state.players[(state.turnIndex + 1) % state.players.length];

return createEmbed(
"🎭 Impostor — Discussion",
[
`**Round:** ${state.round}/${ROUNDS}`,
`**Category:** ${state.category}`,
"",
`**Asker:** <@${asker}>`,
`**Target:** <@${target}>`,
"",
`**Question:** ${state.qa.question || "—"}`,
`**Answer:** ${state.qa.answer || "—"}`,
"",
"Buttons:",
"• Asker clicks **Ask** (modal)",
"• Target clicks **Answer** (modal)",
"• Host can **Skip Turn**",
"• Or go to **Vote**"
].join("\n")
);
}

function discussionComponents() {
return [
new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("imp_ask").setLabel("Ask").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("imp_answer").setLabel("Answer").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("imp_skip_turn").setLabel("Skip Turn").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("imp_force_vote").setLabel("Go to Vote").setStyle(ButtonStyle.Danger)
)
];
}

function voteEmbed(state) {
return createEmbed(
"🗳 Impostor — Voting",
[
`**Category:** ${state.category}`,
"",
"Select who you think is the **Impostor**.",
"One vote each.",
"",
`Votes submitted: **${Object.keys(state.votes).length}/${state.players.length}**`
].join("\n")
);
}

function voteComponents(state, disabled=false) {

const options = state.players.map(id => ({
label: `Player`,
description: `Vote <@${id}>`,
value: id
}));

const menu = new StringSelectMenuBuilder()
.setCustomId("imp_vote_select")
.setPlaceholder("Select the impostor...")
.addOptions(options.slice(0, 25))
.setDisabled(disabled);

return [
new ActionRowBuilder().addComponents(menu),
new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("imp_finish_vote").setLabel("Finish Vote (Host)").setStyle(ButtonStyle.Primary).setDisabled(disabled),
new ButtonBuilder().setCustomId("imp_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger).setDisabled(disabled)
)
];
}

function resultsEmbed(state, votedOutId, crewWin) {
return createEmbed(
"🎭 Impostor — Results",
[
`**Category:** ${state.category}`,
`**Secret word:** ${state.word}`,
"",
`**Impostor:** <@${state.impostorId}>`,
`**Most voted:** <@${votedOutId}>`,
"",
crewWin ? "✅ **Crew wins!**" : "😈 **Impostor wins!**"
].join("\n")
);
}

function onlyHost(interaction, state) {
if (interaction.user.id !== state.hostId) {
interaction.reply({ content: "Only the host can do this.", ephemeral: true });
return false;
}
return true;
}

function onlyPlayer(interaction, state) {
if (!state.players.includes(interaction.user.id)) {
interaction.reply({ content: "You are not in this game.", ephemeral: true });
return false;
}
return true;
}

function countVotes(votes) {
const counts = {};
for (const voterId of Object.keys(votes)) {
const votedId = votes[voterId];
counts[votedId] = (counts[votedId] || 0) + 1;
}

let max = -1;
let top = [];
for (const id of Object.keys(counts)) {
if (counts[id] > max) {
max = counts[id];
top = [id];
} else if (counts[id] === max) {
top.push(id);
}
}

return top.length ? pickRandom(top) : null;
}

function advanceTurn(state) {
state.qa = { question: null, answer: null };

state.turnIndex++;
if (state.turnIndex >= state.players.length) {
state.turnIndex = 0;
state.round++;
}
}

module.exports = {

match(interaction) {
const id = interaction.customId;
return typeof id === "string" && (id.startsWith("imp_") || id === "imp_vote_select" || id.startsWith("imp_modal_"));
},

async run(interaction) {

const state = games.get(interaction.channelId);
if (!state || state.type !== "impostor") {
return interaction.reply({ content: "No Impostor game found in this channel.", ephemeral: true });
}

const id = interaction.customId;

/* LOBBY: JOIN */
if (id === "imp_join") {

if (state.phase !== "lobby") {
return interaction.reply({ content: "Game already started.", ephemeral: true });
}

if (state.players.length >= MAX_PLAYERS) {
return interaction.reply({ content: "Lobby is full.", ephemeral: true });
}

state.players = uniq([...state.players, interaction.user.id]);

await interaction.update({
embeds: [lobbyEmbed(state)],
components: lobbyComponents()
});

return;
}

/* LOBBY: LEAVE */
if (id === "imp_leave") {

if (state.phase !== "lobby") {
return interaction.reply({ content: "You cannot leave after the game started.", ephemeral: true });
}

if (!state.players.includes(interaction.user.id)) {
return interaction.reply({ content: "You are not in the lobby.", ephemeral: true });
}

state.players = state.players.filter(x => x !== interaction.user.id);

if (state.players.length === 0) {
games.delete(interaction.channelId);
return interaction.update({
embeds:[createEmbed("🎭 Impostor","Lobby closed (no players left).")],
components:[]
});
}

/* If host leaves, transfer host */
if (interaction.user.id === state.hostId) {
state.hostId = state.players[0];
}

await interaction.update({
embeds: [lobbyEmbed(state)],
components: lobbyComponents()
});

return;
}

/* CANCEL */
if (id === "imp_cancel") {

if (!onlyHost(interaction, state)) return;

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("🎭 Impostor","Game cancelled by host.")],
components:[]
});

return;
}

/* START GAME */
if (id === "imp_start") {

if (!onlyHost(interaction, state)) return;

if (state.phase !== "lobby") {
return interaction.reply({ content: "Game already started.", ephemeral: true });
}

if (state.players.length < MIN_PLAYERS) {
return interaction.reply({ content: `Need at least ${MIN_PLAYERS} players to start.`, ephemeral: true });
}

const picked = pickWord();
state.category = picked.category;
state.word = picked.word;

state.impostorId = pickRandom(state.players);

state.revealed = [];
state.phase = "roles";
state.round = 1;
state.turnIndex = 0;
state.qa = { question: null, answer: null };
state.votes = {};

await interaction.update({
embeds: [rolesEmbed(state)],
components: rolesComponents(state)
});

return;
}

/* REVEAL ROLE (ephemeral reply) */
if (id === "imp_reveal") {

if (state.phase !== "roles") {
return interaction.reply({ content: "Roles are not available right now.", ephemeral: true });
}

if (!onlyPlayer(interaction, state)) return;

if (!state.revealed.includes(interaction.user.id)) {
state.revealed.push(interaction.user.id);
}

/* send ephemeral role message */
if (interaction.user.id === state.impostorId) {

await interaction.reply({
embeds: [createEmbed("🎭 Your Role", `You are the **IMPOSTOR**.\n\n**Category:** ${state.category}\n\nBlend in and avoid suspicion.`)],
ephemeral: true
});

} else {

await interaction.reply({
embeds: [createEmbed("🎭 Your Role", `You are **CREW**.\n\n**Category:** ${state.category}\n**Secret word:** **${state.word}**\n\nDo not say the word directly.`)],
ephemeral: true
});

}

/* update the main message */
await interaction.message.edit({
embeds: [rolesEmbed(state)],
components: rolesComponents(state)
});

return;
}

/* BEGIN ROUNDS */
if (id === "imp_begin_rounds") {

if (!onlyHost(interaction, state)) return;

if (state.phase !== "roles") {
return interaction.reply({ content: "Not in role phase.", ephemeral: true });
}

if (state.revealed.length !== state.players.length) {
return interaction.reply({ content: "Wait until everyone clicked **Reveal Role**.", ephemeral: true });
}

state.phase = "rounds";
state.round = 1;
state.turnIndex = 0;
state.qa = { question: null, answer: null };

await interaction.update({
embeds: [discussionEmbed(state)],
components: discussionComponents()
});

return;
}

/* ASK -> Modal */
if (id === "imp_ask") {

if (state.phase !== "rounds") {
return interaction.reply({ content: "Not in discussion phase.", ephemeral: true });
}

if (!onlyPlayer(interaction, state)) return;

const asker = state.players[state.turnIndex];
if (interaction.user.id !== asker) {
return interaction.reply({ content: "Only the current **Asker** can submit the question.", ephemeral: true });
}

const modal = new ModalBuilder()
.setCustomId("imp_modal_ask")
.setTitle("Impostor — Ask");

const input = new TextInputBuilder()
.setCustomId("imp_q")
.setLabel("Your question")
.setStyle(TextInputStyle.Paragraph)
.setRequired(true)
.setMaxLength(150);

modal.addComponents(new ActionRowBuilder().addComponents(input));

return interaction.showModal(modal);
}

/* ANSWER -> Modal */
if (id === "imp_answer") {

if (state.phase !== "rounds") {
return interaction.reply({ content: "Not in discussion phase.", ephemeral: true });
}

if (!onlyPlayer(interaction, state)) return;

const target = state.players[(state.turnIndex + 1) % state.players.length];
if (interaction.user.id !== target) {
return interaction.reply({ content: "Only the current **Target** can submit the answer.", ephemeral: true });
}

const modal = new ModalBuilder()
.setCustomId("imp_modal_answer")
.setTitle("Impostor — Answer");

const input = new TextInputBuilder()
.setCustomId("imp_a")
.setLabel("Your answer")
.setStyle(TextInputStyle.Paragraph)
.setRequired(true)
.setMaxLength(150);

modal.addComponents(new ActionRowBuilder().addComponents(input));

return interaction.showModal(modal);
}

/* MODAL SUBMIT: ASK */
if (interaction.isModalSubmit() && id === "imp_modal_ask") {

if (!onlyPlayer(interaction, state)) return;

const asker = state.players[state.turnIndex];
if (interaction.user.id !== asker) {
return interaction.reply({ content: "You are not the current Asker.", ephemeral: true });
}

const q = interaction.fields.getTextInputValue("imp_q");
state.qa.question = q;

await interaction.reply({ embeds:[createEmbed("✅ Question submitted", q)], ephemeral:true });

await interaction.message.edit({
embeds: [discussionEmbed(state)],
components: discussionComponents()
});

return;
}

/* MODAL SUBMIT: ANSWER */
if (interaction.isModalSubmit() && id === "imp_modal_answer") {

if (!onlyPlayer(interaction, state)) return;

const target = state.players[(state.turnIndex + 1) % state.players.length];
if (interaction.user.id !== target) {
return interaction.reply({ content: "You are not the current Target.", ephemeral: true });
}

const a = interaction.fields.getTextInputValue("imp_a");
state.qa.answer = a;

await interaction.reply({ embeds:[createEmbed("✅ Answer submitted", a)], ephemeral:true });

/* After answer -> next turn */
advanceTurn(state);

if (state.round > ROUNDS) {
state.phase = "voting";
state.votes = {};
await interaction.message.edit({
embeds: [voteEmbed(state)],
components: voteComponents(state, false)
});
return;
}

await interaction.message.edit({
embeds: [discussionEmbed(state)],
components: discussionComponents()
});

return;
}

/* SKIP TURN (host) */
if (id === "imp_skip_turn") {

if (!onlyHost(interaction, state)) return;

if (state.phase !== "rounds") {
return interaction.reply({ content: "Not in discussion phase.", ephemeral: true });
}

advanceTurn(state);

if (state.round > ROUNDS) {
state.phase = "voting";
state.votes = {};
await interaction.update({
embeds: [voteEmbed(state)],
components: voteComponents(state, false)
});
return;
}

await interaction.update({
embeds: [discussionEmbed(state)],
components: discussionComponents()
});

return;
}

/* FORCE VOTE (host) */
if (id === "imp_force_vote") {

if (!onlyHost(interaction, state)) return;

state.phase = "voting";
state.votes = {};

await interaction.update({
embeds: [voteEmbed(state)],
components: voteComponents(state, false)
});

return;
}

/* VOTE SELECT */
if (interaction.isStringSelectMenu() && id === "imp_vote_select") {

if (state.phase !== "voting") {
return interaction.reply({ content: "Voting is not active.", ephemeral: true });
}

if (!onlyPlayer(interaction, state)) return;

if (state.votes[interaction.user.id]) {
return interaction.reply({ content: "You already voted.", ephemeral: true });
}

const votedId = interaction.values[0];
state.votes[interaction.user.id] = votedId;

await interaction.reply({
embeds: [createEmbed("🗳 Vote submitted", `You voted: <@${votedId}>`)],
ephemeral: true
});

await interaction.message.edit({
embeds: [voteEmbed(state)],
components: voteComponents(state, false)
});

return;
}

/* FINISH VOTE (host) */
if (id === "imp_finish_vote") {

if (!onlyHost(interaction, state)) return;

if (state.phase !== "voting") {
return interaction.reply({ content: "Not in voting phase.", ephemeral: true });
}

const votedOutId = countVotes(state.votes) || state.players[0];
const crewWin = votedOutId === state.impostorId;

games.delete(interaction.channelId);

await interaction.update({
embeds: [resultsEmbed(state, votedOutId, crewWin)],
components: []
});

return;
}

}

};
