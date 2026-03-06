const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ChannelType
} = require("discord.js");

const games = require("../systems/games");

const STARTING_FISH = 15;
const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;

/* ---------------- EVENT POOL ---------------- */

const EVENT_POOL = [
"Small Win",
"Big Win",
"Lose Fish",
"Disaster",
"Casino Tax",
"Charity",
"Fish Rain",
"Fish Storm",
"Lucky Player",
"Bomb",
"Jackpot",
"Penalty",
"Dice Duel",
"Lucky Pick"
];

const EMOJI = {
"Small Win":"💰",
"Big Win":"💎",
"Lose Fish":"📉",
"Disaster":"💀",
"Casino Tax":"🏛️",
"Charity":"🎁",
"Fish Rain":"🐟",
"Fish Storm":"🌪️",
"Lucky Player":"🍀",
"Bomb":"💣",
"Jackpot":"🎰",
"Penalty":"⚠️",
"Dice Duel":"🎲",
"Lucky Pick":"🔢"
};

/* ---------------- HELPERS ---------------- */

function shuffle(array){
return [...array].sort(() => Math.random() - 0.5);
}

function pickEvents(){
return shuffle(EVENT_POOL).slice(0, 10);
}

function findGame(channel){
let game = games.get(channel.id);
if(game) return game;

if(channel.isThread()){
return games.get(channel.parentId);
}

return null;
}

function leaderboard(state){
const arr = Object.entries(state.fish)
.filter(([id]) => state.alive.includes(id))
.sort((a, b) => b[1] - a[1]);

return arr.map(([id, fish], i) => {
let medal = "";
if(i === 0) medal = "🥇";
if(i === 1) medal = "🥈";
if(i === 2) medal = "🥉";
return `${medal} <@${id}> — ${fish} 🐟`;
}).join("\n");
}

function wheelText(events){
return events.map((e, i) => `${i + 1} ${EMOJI[e] || "🎲"} ${e}`).join("\n");
}

function lobbyEmbed(state){
const players = state.players.map(p => `• <@${p}>`).join("\n") || "No players";

return {
title: "🎰 CASINO WHEEL",
description:
`🎰 **Host**
<@${state.hostId}>

🐟 **Starting Fish**
${STARTING_FISH} 🐟

👥 **Players**
${players}

Players: ${state.players.length} / ${MAX_PLAYERS}
Minimum: ${MIN_PLAYERS}

Spin the wheel and survive the casino.`
};
}

function panelEmbed(state, eventText = "Waiting for spin..."){
return {
title: "🎰 CASINO WHEEL",
description:
`🎡 **Active Wheel**

${wheelText(state.events)}

🏆 **Leaderboard**

${leaderboard(state)}

🎰 **Turn**
<@${state.alive[state.turn] || state.alive[0] || state.hostId}>

🎯 **Event**
${eventText}`
};
}

function lobbyRows(){
return [
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("casino_join")
.setLabel("Join")
.setEmoji("🎲")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("casino_leave")
.setLabel("Leave")
.setEmoji("🚪")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("casino_start")
.setLabel("Start")
.setEmoji("🎰")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("casino_cancel")
.setLabel("Cancel")
.setEmoji("❌")
.setStyle(ButtonStyle.Danger)
)
];
}

function panelRows(){
return [
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("casino_spin")
.setLabel("SPIN")
.setEmoji("🎡")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("casino_end")
.setLabel("END")
.setEmoji("🛑")
.setStyle(ButtonStyle.Danger)
)
];
}

function clampFish(state){
for(const id of Object.keys(state.fish)){
if(state.fish[id] < 0) state.fish[id] = 0;
}
}

function eliminatePlayers(state){
const removed = [];

for(const id of [...state.alive]){
if((state.fish[id] || 0) <= 0){
removed.push(id);
}
}

state.alive = state.alive.filter(id => (state.fish[id] || 0) > 0);

return removed;
}

function currentTurnPlayer(state){
return state.alive[state.turn];
}

function advanceTurn(state){
if(state.alive.length === 0) return;
state.turn++;
if(state.turn >= state.alive.length){
state.turn = 0;
}
}

async function fetchPanel(interaction, state){
const thread = interaction.client.channels.cache.get(state.threadId);
if(!thread) return null;

try{
const panel = await thread.messages.fetch(state.panelMessageId);
return panel;
}catch{
return null;
}
}

async function sendMainResult(interaction, state, text){
const main = interaction.client.channels.cache.get(state.mainChannelId || interaction.channel.parentId || interaction.channel.id);
if(!main) return;

await main.send(text).catch(() => {});
}

async function closeCasino(interaction, state, finalText){
const panel = await fetchPanel(interaction, state);

if(panel){
await panel.edit({
embeds: [{
title: "🏆 CASINO WINNER",
description: finalText
}],
components: []
}).catch(() => {});
}

await sendMainResult(interaction, state, finalText);

const thread = interaction.client.channels.cache.get(state.threadId);
games.delete(state.mainChannelId || interaction.channel.parentId || interaction.channel.id);

if(thread){
await thread.delete().catch(() => {});
}
}

function runEconomicEvent(state, event){
const player = currentTurnPlayer(state);

if(event === "Small Win"){
state.fish[player] += 2;
return `<@${player}> wins +2 🐟`;
}

if(event === "Big Win"){
state.fish[player] += 5;
return `<@${player}> wins +5 🐟`;
}

if(event === "Lose Fish"){
state.fish[player] -= 2;
return `<@${player}> loses 2 🐟`;
}

if(event === "Disaster"){
state.fish[player] -= 4;
return `<@${player}> loses 4 🐟`;
}

if(event === "Penalty"){
state.fish[player] -= 3;
return `<@${player}> loses 3 🐟`;
}

if(event === "Jackpot"){
state.fish[player] += 8;
return `🎰 JACKPOT!\n<@${player}> wins +8 🐟`;
}

if(event === "Casino Tax"){
state.alive.forEach(id => {
state.fish[id] -= 1;
});
return `🏛️ Casino Tax!\nEveryone loses 1 🐟`;
}

if(event === "Charity"){
state.alive.forEach(id => {
state.fish[id] += 1;
});
return `🎁 Charity!\nEveryone gains 1 🐟`;
}

if(event === "Fish Rain"){
state.alive.forEach(id => {
state.fish[id] += 2;
});
return `🐟 Fish Rain!\nEveryone gains 2 🐟`;
}

if(event === "Fish Storm"){
state.alive.forEach(id => {
state.fish[id] -= 2;
});
return `🌪️ Fish Storm!\nEveryone loses 2 🐟`;
}

if(event === "Lucky Player"){
const target = shuffle(state.alive)[0];
state.fish[target] += 3;
return `🍀 Lucky Player!\n<@${target}> gains 3 🐟`;
}

if(event === "Bomb"){
const target = shuffle(state.alive)[0];
state.fish[target] -= 3;
return `💣 Bomb!\n<@${target}> loses 3 🐟`;
}

return null;
}

function runInteractiveEvent(state, event){
const player = currentTurnPlayer(state);

if(event === "Dice Duel"){
const opponent = shuffle(state.alive.filter(id => id !== player))[0];
if(!opponent){
state.fish[player] += 2;
return `🎲 Dice Duel skipped.\n<@${player}> gains +2 🐟`;
}

const d1 = Math.floor(Math.random() * 6) + 1;
const d2 = Math.floor(Math.random() * 6) + 1;

if(d1 > d2){
state.fish[player] += 3;
state.fish[opponent] -= 3;
return `🎲 Dice Duel\n<@${player}> (${d1}) beats <@${opponent}> (${d2})\n<@${player}> +3 🐟`;
}

if(d2 > d1){
state.fish[player] -= 3;
state.fish[opponent] += 3;
return `🎲 Dice Duel\n<@${opponent}> (${d2}) beats <@${player}> (${d1})\n<@${opponent}> +3 🐟`;
}

return `🎲 Dice Duel\nTie! ${d1} - ${d2}\nNo fish changed.`;
}

if(event === "Lucky Pick"){
const number = Math.floor(Math.random() * 10) + 1;
state.fish[player] += number;
return `🔢 Lucky Pick\n<@${player}> wins ${number} 🐟`;
}

return null;
}

/* ---------------- MODULE ---------------- */

module.exports = {

match(interaction){
return interaction.isButton() &&
interaction.customId.startsWith("casino_");
},

async run(interaction){
const state = findGame(interaction.channel);
if(!state) return;

const id = interaction.customId;

/* ---------------- LOBBY: JOIN ---------------- */

if(id === "casino_join"){
if(state.phase !== "lobby") return;

if(state.players.includes(interaction.user.id)){
return interaction.reply({
content: "You already joined.",
ephemeral: true
});
}

if(state.players.length >= MAX_PLAYERS){
return interaction.reply({
content: "Lobby is full.",
ephemeral: true
});
}

state.players.push(interaction.user.id);

await interaction.update({
embeds: [lobbyEmbed(state)],
components: lobbyRows()
});

return;
}

/* ---------------- LOBBY: LEAVE ---------------- */

if(id === "casino_leave"){
if(state.phase !== "lobby") return;

if(!state.players.includes(interaction.user.id)){
return interaction.reply({
content: "You are not in the lobby.",
ephemeral: true
});
}

state.players = state.players.filter(p => p !== interaction.user.id);

if(state.players.length === 0){
games.delete(interaction.channelId);
await interaction.update({
content: "❌ Casino cancelled.",
embeds: [],
components: []
});
return;
}

if(state.hostId === interaction.user.id){
state.hostId = state.players[0];
}

await interaction.update({
embeds: [lobbyEmbed(state)],
components: lobbyRows()
});

return;
}

/* ---------------- LOBBY: CANCEL ---------------- */

if(id === "casino_cancel"){
if(state.phase !== "lobby") return;

if(interaction.user.id !== state.hostId){
return interaction.reply({
content: "Only host can cancel.",
ephemeral: true
});
}

games.delete(interaction.channelId);

await interaction.update({
content: "❌ Casino cancelled.",
embeds: [],
components: []
});

return;
}

/* ---------------- LOBBY: START ---------------- */

if(id === "casino_start"){
if(state.phase !== "lobby") return;

if(interaction.user.id !== state.hostId){
return interaction.reply({
content: "Only host can start.",
ephemeral: true
});
}

if(state.players.length < MIN_PLAYERS){
return interaction.reply({
content: "Not enough players.",
ephemeral: true
});
}

state.phase = "spin";
state.mainChannelId = interaction.channelId;
state.alive = [...state.players];
state.turn = 0;
state.fish = {};
state.events = pickEvents();

state.players.forEach(id => {
state.fish[id] = STARTING_FISH;
});

const thread = await interaction.channel.threads.create({
name: `casino-${interaction.user.username}`,
type: ChannelType.PrivateThread,
invitable: false
});

state.threadId = thread.id;

for(const id of state.players){
try{
await thread.members.add(id);
}catch{}
}

const panel = await thread.send({
embeds: [panelEmbed(state)],
components: panelRows()
});

state.panelMessageId = panel.id;

await interaction.update({
content: `🎰 Casino game started in <#${thread.id}>`,
embeds: [],
components: []
});

return;
}

/* ---------------- GAME: END ---------------- */

if(id === "casino_end"){
if(state.phase !== "spin") return;

if(interaction.user.id !== state.hostId){
return interaction.reply({
content: "Only host can end the game.",
ephemeral: true
});
}

await interaction.deferUpdate();

await closeCasino(
interaction,
state,
`🛑 Casino ended by host.\n\nWinner: none`
);

return;
}

/* ---------------- GAME: SPIN ---------------- */

if(id === "casino_spin"){
if(state.phase !== "spin") return;

const player = currentTurnPlayer(state);

if(!player){
games.delete(state.mainChannelId || interaction.channel.parentId || interaction.channel.id);
return;
}

if(interaction.user.id !== player){
return interaction.reply({
content: "Not your turn.",
ephemeral: true
});
}

await interaction.deferUpdate();

const panel = await fetchPanel(interaction, state);
if(!panel){
games.delete(state.mainChannelId || interaction.channel.parentId || interaction.channel.id);
return;
}

await panel.edit({
embeds: [panelEmbed(state, "🎡 Spinning...")],
components: []
});

await new Promise(r => setTimeout(r, 1200));

await panel.edit({
embeds: [panelEmbed(state, "🎡 Spinning...")],
components: []
});

await new Promise(r => setTimeout(r, 1200));

const event = shuffle(state.events)[0];

let result =
runEconomicEvent(state, event) ||
runInteractiveEvent(state, event) ||
`🎲 Event triggered: ${event}`;

clampFish(state);

const removed = eliminatePlayers(state);

if(removed.length > 0){
result += `\n\n💀 Out:\n${removed.map(id => `<@${id}>`).join("\n")}`;
}

/* all gone safety */
if(state.alive.length === 0){
await closeCasino(
interaction,
state,
`🛑 Everyone was eliminated.\n\nWinner: none`
);
return;
}

/* winner */
if(state.alive.length === 1){
await closeCasino(
interaction,
state,
`🏆 <@${state.alive[0]}> wins the casino!\n\nFinal Fish: ${state.fish[state.alive[0]]} 🐟`
);
return;
}

/* keep turn valid after eliminations */
if(state.turn >= state.alive.length){
state.turn = 0;
}else{
advanceTurn(state);
}

await panel.edit({
embeds: [panelEmbed(state, result)],
components: panelRows()
});

return;
}

}

};
