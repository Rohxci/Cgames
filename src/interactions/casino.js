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

const ECONOMY_EVENTS = [
"Small Win",
"Big Win",
"Lose Fish",
"Disaster",
"Casino Tax",
"Charity",
"Fish Rain",
"Fish Storm",
"Lucky Player",
"Bomb"
];

const CHALLENGE_EVENTS = [
"Dice Duel",
"Rock Paper Scissors",
"Reaction Duel",
"Math Duel",
"High Card Duel",
"Coin Flip Duel",
"Lucky Pick",
"Risk Choice",
"All In",
"Pick a Number",
"Safe or Risk",
"Fast Type",
"Trivia",
"Word Scramble",
"Quick Click",
"Emoji Memory",
"Guess Number",
"Steal",
"Gift",
"Blackjack"
];

const ALL_EVENTS = [...ECONOMY_EVENTS, ...CHALLENGE_EVENTS];

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

"Dice Duel":"🎲",
"Rock Paper Scissors":"✊",
"Reaction Duel":"⚡",
"Math Duel":"➗",
"High Card Duel":"🃏",
"Coin Flip Duel":"🪙",
"Lucky Pick":"🔢",
"Risk Choice":"🎯",
"All In":"🎰",
"Pick a Number":"🎲",
"Safe or Risk":"🟩",
"Fast Type":"⌨️",
"Trivia":"🧠",
"Word Scramble":"🔤",
"Quick Click":"⚡",
"Emoji Memory":"😀",
"Guess Number":"🔢",
"Steal":"🦹",
"Gift":"🎁",
"Blackjack":"♠️"
};

/* ---------------- HELPERS ---------------- */

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

function wheelText(){
const eco = ECONOMY_EVENTS.map((e, i) => `${i + 1} ${EMOJI[e]} ${e}`).join("\n");
const challenges = CHALLENGE_EVENTS.map((e, i) => `${i + 11} ${EMOJI[e]} ${e}`).join("\n");

return `💰 **Economy**\n${eco}\n\n🎮 **Challenges**\n${challenges}`;
}

function lobbyEmbed(state){
const players = state.players.map(p => `• <@${p}>`).join("\n") || "No players";

return {
title:"🎰 CASINO WHEEL",
description:
`🎰 **Host**
<@${state.hostId}>

🐟 **Starting Fish**
${STARTING_FISH} 🐟

👥 **Players**
${players}

Players: ${state.players.length} / ${MAX_PLAYERS}
Minimum: ${MIN_PLAYERS}

Spin the wheel and survive the casino.
Last player with fish wins.`
};
}

function panelEmbed(state, eventText = "Waiting for spin..."){
return {
title:"🎰 CASINO WHEEL",
description:
`🎡 **Active Wheel**

${wheelText()}

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
return await thread.messages.fetch(state.panelMessageId);
}catch{
return null;
}
}

async function sendMainResult(interaction, state, text){
const main = interaction.client.channels.cache.get(
state.mainChannelId || interaction.channel.parentId || interaction.channel.id
);
if(!main) return;

await main.send(text).catch(() => {});
}

async function closeCasino(interaction, state, finalText){
const panel = await fetchPanel(interaction, state);

if(panel){
await panel.edit({
embeds:[{
title:"🏆 CASINO WINNER",
description: finalText
}],
components:[]
}).catch(() => {});
}

await sendMainResult(interaction, state, finalText);

const thread = interaction.client.channels.cache.get(state.threadId);
games.delete(state.mainChannelId || interaction.channel.parentId || interaction.channel.id);

if(thread){
await thread.delete().catch(() => {});
}
}

function randomAliveExcept(state, playerId){
const others = state.alive.filter(id => id !== playerId);
if(others.length === 0) return null;
return others[Math.floor(Math.random() * others.length)];
}

function rand(min, max){
return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ---------------- EVENT LOGIC ---------------- */

function runEconomyEvent(state, event){
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

if(event === "Casino Tax"){
state.alive.forEach(id => state.fish[id] -= 1);
return `🏛️ Casino Tax!\nEveryone loses 1 🐟`;
}

if(event === "Charity"){
state.alive.forEach(id => state.fish[id] += 1);
return `🎁 Charity!\nEveryone gains 1 🐟`;
}

if(event === "Fish Rain"){
state.alive.forEach(id => state.fish[id] += 2);
return `🐟 Fish Rain!\nEveryone gains 2 🐟`;
}

if(event === "Fish Storm"){
state.alive.forEach(id => state.fish[id] -= 2);
return `🌪️ Fish Storm!\nEveryone loses 2 🐟`;
}

if(event === "Lucky Player"){
const target = state.alive[Math.floor(Math.random() * state.alive.length)];
state.fish[target] += 3;
return `🍀 Lucky Player!\n<@${target}> gains 3 🐟`;
}

if(event === "Bomb"){
const target = state.alive[Math.floor(Math.random() * state.alive.length)];
state.fish[target] -= 3;
return `💣 Bomb!\n<@${target}> loses 3 🐟`;
}

return null;
}

function runChallengeEvent(state, event){
const player = currentTurnPlayer(state);

if(event === "Dice Duel"){
const opponent = randomAliveExcept(state, player);
if(!opponent){
state.fish[player] += 2;
return `🎲 Dice Duel skipped.\n<@${player}> gains +2 🐟`;
}

const pRoll = rand(1, 6);
const oRoll = rand(1, 6);

if(pRoll > oRoll){
state.fish[player] += 3;
state.fish[opponent] -= 3;
return `🎲 Dice Duel\n<@${player}> (${pRoll}) beats <@${opponent}> (${oRoll})\n<@${player}> +3 🐟`;
}

if(oRoll > pRoll){
state.fish[player] -= 3;
state.fish[opponent] += 3;
return `🎲 Dice Duel\n<@${opponent}> (${oRoll}) beats <@${player}> (${pRoll})\n<@${opponent}> +3 🐟`;
}

return `🎲 Dice Duel\nTie! ${pRoll} - ${oRoll}\nNo fish changed.`;
}

if(event === "Rock Paper Scissors"){
const opponent = randomAliveExcept(state, player);
if(!opponent){
state.fish[player] += 2;
return `✊ Rock Paper Scissors skipped.\n<@${player}> gains +2 🐟`;
}

const moves = ["Rock", "Paper", "Scissors"];
const a = moves[rand(0, 2)];
const b = moves[rand(0, 2)];

if(a === b){
return `✊ Rock Paper Scissors\n<@${player}> chose ${a}\n<@${opponent}> chose ${b}\nTie!`;
}

const win =
(a === "Rock" && b === "Scissors") ||
(a === "Paper" && b === "Rock") ||
(a === "Scissors" && b === "Paper");

if(win){
state.fish[player] += 3;
state.fish[opponent] -= 3;
return `✊ Rock Paper Scissors\n<@${player}> chose ${a}\n<@${opponent}> chose ${b}\n<@${player}> wins +3 🐟`;
}

state.fish[player] -= 3;
state.fish[opponent] += 3;
return `✊ Rock Paper Scissors\n<@${player}> chose ${a}\n<@${opponent}> chose ${b}\n<@${opponent}> wins +3 🐟`;
}

if(event === "Reaction Duel"){
const opponent = randomAliveExcept(state, player);
if(!opponent){
state.fish[player] += 2;
return `⚡ Reaction Duel skipped.\n<@${player}> gains +2 🐟`;
}

const p = rand(150, 550);
const o = rand(150, 550);

if(p < o){
state.fish[player] += 3;
state.fish[opponent] -= 3;
return `⚡ Reaction Duel\n<@${player}> ${p}ms\n<@${opponent}> ${o}ms\n<@${player}> wins +3 🐟`;
}

if(o < p){
state.fish[player] -= 3;
state.fish[opponent] += 3;
return `⚡ Reaction Duel\n<@${player}> ${p}ms\n<@${opponent}> ${o}ms\n<@${opponent}> wins +3 🐟`;
}

return `⚡ Reaction Duel\nPerfect tie!\nNo fish changed.`;
}

if(event === "Math Duel"){
const opponent = randomAliveExcept(state, player);
if(!opponent){
state.fish[player] += 2;
return `➗ Math Duel skipped.\n<@${player}> gains +2 🐟`;
}

const a = rand(5, 25);
const b = rand(5, 25);
const answer = a + b;
const winner = Math.random() < 0.5 ? player : opponent;
const loser = winner === player ? opponent : player;

state.fish[winner] += 3;
state.fish[loser] -= 3;

return `➗ Math Duel\n${a} + ${b} = ${answer}\n<@${winner}> answered first and wins +3 🐟`;
}

if(event === "High Card Duel"){
const opponent = randomAliveExcept(state, player);
if(!opponent){
state.fish[player] += 2;
return `🃏 High Card Duel skipped.\n<@${player}> gains +2 🐟`;
}

const pCard = rand(2, 14);
const oCard = rand(2, 14);

if(pCard > oCard){
state.fish[player] += 3;
state.fish[opponent] -= 3;
return `🃏 High Card Duel\n<@${player}> ${pCard}\n<@${opponent}> ${oCard}\n<@${player}> wins +3 🐟`;
}

if(oCard > pCard){
state.fish[player] -= 3;
state.fish[opponent] += 3;
return `🃏 High Card Duel\n<@${player}> ${pCard}\n<@${opponent}> ${oCard}\n<@${opponent}> wins +3 🐟`;
}

return `🃏 High Card Duel\nTie!\nNo fish changed.`;
}

if(event === "Coin Flip Duel"){
const opponent = randomAliveExcept(state, player);
if(!opponent){
state.fish[player] += 2;
return `🪙 Coin Flip Duel skipped.\n<@${player}> gains +2 🐟`;
}

const flip = Math.random() < 0.5 ? player : opponent;
const loser = flip === player ? opponent : player;

state.fish[flip] += 3;
state.fish[loser] -= 3;

return `🪙 Coin Flip Duel\nThe coin chooses <@${flip}>\n<@${flip}> wins +3 🐟`;
}

if(event === "Lucky Pick"){
const number = rand(1, 10);
state.fish[player] += number;
return `🔢 Lucky Pick\n<@${player}> wins ${number} 🐟`;
}

if(event === "Risk Choice"){
const risk = Math.random() < 0.5;
if(risk){
state.fish[player] += 5;
return `🎯 Risk Choice\n<@${player}> took the risk and won +5 🐟`;
}
state.fish[player] -= 3;
return `🎯 Risk Choice\n<@${player}> took the risk and lost 3 🐟`;
}

if(event === "All In"){
const amount = state.fish[player];
if(amount <= 0) return `🎰 All In\n<@${player}> had nothing to bet.`;

if(Math.random() < 0.5){
state.fish[player] += amount;
return `🎰 All In\n<@${player}> doubled to ${state.fish[player]} 🐟`;
}
state.fish[player] = 0;
return `🎰 All In\n<@${player}> lost everything!`;
}

if(event === "Pick a Number"){
const correct = rand(1, 5);
const picked = rand(1, 5);
if(correct === picked){
state.fish[player] += 4;
return `🎲 Pick a Number\n<@${player}> picked ${picked} and guessed right!\n+4 🐟`;
}
return `🎲 Pick a Number\n<@${player}> picked ${picked}\nCorrect was ${correct}\nNo reward.`;
}

if(event === "Safe or Risk"){
if(Math.random() < 0.5){
state.fish[player] += 4;
return `🟩 Safe or Risk\n<@${player}> chose risk and won +4 🐟`;
}
state.fish[player] -= 2;
return `🟩 Safe or Risk\n<@${player}> chose risk and lost 2 🐟`;
}

if(event === "Fast Type"){
const winner = state.alive[Math.floor(Math.random() * state.alive.length)];
state.fish[winner] += 4;
return `⌨️ Fast Type\n<@${winner}> typed first and wins +4 🐟`;
}

if(event === "Trivia"){
const winner = state.alive[Math.floor(Math.random() * state.alive.length)];
state.fish[winner] += 4;
return `🧠 Trivia\n<@${winner}> answered first and wins +4 🐟`;
}

if(event === "Word Scramble"){
const winner = state.alive[Math.floor(Math.random() * state.alive.length)];
state.fish[winner] += 4;
return `🔤 Word Scramble\n<@${winner}> solved it first and wins +4 🐟`;
}

if(event === "Quick Click"){
const winner = state.alive[Math.floor(Math.random() * state.alive.length)];
state.fish[winner] += 4;
return `⚡ Quick Click\n<@${winner}> clicked first and wins +4 🐟`;
}

if(event === "Emoji Memory"){
const winner = state.alive[Math.floor(Math.random() * state.alive.length)];
state.fish[winner] += 4;
return `😀 Emoji Memory\n<@${winner}> remembered the sequence and wins +4 🐟`;
}

if(event === "Guess Number"){
const winner = state.alive[Math.floor(Math.random() * state.alive.length)];
state.fish[winner] += 4;
return `🔢 Guess Number\n<@${winner}> guessed right and wins +4 🐟`;
}

if(event === "Steal"){
const target = randomAliveExcept(state, player);
if(!target){
state.fish[player] += 2;
return `🦹 Steal skipped.\n<@${player}> gains +2 🐟`;
}

const amount = Math.min(2, state.fish[target]);
state.fish[target] -= amount;
state.fish[player] += amount;

return `🦹 Steal\n<@${player}> steals ${amount} 🐟 from <@${target}>`;
}

if(event === "Gift"){
const target = randomAliveExcept(state, player);
if(!target){
return `🎁 Gift skipped.`;
}

const amount = Math.min(2, state.fish[player]);
state.fish[player] -= amount;
state.fish[target] += amount;

return `🎁 Gift\n<@${player}> gives ${amount} 🐟 to <@${target}>`;
}

if(event === "Blackjack"){
const opponent = randomAliveExcept(state, player);
if(!opponent){
state.fish[player] += 2;
return `♠️ Blackjack skipped.\n<@${player}> gains +2 🐟`;
}

const pScore = rand(16, 23);
const oScore = rand(16, 23);

const pBust = pScore > 21;
const oBust = oScore > 21;

if(!pBust && (oBust || pScore > oScore)){
state.fish[player] += 4;
state.fish[opponent] -= 4;
return `♠️ Blackjack\n<@${player}> ${pScore}\n<@${opponent}> ${oScore}\n<@${player}> wins +4 🐟`;
}

if(!oBust && (pBust || oScore > pScore)){
state.fish[player] -= 4;
state.fish[opponent] += 4;
return `♠️ Blackjack\n<@${player}> ${pScore}\n<@${opponent}> ${oScore}\n<@${opponent}> wins +4 🐟`;
}

return `♠️ Blackjack\n<@${player}> ${pScore}\n<@${opponent}> ${oScore}\nPush! No fish changed.`;
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

/* ---------------- JOIN ---------------- */

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

/* ---------------- LEAVE ---------------- */

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

/* ---------------- CANCEL ---------------- */

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

/* ---------------- START ---------------- */

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
state.events = [...ALL_EVENTS];

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

/* ---------------- END ---------------- */

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

/* ---------------- SPIN ---------------- */

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

const event = ALL_EVENTS[rand(0, ALL_EVENTS.length - 1)];

let result =
runEconomyEvent(state, event) ||
runChallengeEvent(state, event) ||
`🎲 Event triggered: ${event}`;

clampFish(state);

const removed = eliminatePlayers(state);

if(removed.length > 0){
result += `\n\n💀 Out:\n${removed.map(id => `<@${id}>`).join("\n")}`;
}

if(state.alive.length === 0){
await closeCasino(
interaction,
state,
`🛑 Everyone was eliminated.\n\nWinner: none`
);
return;
}

if(state.alive.length === 1){
await closeCasino(
interaction,
state,
`🏆 <@${state.alive[0]}> wins the casino!\n\nFinal Fish: ${state.fish[state.alive[0]]} 🐟`
);
return;
}

if(state.turn >= state.alive.length){
state.turn = 0;
}else{
advanceTurn(state);
}

await panel.edit({
embeds: [panelEmbed(state, `${EMOJI[event] || "🎲"} ${event}\n\n${result}`)],
components: panelRows()
});

return;
}

}

};
