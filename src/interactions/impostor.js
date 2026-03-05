const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder
} = require("discord.js");

const games = require("../systems/games");

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;

function pickRandom(arr){
return arr[Math.floor(Math.random()*arr.length)];
}

function lobbyEmbed(state){

const players = state.players.map(p=>`• <@${p}>`).join("\n") || "—";

return {
title:"🎭 Impostor Lobby",
description:`Players: ${state.players.length}/${MAX_PLAYERS}

Host: <@${state.hostId}>

${players}`
};

}

function lobbyButtons(){

return[
new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("imp_join")
.setLabel("Join")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("imp_leave")
.setLabel("Leave")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("imp_start")
.setLabel("Start")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("imp_cancel")
.setLabel("Cancel")
.setStyle(ButtonStyle.Danger)

)
];

}

module.exports={

match(interaction){
return interaction.customId?.startsWith("imp_");
},

async run(interaction){

const state = games.get(interaction.channelId);
if(!state || state.type !== "impostor") return;

const id = interaction.customId;

/* JOIN */

if(id==="imp_join"){

if(!state.players.includes(interaction.user.id)){
state.players.push(interaction.user.id);
}

await interaction.update({
embeds:[lobbyEmbed(state)],
components:lobbyButtons()
});

return;

}

/* LEAVE */

if(id==="imp_leave"){

state.players = state.players.filter(p=>p!==interaction.user.id);

await interaction.update({
embeds:[lobbyEmbed(state)],
components:lobbyButtons()
});

return;

}

/* CANCEL */

if(id==="imp_cancel"){

if(interaction.user.id !== state.hostId){
return interaction.reply({
content:"Only the host can cancel the game.",
ephemeral:true
});
}

games.delete(interaction.channelId);

await interaction.update({
content:"Game cancelled.",
embeds:[],
components:[]
});

return;

}

/* START GAME */

if(id==="imp_start"){

if(interaction.user.id !== state.hostId){
return interaction.reply({
content:"Only the host can start the game.",
ephemeral:true
});
}

if(state.players.length < MIN_PLAYERS){
return interaction.reply({
content:"Need at least 3 players.",
ephemeral:true
});
}

state.impostor = pickRandom(state.players);

await interaction.update({

content:"Roles assigned. Discuss in chat, then start the vote.",
embeds:[],
components:[
new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("imp_vote_start")
.setLabel("Start Vote")
.setStyle(ButtonStyle.Primary)

)
]

});

return;

}

/* START VOTE */

if(id==="imp_vote_start"){

if(interaction.user.id !== state.hostId){
return interaction.reply({
content:"Only the host can start the vote.",
ephemeral:true
});
}

const options=[];

for(const p of state.players){

const member = await interaction.guild.members.fetch(p).catch(()=>null);
const name = member ? member.displayName : p;

options.push({
label:name.slice(0,100),
value:p
});

}

const menu = new StringSelectMenuBuilder()
.setCustomId("imp_vote")
.setPlaceholder("Vote the impostor")
.addOptions(options);

await interaction.update({

content:"🗳 Voting phase",
components:[
new ActionRowBuilder().addComponents(menu)
]

});

return;

}

/* VOTE */

if(interaction.isStringSelectMenu() && id==="imp_vote"){

state.votes = state.votes || {};
state.votes[interaction.user.id] = interaction.values[0];

await interaction.reply({
content:"Vote registered.",
ephemeral:true
});

if(Object.keys(state.votes).length === state.players.length){

const counts={};

Object.values(state.votes).forEach(v=>{
counts[v]=(counts[v]||0)+1;
});

let max=0;
let voted=null;

for(const k in counts){
if(counts[k] > max){
max = counts[k];
voted = k;
}
}

const crewWin = voted === state.impostor;

games.delete(interaction.channelId);

await interaction.channel.send({
content:`🎭 Game Over

Impostor: <@${state.impostor}>

${crewWin ? "Crew wins!" : "Impostor wins!"}`
});

}

}

}

};
