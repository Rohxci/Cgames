const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

const THEMES = {
food:["Pizza","Burger","Pasta","Sushi","Salad","Cake","Ice Cream","Sandwich","Steak","Soup","Fries","Taco","Donut","Pancakes","Cheese","Rice","Chicken","Hotdog","Chocolate","Apple"],
places:["Airport","Beach","School","Hospital","Restaurant","Cinema","Library","Park","Hotel","Museum","Stadium","Mall","Zoo","Train Station","Office","Farm","Castle","Island","Desert","Forest"],
animals:["Dog","Cat","Lion","Tiger","Elephant","Bear","Wolf","Monkey","Horse","Cow","Pig","Sheep","Rabbit","Fox","Giraffe","Panda","Kangaroo","Zebra","Snake","Shark"],
jobs:["Doctor","Teacher","Chef","Police","Firefighter","Pilot","Farmer","Artist","Musician","Driver","Engineer","Builder","Lawyer","Nurse","Scientist","Mechanic","Actor","Journalist","Dentist","Programmer"],
sports:["Football","Basketball","Tennis","Hockey","Golf","Boxing","Swimming","Cycling","Running","Volleyball","Baseball","Rugby","Skating","Surfing","Skiing","Snowboard","Climbing","Karate","Archery","Fencing"],
objects:["Phone","Laptop","Chair","Table","Bottle","Knife","Camera","Backpack","Clock","Television","Lamp","Mirror","Key","Wallet","Glasses","Pen","Notebook","Headphones","Speaker","Remote"]
};

const DISCUSSION_TIME = 90000;
const VOTE_TIME = 60000;

module.exports = {

match(interaction){
if(!interaction.isButton()) return false;
return interaction.customId.startsWith("imp_");
},

async run(interaction){

const state = games.get(interaction.channelId);
if(!state) return;

const id = interaction.customId;

/* JOIN */

if(id === "imp_join"){

if(state.players.includes(interaction.user.id)) return;

state.players.push(interaction.user.id);

await interaction.update({
embeds:[{
title:"🎭 Impostor Lobby",
description:`Host: <@${state.hostId}>

Players: ${state.players.length}/10

Players
${state.players.map(p=>`• <@${p}>`).join("\n")}`
}],
components:interaction.message.components
});

return;
}

/* LEAVE */

if(id === "imp_leave"){

state.players = state.players.filter(p=>p!==interaction.user.id);

await interaction.update({
embeds:[{
title:"🎭 Impostor Lobby",
description:`Host: <@${state.hostId}>

Players: ${state.players.length}/10

Players
${state.players.map(p=>`• <@${p}>`).join("\n")}`
}],
components:interaction.message.components
});

return;
}

/* START */

if(id === "imp_start"){

if(interaction.user.id !== state.hostId){
return interaction.reply({content:"Only the host can start.",ephemeral:true});
}

const themeKeys = Object.keys(THEMES);
const theme = themeKeys[Math.floor(Math.random()*themeKeys.length)];
const words = THEMES[theme];
const word = words[Math.floor(Math.random()*words.length)];

const impostor = state.players[Math.floor(Math.random()*state.players.length)];

state.word = word;
state.theme = theme;
state.impostor = impostor;

/* CREATE THREAD */

const thread = await interaction.channel.threads.create({
name:"🎭 impostor-game",
autoArchiveDuration:60
});

state.threadId = thread.id;

/* MESSAGE IN MAIN CHANNEL */

await interaction.update({
embeds:[createEmbed("🎭 Impostor Game Started",`Game moved to thread: <#${thread.id}>`)],
components:[]
});

/* SEND ROLES */

for(const p of state.players){

const user = await interaction.client.users.fetch(p);

if(p === impostor){

await user.send(`Category: ${theme}

You are the IMPOSTOR.`);

}else{

await user.send(`Category: ${theme}

Word: ${word}`);

}

}

/* DISCUSSION */

await thread.send({
embeds:[createEmbed("🎭 Discussion Phase",`Category: ${theme}

Discuss to find the impostor.

⏱ ${DISCUSSION_TIME/1000}s`)]
});

setTimeout(async ()=>{

const row = new ActionRowBuilder();

state.players.forEach(p=>{
row.addComponents(
new ButtonBuilder()
.setCustomId(`imp_vote_${p}`)
.setLabel(`Vote ${p}`)
.setStyle(ButtonStyle.Secondary)
);
});

await thread.send({
embeds:[createEmbed("🗳 Voting Phase","Vote the impostor.")],
components:[row]
});

state.votes={};

setTimeout(async()=>{

/* COUNT VOTES */

const counts={};

for(const v of Object.values(state.votes)){
counts[v]=(counts[v]||0)+1;
}

let votedPlayer=null;
let max=0;

for(const p in counts){
if(counts[p]>max){
max=counts[p];
votedPlayer=p;
}
}

let resultEmbed;

if(votedPlayer===state.impostor){

resultEmbed=createEmbed("🎉 Crew Wins",
`The impostor was <@${state.impostor}>

Category: ${theme}
Word: ${word}`);

}else{

resultEmbed=createEmbed("💀 Impostor Wins",
`The impostor was <@${state.impostor}>

Category: ${theme}
Word: ${word}`);

}

await thread.send({embeds:[resultEmbed]});

/* CLEANUP */

setTimeout(async()=>{
try{
await thread.delete();
}catch{}

games.delete(interaction.channelId);

},5000);

},VOTE_TIME);

},DISCUSSION_TIME);

return;
}

/* CANCEL */

if(id==="imp_cancel"){

if(interaction.user.id!==state.hostId){
return interaction.reply({content:"Only host can cancel.",ephemeral:true});
}

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("❌ Lobby Cancelled","Game cancelled.")],
components:[]
});

return;
}

/* VOTE */

if(id.startsWith("imp_vote_")){

if(!state.players.includes(interaction.user.id)){
return interaction.reply({content:"You are not playing.",ephemeral:true});
}

if(state.votes[interaction.user.id]){
return interaction.reply({content:"You already voted.",ephemeral:true});
}

const voted=id.split("_")[2];

state.votes[interaction.user.id]=voted;

await interaction.reply({
content:`Vote registered for <@${voted}>`,
ephemeral:true
});

}

}

};
