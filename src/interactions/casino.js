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
"Lucky Pick",
"Quick Click",
"Fast Type"
];

const EMOJI = {
"Small Win":"💰",
"Big Win":"💎",
"Lose Fish":"📉",
"Disaster":"💀",
"Casino Tax":"🏛",
"Charity":"🎁",
"Fish Rain":"🐟",
"Fish Storm":"🌪",
"Lucky Player":"🍀",
"Bomb":"💣",
"Jackpot":"🎰",
"Penalty":"⚠",
"Dice Duel":"🎲",
"Lucky Pick":"🔢",
"Quick Click":"⚡",
"Fast Type":"⌨"
};

/* ---------------- UTILS ---------------- */

function shuffle(a){
return [...a].sort(()=>Math.random()-0.5);
}

function pickEvents(){
return shuffle(EVENT_POOL).slice(0,10);
}

function leaderboard(state){

const arr = Object.entries(state.fish)
.filter(([id])=>state.alive.includes(id))
.sort((a,b)=>b[1]-a[1]);

return arr.map(([id,fish],i)=>{

let medal="";
if(i===0) medal="🥇";
if(i===1) medal="🥈";
if(i===2) medal="🥉";

return `${medal} <@${id}> — ${fish} 🐟`;

}).join("\n");

}

function wheelText(events){
return events.map((e,i)=>`${i+1} ${EMOJI[e]||"🎲"} ${e}`).join("\n");
}

function panelEmbed(state,eventText="Waiting for spin..."){

return {

title:"🎰 CASINO WHEEL",

description:

`🎡 **Active Wheel**

${wheelText(state.events)}

🏆 **Leaderboard**

${leaderboard(state)}

🎰 **Turn**
<@${state.alive[state.turn] || state.alive[0]}>

🎯 **Event**
${eventText}`

};

}

function spinRow(){

return [

new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("casino_spin")
.setLabel("SPIN")
.setEmoji("🎡")
.setStyle(ButtonStyle.Primary)

)

];

}

function lobbyButtons(){

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

function lobbyEmbed(state){

const players = state.players.map(p=>`• <@${p}>`).join("\n");

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

Spin the wheel and survive the casino.`

};

}

/* ---------------- ECONOMIC EVENTS ---------------- */

function runEconomicEvent(state,event){

const p = state.alive[state.turn];

if(event==="Small Win"){ state.fish[p]+=2; return `<@${p}> wins +2 🐟`; }
if(event==="Big Win"){ state.fish[p]+=5; return `<@${p}> wins +5 🐟`; }
if(event==="Lose Fish"){ state.fish[p]-=2; return `<@${p}> loses 2 🐟`; }
if(event==="Disaster"){ state.fish[p]-=4; return `<@${p}> loses 4 🐟`; }
if(event==="Penalty"){ state.fish[p]-=3; return `<@${p}> loses 3 🐟`; }

if(event==="Jackpot"){
state.fish[p]+=8;
return `🎰 JACKPOT!\n<@${p}> wins +8 🐟`;
}

if(event==="Casino Tax"){
state.alive.forEach(x=>state.fish[x]-=1);
return `🏛 Casino tax! Everyone loses 1 🐟`;
}

if(event==="Charity"){
state.alive.forEach(x=>state.fish[x]+=1);
return `🎁 Charity! Everyone gains 1 🐟`;
}

if(event==="Fish Rain"){
state.alive.forEach(x=>state.fish[x]+=2);
return `🐟 Fish rain! Everyone gains 2 🐟`;
}

if(event==="Fish Storm"){
state.alive.forEach(x=>state.fish[x]-=2);
return `🌪 Fish storm! Everyone loses 2 🐟`;
}

if(event==="Lucky Player"){
const t = shuffle(state.alive)[0];
state.fish[t]+=3;
return `🍀 Lucky player!\n<@${t}> gains 3 🐟`;
}

if(event==="Bomb"){
const t = shuffle(state.alive)[0];
state.fish[t]-=3;
return `💣 Bomb!\n<@${t}> loses 3 🐟`;
}

return null;

}

/* ---------------- MODULE ---------------- */

module.exports = {

match(interaction){

return interaction.isButton();

},

async run(interaction){

let state = games.get(interaction.channelId);

/* allow thread interactions */

if(!state){

const entries = Object.values(games._games || {});
state = entries.find(g=>g.threadId===interaction.channelId);

if(!state) return;

}

const id = interaction.customId;

/* ---------------- JOIN ---------------- */

if(id==="casino_join"){

if(state.players.includes(interaction.user.id))
return interaction.reply({content:"You already joined.",ephemeral:true});

state.players.push(interaction.user.id);

await interaction.update({
embeds:[lobbyEmbed(state)],
components:lobbyButtons()
});

}

/* ---------------- LEAVE ---------------- */

if(id==="casino_leave"){

state.players = state.players.filter(p=>p!==interaction.user.id);

await interaction.update({
embeds:[lobbyEmbed(state)],
components:lobbyButtons()
});

}

/* ---------------- CANCEL ---------------- */

if(id==="casino_cancel"){

if(interaction.user.id!==state.hostId)
return interaction.reply({content:"Only host can cancel.",ephemeral:true});

games.delete(interaction.channelId);

await interaction.update({content:"❌ Casino cancelled.",embeds:[],components:[]});

}

/* ---------------- START ---------------- */

if(id==="casino_start"){

if(interaction.user.id!==state.hostId)
return interaction.reply({content:"Only host can start.",ephemeral:true});

if(state.players.length<MIN_PLAYERS)
return interaction.reply({content:"Not enough players.",ephemeral:true});

state.phase="spin";
state.alive=[...state.players];

state.players.forEach(p=>state.fish[p]=STARTING_FISH);

state.events=pickEvents();

/* thread */

const thread = await interaction.channel.threads.create({
name:`casino-${interaction.user.username}`,
type:ChannelType.PrivateThread,
invitable:false
});

state.threadId=thread.id;

for(const p of state.players){
try{ await thread.members.add(p);}catch{}
}

/* panel */

const panel = await thread.send({
embeds:[panelEmbed(state)],
components:spinRow()
});

state.panelMessageId=panel.id;

await interaction.update({
content:`🎰 Casino game started in <#${thread.id}>`,
embeds:[],
components:[]
});

}

/* ---------------- SPIN ---------------- */

if(id==="casino_spin"){

const player = state.alive[state.turn];

if(interaction.user.id!==player)
return interaction.reply({content:"Not your turn.",ephemeral:true});

await interaction.deferUpdate();

/* thread safety */

const thread = interaction.client.channels.cache.get(state.threadId);
if(!thread){ games.delete(interaction.channelId); return; }

/* panel safety */

let panel;
try{
panel = await thread.messages.fetch(state.panelMessageId);
}catch{
games.delete(interaction.channelId);
return;
}

/* animation */

await panel.edit({embeds:[panelEmbed(state,"🎡 Spinning...")],components:[]});

await new Promise(r=>setTimeout(r,1200));

/* event */

const event = shuffle(state.events)[0];

let result = runEconomicEvent(state,event);

/* dice duel */

if(event==="Dice Duel"){

const opponent = shuffle(state.alive.filter(p=>p!==player))[0];

const d1 = Math.floor(Math.random()*6)+1;
const d2 = Math.floor(Math.random()*6)+1;

if(d1>d2){
state.fish[player]+=3;
state.fish[opponent]-=3;
result=`🎲 Dice Duel\n<@${player}> (${d1}) beats <@${opponent}> (${d2})`;
}else{
state.fish[player]-=3;
state.fish[opponent]+=3;
result=`🎲 Dice Duel\n<@${opponent}> (${d2}) beats <@${player}> (${d1})`;
}

}

/* lucky pick */

if(event==="Lucky Pick"){
const number=Math.floor(Math.random()*10)+1;
state.fish[player]+=number;
result=`🔢 Lucky Pick\n<@${player}> wins ${number} 🐟`;
}

/* eliminate */

Object.keys(state.fish).forEach(p=>{
if(state.fish[p]<0) state.fish[p]=0;
});

state.alive = state.alive.filter(p=>state.fish[p]>0);

/* win */

if(state.alive.length===1){

await panel.edit({

embeds:[{
title:"🏆 CASINO WINNER",
description:`🏆 <@${state.alive[0]}> wins the casino!`
}],
components:[]

});

games.delete(interaction.channelId);
return;

}

/* next turn */

state.turn++;
if(state.turn>=state.alive.length) state.turn=0;

/* update */

await panel.edit({
embeds:[panelEmbed(state,result)],
components:spinRow()
});

}

}

};
