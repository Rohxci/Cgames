const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ChannelType
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

/* CARD SYSTEM */

const suits=["♠","♥","♦","♣"];
const ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function createDeck(){

let d=[];

for(const s of suits){
for(const r of ranks){
d.push({r,s});
}
}

return d.sort(()=>Math.random()-0.5);

}

function card(c){
return `${c.r}${c.s}`;
}

function handValue(hand){

let v=0;
let aces=0;

for(const c of hand){

if(["J","Q","K"].includes(c.r)) v+=10;
else if(c.r==="A"){v+=11;aces++;}
else v+=parseInt(c.r);

}

while(v>21 && aces>0){
v-=10;
aces--;
}

return v;

}

/* FIND GAME */

function findGame(channel){

let g=games.get(channel.id);
if(g) return g;

if(channel.isThread()){
return games.get(channel.parentId);
}

}

/* NEXT PLAYER */

function nextPlayer(state){

state.turn++;

while(state.turn < state.players.length){

const p=state.players[state.turn];

if(!state.bust.includes(p) && !state.stood.includes(p)) return;

state.turn++;

}

return "dealer";

}

/* DEALER */

function dealerTurn(state){

let v=handValue(state.dealer);

while(v<17){

state.dealer.push(state.deck.pop());
v=handValue(state.dealer);

}

}

/* RESULT */

function calculate(state){

const dealerValue=handValue(state.dealer);

let best=0;
let winners=[];

for(const p of state.players){

if(state.bust.includes(p)) continue;

const v=handValue(state.hands[p]);

if(v>21) continue;

if(dealerValue<=21 && v<=dealerValue) continue;

if(v>best){
best=v;
winners=[p];
}
else if(v===best){
winners.push(p);
}

}

return {dealerValue,winners};

}

/* TABLE */

async function sendTable(thread,state){

let text="";

for(const p of state.players){

const user=await thread.client.users.fetch(p);

const hand=state.hands[p];
const val=handValue(hand);

text+=`\n${user.username}
${hand.map(card).join(" ")}
Value: ${val}\n`;

}

text+=`\nDealer
${card(state.dealer[0])} ?`;

const turnUser=await thread.client.users.fetch(state.players[state.turn]);

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
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("bjd_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)

)]

});

}

/* START ROUND */

async function startRound(thread,state){

state.deck=createDeck();
state.hands={};
state.stood=[];
state.bust=[];
state.turn=0;
state.votes=[];

state.dealer=[state.deck.pop(),state.deck.pop()];

for(const p of state.players){
state.hands[p]=[state.deck.pop(),state.deck.pop()];
}

sendTable(thread,state);

}

/* VOTE PANEL */

async function votePanel(thread,state){

let text="Next Round Vote\n\n";

for(const p of state.players){

const user=await thread.client.users.fetch(p);

text+=`${user.username} ${state.votes.includes(p) ? "✔" : "⏳"}\n`;

}

await thread.send({

embeds:[createEmbed("♠️ Next Round",text)],

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

module.exports={

match(i){
return i.isButton() && i.customId.startsWith("bjd_");
},

async run(interaction){

let state=findGame(interaction.channel);

const id=interaction.customId;

/* LOBBY BUTTONS */

if(id==="bjd_join"){

if(state.players.includes(interaction.user.id)) return;

if(state.players.length>=6){
return interaction.reply({content:"Table is full.",ephemeral:true});
}

state.players.push(interaction.user.id);

await interaction.update({
embeds:[{
title:"♠️ Blackjack Table",
description:`Host: <@${state.host}>

Players (${state.players.length}/6)
${state.players.map(p=>`• <@${p}>`).join("\n")}

Minimum players: 2
Maximum players: 6`
}],
components:interaction.message.components
});

return;

}

if(id==="bjd_leave"){

state.players=state.players.filter(p=>p!==interaction.user.id);

if(interaction.user.id===state.host && state.players.length>0){
state.host=state.players[0];
}

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

if(id==="bjd_cancel"){

if(interaction.user.id!==state.host){
return interaction.reply({content:"Only host can cancel.",ephemeral:true});
}

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("❌ Blackjack","Game cancelled.")],
components:[]
});

return;

}

/* START */

if(id==="bjd_start"){

if(interaction.user.id!==state.host){
return interaction.reply({content:"Only host can start.",ephemeral:true});
}

if(state.players.length<2){
return interaction.reply({content:"Need at least 2 players.",ephemeral:true});
}

const thread=await interaction.channel.threads.create({
name:"blackjack-table",
type:ChannelType.PrivateThread
});

state.thread=thread.id;

for(const p of state.players){
await thread.members.add(p);
}

await interaction.update({
embeds:[createEmbed(
"♠️ Blackjack Table",
`The match is happening in: <#${thread.id}>`
)],
components:[]
});

startRound(thread,state);

return;

}

/* HIT */

if(id==="bjd_hit"){

const p=interaction.user.id;

if(p!==state.players[state.turn]){
return interaction.reply({content:"Not your turn.",ephemeral:true});
}

state.hands[p].push(state.deck.pop());

if(handValue(state.hands[p])>21){
state.bust.push(p);
}

const next=nextPlayer(state);

if(next==="dealer"){

dealerTurn(state);

const result=calculate(state);

const main=interaction.channel.parent;

let text=`Dealer — ${result.dealerValue}\n\n`;

for(const pl of state.players){

const user=await interaction.client.users.fetch(pl);

text+=`${user.username} — ${state.bust.includes(pl) ? "bust" : handValue(state.hands[pl])}\n`;

}

if(result.winners.length===0){
text+="\nDealer wins";
}
else{

const names=[];

for(const w of result.winners){
const u=await interaction.client.users.fetch(w);
names.push(u.username);
}

text+=`\nWinner: ${names.join(", ")}`;

}

await main.send({
content:state.players.map(p=>`<@${p}>`).join(" "),
embeds:[createEmbed("♠️ Blackjack Results",text)]
});

if(state.round>=20){

await interaction.channel.delete();
games.delete(main.id);
return;

}

state.round++;

votePanel(interaction.channel,state);

return;

}

sendTable(interaction.channel,state);

}

/* STAND */

if(id==="bjd_stand"){

const p=interaction.user.id;

if(p!==state.players[state.turn]){
return interaction.reply({content:"Not your turn.",ephemeral:true});
}

state.stood.push(p);

const next=nextPlayer(state);

if(next==="dealer"){

dealerTurn(state);

const result=calculate(state);

const main=interaction.channel.parent;

let text=`Dealer — ${result.dealerValue}\n\n`;

for(const pl of state.players){

const user=await interaction.client.users.fetch(pl);

text+=`${user.username} — ${state.bust.includes(pl) ? "bust" : handValue(state.hands[pl])}\n`;

}

if(result.winners.length===0){
text+="\nDealer wins";
}
else{

const names=[];

for(const w of result.winners){
const u=await interaction.client.users.fetch(w);
names.push(u.username);
}

text+=`\nWinner: ${names.join(", ")}`;

}

await main.send({
content:state.players.map(p=>`<@${p}>`).join(" "),
embeds:[createEmbed("♠️ Blackjack Results",text)]
});

if(state.round>=20){

await interaction.channel.delete();
games.delete(main.id);
return;

}

state.round++;

votePanel(interaction.channel,state);

return;

}

sendTable(interaction.channel,state);

}

/* SURRENDER */

if(id==="bjd_surrender"){

state.bust.push(interaction.user.id);

sendTable(interaction.channel,state);

}

/* PLAY AGAIN */

if(id==="bjd_again"){

if(!state.players.includes(interaction.user.id)) return;

if(!state.votes.includes(interaction.user.id)){
state.votes.push(interaction.user.id);
}

if(state.votes.length===state.players.length){
startRound(interaction.channel,state);
}

}

/* FINISH GAME */

if(id==="bjd_finish"){

const main=interaction.channel.parent;

await interaction.channel.delete();

games.delete(main.id);

}

}

};
