const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ChannelType
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

/* deck */

const suits=["♠","♥","♦","♣"];
const ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function deck(){

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

/* find game */

function findGame(channel){

let g=games.get(channel.id);
if(g) return g;

if(channel.isThread()){
return games.get(channel.parentId);
}

}

/* lobby buttons */

async function updateLobby(interaction,state){

await interaction.update({
embeds:[{
title:"♠️ Blackjack Table",
description:`Host: <@${state.host}>

Players (${state.players.length}/6)
${state.players.map(p=>`• <@${p}>`).join("\n")}`
}],
components:interaction.message.components
});

}

module.exports={

match(i){
return i.isButton() && i.customId.startsWith("bjd");
},

async run(interaction){

const state=findGame(interaction.channel);
if(!state) return;

const id=interaction.customId;

/* JOIN */

if(id==="bjd_join"){

if(state.players.includes(interaction.user.id)) return;

if(state.players.length>=6) return;

state.players.push(interaction.user.id);

return updateLobby(interaction,state);

}

/* LEAVE */

if(id==="bjd_leave"){

state.players=state.players.filter(p=>p!==interaction.user.id);

if(interaction.user.id===state.host && state.players.length>0){
state.host=state.players[0];
}

if(state.players.length===0){
games.delete(interaction.channel.id);
}

return updateLobby(interaction,state);

}

/* CANCEL */

if(id==="bjd_cancel"){

if(interaction.user.id!==state.host){
return interaction.reply({content:"Only host can cancel.",ephemeral:true});
}

games.delete(interaction.channel.id);

return interaction.update({
embeds:[createEmbed("❌ Blackjack","Game cancelled.")],
components:[]
});

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

/* add players */

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

}

}

};

/* round */

async function startRound(thread,state){

const d=deck();

state.deck=d;
state.hands={};
state.stood=[];
state.bust=[];
state.turn=0;

state.dealer=[d.pop(),d.pop()];

for(const p of state.players){
state.hands[p]=[d.pop(),d.pop()];
}

sendTable(thread,state);

}

/* table */

async function sendTable(thread,state){

let text="";

for(const p of state.players){

const user=await thread.client.users.fetch(p);

const h=state.hands[p];
const val=handValue(h);

text+=`\n${user.username}
${h.map(card).join(" ")}
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

new ButtonBuilder().setCustomId("bjd_hit").setLabel("Hit").setStyle(ButtonStyle.Primary),

new ButtonBuilder().setCustomId("bjd_stand").setLabel("Stand").setStyle(ButtonStyle.Success),

new ButtonBuilder().setCustomId("bjd_surrender").setLabel("Surrender").setStyle(ButtonStyle.Danger)

)]
});

}
