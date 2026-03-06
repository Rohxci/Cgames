const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ChannelType
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

/* ---------- CARDS ---------- */

const suits = ["♠","♥","♦","♣"];
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function createDeck(){
let deck = [];

for(const s of suits){
for(const r of ranks){
deck.push({r,s});
}
}

return deck.sort(()=>Math.random()-0.5);
}

function card(c){
return `${c.r}${c.s}`;
}

function value(hand){

let v = 0;
let aces = 0;

for(const c of hand){

if(["J","Q","K"].includes(c.r)) v += 10;
else if(c.r === "A"){ v += 11; aces++; }
else v += parseInt(c.r);

}

while(v > 21 && aces > 0){
v -= 10;
aces--;
}

return v;
}

/* ---------- FIND GAME ---------- */

function findGame(channel){

let g = games.get(channel.id);
if(g) return g;

if(channel.isThread()){
return games.get(channel.parentId);
}

}

/* ---------- NEXT PLAYER ---------- */

function nextPlayer(state){

state.turn++;

while(state.turn < state.players.length){

const p = state.players[state.turn];

if(!state.bust.includes(p) && !state.stood.includes(p)){
return;
}

state.turn++;

}

return "dealer";
}

/* ---------- DEALER ---------- */

function dealerTurn(state){

let v = value(state.dealer);

while(v < 17){
state.dealer.push(state.deck.pop());
v = value(state.dealer);
}

}

/* ---------- RESULT ---------- */

function calculate(state){

const dealer = value(state.dealer);

let best = 0;
let winners = [];

for(const p of state.players){

if(state.bust.includes(p)) continue;

const v = value(state.hands[p]);

if(v > 21) continue;
if(dealer <= 21 && v <= dealer) continue;

if(v > best){
best = v;
winners = [p];
}
else if(v === best){
winners.push(p);
}

}

return {dealer, winners};
}

/* ---------- TABLE ---------- */

async function table(thread,state){

let text = "━━━━━━━━━━━━━━\n\n";

for(const p of state.players){

const user = await thread.client.users.fetch(p);
const hand = state.hands[p];
const val = value(hand);

text += `${user.username}\n`;
text += `${hand.map(card).join(" ")}\n`;
text += `Value: ${val}\n\n`;

}

text += "━━━━━━━━━━━━━━\n\n";
text += `Dealer\n${card(state.dealer[0])} ?\n`;

const turnUser = await thread.client.users.fetch(state.players[state.turn]);

await thread.send({

embeds:[createEmbed(
"♠️ Blackjack Table",
`${text}

Turn: ${turnUser.username}

Round ${state.round} / 20`
)],

components:[new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("bjd_hit")
.setLabel("Hit")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("bjd_stand")
.setLabel("Stand")
.setStyle(ButtonStyle.Success)

)]

});

}

/* ---------- START ROUND ---------- */

async function startRound(thread,state){

state.deck = createDeck();
state.hands = {};
state.stood = [];
state.bust = [];
state.turn = 0;
state.votes = [];

state.dealer = [state.deck.pop(), state.deck.pop()];

for(const p of state.players){
state.hands[p] = [state.deck.pop(), state.deck.pop()];
}

table(thread,state);
}

/* ---------- VOTE PANEL ---------- */

async function votePanel(thread,state){

let text = "";

for(const p of state.players){

const user = await thread.client.users.fetch(p);

text += `${user.username} ${state.votes.includes(p) ? "✔" : "⏳"}\n`;

}

await thread.send({

embeds:[createEmbed(
"♠️ Next Round Vote",
text
)],

components:[new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("bjd_again")
.setLabel("Play Again")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("bjd_finish")
.setLabel("Finish Game")
.setStyle(ButtonStyle.Danger)

)]

});
}

/* ---------- HANDLER ---------- */

module.exports = {

match(i){
return i.isButton() && i.customId.startsWith("bjd_");
},

async run(interaction){

const state = findGame(interaction.channel);
if(!state) return;

const id = interaction.customId;

/* ---------- JOIN ---------- */

if(id === "bjd_join"){

if(state.players.includes(interaction.user.id)) return;

if(state.players.length >= 6){
return interaction.reply({
content:"Table is full.",
ephemeral:true
});
}

state.players.push(interaction.user.id);

await interaction.update({
embeds:[{
title:"♠️ Blackjack Table",
description:`Host: <@${state.host}>

Players (${state.players.length}/6)
${state.players.map(p=>`• <@${p}>`).join("\n")}

━━━━━━━━━━━━━━
Rules
━━━━━━━━━━━━━━

• Beat the dealer by getting closer to 21
• J Q K = 10
• A = 1 or 11
• Hit → draw a card
• Stand → stop drawing
• Dealer draws until 17
• Highest value wins`
}],
components:interaction.message.components
});

return;
}

/* ---------- LEAVE ---------- */

if(id === "bjd_leave"){

if(!state.players.includes(interaction.user.id)){
return interaction.reply({content:"You are not in the table.",ephemeral:true});
}

state.players = state.players.filter(p => p !== interaction.user.id);

await interaction.update({
embeds:[{
title:"♠️ Blackjack Table",
description:`Host: <@${state.host}>

Players (${state.players.length}/6)
${state.players.map(p=>`• <@${p}>`).join("\n")}`
}],
components:interaction.message.components
});

return;
}

/* ---------- START ---------- */

if(id === "bjd_start"){

if(interaction.user.id !== state.host){
return interaction.reply({
content:"Only the host can start.",
ephemeral:true
});
}

if(state.players.length < 2){
return interaction.reply({
content:"Minimum 2 players required.",
ephemeral:true
});
}

const thread = await interaction.channel.threads.create({
name:"blackjack-table",
type:ChannelType.PrivateThread
});

state.thread = thread.id;

for(const p of state.players){
await thread.members.add(p);
}

await interaction.update({
embeds:[createEmbed(
"♠️ Blackjack Table",
`Game started in <#${thread.id}>`
)],
components:[]
});

startRound(thread,state);

return;
}

/* ---------- HIT ---------- */

if(id === "bjd_hit"){

const p = interaction.user.id;

if(p !== state.players[state.turn]){
return interaction.reply({content:"Not your turn.",ephemeral:true});
}

state.hands[p].push(state.deck.pop());

if(value(state.hands[p]) > 21){
state.bust.push(p);
}

const next = nextPlayer(state);

if(next === "dealer"){

dealerTurn(state);

const r = calculate(state);

let text = `Dealer — ${r.dealer}\n\n`;

for(const pl of state.players){

const user = await interaction.client.users.fetch(pl);

text += `${user.username} — ${state.bust.includes(pl) ? "bust" : value(state.hands[pl])}\n`;

}

if(r.winners.length === 0){
text += "\nDealer wins";
}
else{

const names = [];

for(const w of r.winners){
const u = await interaction.client.users.fetch(w);
names.push(u.username);
}

text += `\nWinner: ${names.join(", ")}`;

}

await interaction.channel.send({
embeds:[createEmbed("♠️ Round Result",text)]
});

if(state.round >= 20){

await interaction.channel.delete();
games.delete(interaction.channel.parentId);
return;

}

state.round++;
votePanel(interaction.channel,state);

return;
}

table(interaction.channel,state);

}

/* ---------- STAND ---------- */

if(id === "bjd_stand"){

const p = interaction.user.id;

if(p !== state.players[state.turn]){
return interaction.reply({content:"Not your turn.",ephemeral:true});
}

state.stood.push(p);

const next = nextPlayer(state);

if(next === "dealer"){

dealerTurn(state);

const r = calculate(state);

let text = `Dealer — ${r.dealer}\n\n`;

for(const pl of state.players){

const user = await interaction.client.users.fetch(pl);

text += `${user.username} — ${state.bust.includes(pl) ? "bust" : value(state.hands[pl])}\n`;

}

if(r.winners.length === 0){
text += "\nDealer wins";
}
else{

const names = [];

for(const w of r.winners){
const u = await interaction.client.users.fetch(w);
names.push(u.username);
}

text += `\nWinner: ${names.join(", ")}`;

}

await interaction.channel.send({
embeds:[createEmbed("♠️ Round Result",text)]
});

if(state.round >= 20){

await interaction.channel.delete();
games.delete(interaction.channel.parentId);
return;

}

state.round++;
votePanel(interaction.channel,state);

return;
}

table(interaction.channel,state);

}

/* ---------- PLAY AGAIN ---------- */

if(id === "bjd_again"){

if(!state.players.includes(interaction.user.id)) return;

if(!state.votes.includes(interaction.user.id)){
state.votes.push(interaction.user.id);
}

if(state.votes.length === state.players.length){
startRound(interaction.channel,state);
}

}

/* ---------- FINISH ---------- */

if(id === "bjd_finish"){

await interaction.channel.delete();
games.delete(interaction.channel.parentId);

}

}

};
