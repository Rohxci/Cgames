const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ChannelType
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

const THEMES = {
Food:["Pizza","Burger","Pasta","Sushi","Salad","Ice Cream","Steak","Bread","Cheese","Rice","Apple","Banana","Orange","Cake","Soup","Taco","Noodles","Fries","Pancake","Chocolate"],
Animals:["Dog","Cat","Lion","Tiger","Elephant","Bear","Wolf","Fox","Monkey","Zebra","Horse","Cow","Sheep","Goat","Rabbit","Deer","Shark","Dolphin","Eagle","Owl"],
Countries:["Italy","France","Germany","Spain","USA","Canada","Brazil","Japan","China","India","Mexico","Argentina","Norway","Sweden","Finland","Australia","Egypt","Turkey","Greece","Portugal"],
Jobs:["Doctor","Teacher","Police","Firefighter","Chef","Pilot","Farmer","Driver","Nurse","Artist","Musician","Engineer","Programmer","Lawyer","Judge","Dentist","Actor","Director","Journalist","Photographer"],
Sports:["Football","Basketball","Tennis","Hockey","Baseball","Golf","Boxing","Rugby","Volleyball","Swimming","Cycling","Running","Skating","Skiing","Surfing","Wrestling","Fencing","Archery","Cricket","Badminton"],
Movies:["Avatar","Titanic","Gladiator","Joker","Batman","Superman","Frozen","Shrek","Matrix","Inception","Rocky","Rambo","Alien","Terminator","Star Wars","Harry Potter","Spiderman","Thor","Hulk","Avengers"],
Technology:["Computer","Phone","Tablet","Laptop","Internet","WiFi","Robot","Drone","Camera","Server","Cloud","Keyboard","Mouse","Screen","Battery","Processor","Chip","Code","AI","Software"],
Places:["School","Hospital","Airport","Restaurant","Hotel","Beach","Park","Museum","Library","Stadium","Cinema","Theater","Mall","Zoo","Farm","Forest","Desert","Mountain","Island","Village"]
};

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

if(id==="imp_join"){

if(state.players.includes(interaction.user.id)){
return interaction.reply({content:"You already joined.",ephemeral:true});
}

state.players.push(interaction.user.id);

await interaction.update({
embeds:[createEmbed(
"🎭 Impostor Lobby",
`Host: <@${state.host}>

Players: ${state.players.length}

${state.players.map(p=>`• <@${p}>`).join("\n")}`
)],
components:interaction.message.components
});

}

/* LEAVE */

if(id==="imp_leave"){

state.players = state.players.filter(p=>p!==interaction.user.id);

await interaction.update({
embeds:[createEmbed(
"🎭 Impostor Lobby",
`Host: <@${state.host}>

Players: ${state.players.length}

${state.players.map(p=>`• <@${p}>`).join("\n")}`
)],
components:interaction.message.components
});

}

/* CANCEL */

if(id==="imp_cancel"){

if(interaction.user.id!==state.host){
return interaction.reply({content:"Only the host can cancel.",ephemeral:true});
}

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("❌ Game cancelled","The lobby was closed.")],
components:[]
});

}

/* START */

if(id==="imp_start"){

if(interaction.user.id!==state.host){
return interaction.reply({content:"Only the host can start.",ephemeral:true});
}

if(state.players.length<2){
return interaction.reply({content:"Need at least 2 players.",ephemeral:true});
}

/* THREAD */

const thread = await interaction.channel.threads.create({
name:"🎭 impostor-game",
type:ChannelType.PublicThread
});

state.thread = thread.id;

/* ADD PLAYERS */

for(const p of state.players){
await thread.members.add(p);
}

/* THEME */

const categories = Object.keys(THEMES);
const category = categories[Math.floor(Math.random()*categories.length)];

const wordList = THEMES[category];
const word = wordList[Math.floor(Math.random()*wordList.length)];

/* IMPOSTOR */

const impostor = state.players[Math.floor(Math.random()*state.players.length)];

/* ROLES */

for(const p of state.players){

if(p===impostor){

await interaction.client.users.send(p,{
embeds:[createEmbed(
"🎭 Your Role",
`You are the **IMPOSTOR**

Category: **${category}**

Blend in.`
)]
});

}else{

await interaction.client.users.send(p,{
embeds:[createEmbed(
"🎭 Your Role",
`You are **CREW**

Category: **${category}**
Word: **${word}**

Find the impostor.`
)]
});

}

}

state.impostor = impostor;

/* START DISCUSSION */

await interaction.update({
embeds:[createEmbed(
"🎭 Impostor Game Started",
`Game moved to thread: <#${thread.id}>

Discuss and find the impostor.`
)],
components:[]
});

/* VOTE BUTTON */

await thread.send({
embeds:[createEmbed(
"🗳 Vote",
"Click to start voting."
)],
components:[
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("imp_vote")
.setLabel("Start Vote")
.setStyle(ButtonStyle.Primary)
)
]
});

}

/* START VOTE */

if(id==="imp_vote"){

const thread = interaction.channel;

const players = state.players;

const row = new ActionRowBuilder();

players.forEach(p=>{
row.addComponents(
new ButtonBuilder()
.setCustomId(`imp_vote_${p}`)
.setLabel(`Vote ${p}`)
.setStyle(ButtonStyle.Secondary)
);
});

await interaction.update({
embeds:[createEmbed("🗳 Voting","Choose the impostor.")],
components:[row]
});

}

/* VOTE PLAYER */

if(id.startsWith("imp_vote_")){

const voted = id.split("_")[2];

games.delete(interaction.channelId);

if(voted===state.impostor){

await interaction.update({
embeds:[createEmbed(
"🎉 Crew Wins",
`Impostor was <@${state.impostor}>`
)],
components:[]
});

}else{

await interaction.update({
embeds:[createEmbed(
"💀 Impostor Wins",
`Crew voted <@${voted}>
Real impostor: <@${state.impostor}>`
)],
components:[]
});

}

}

}

};
