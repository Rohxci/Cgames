const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ChannelType,
PermissionsBitField
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

const DISCUSSION_TIME = 60000;
const VOTE_TIME = 30000;

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
return interaction.isButton() && interaction.customId.startsWith("imp_");
},

async run(interaction){

const state = games.get(interaction.channelId);
if(!state) return;

const id = interaction.customId;

/* JOIN */

if(id==="imp_join"){

if(state.players.includes(interaction.user.id)){
return interaction.reply({content:"Already joined.",ephemeral:true});
}

state.players.push(interaction.user.id);

await interaction.update({
embeds:[createEmbed(
"🎭 Impostor Lobby",
`Players: ${state.players.length}

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
`Players: ${state.players.length}

${state.players.map(p=>`• <@${p}>`).join("\n")}`
)],
components:interaction.message.components
});

}

/* START GAME */

if(id==="imp_start"){

if(interaction.user.id!==state.host){
return interaction.reply({content:"Only host can start.",ephemeral:true});
}

if(state.players.length<2){
return interaction.reply({content:"Need at least 2 players.",ephemeral:true});
}

/* THREAD */

const thread = await interaction.channel.threads.create({
name:"🎭 impostor-game",
type:ChannelType.PrivateThread
});

state.thread = thread.id;

/* ADD PLAYERS */

for(const p of state.players){
await thread.members.add(p);
}

/* PICK CATEGORY */

const categories = Object.keys(THEMES);
const category = categories[Math.floor(Math.random()*categories.length)];
const word = THEMES[category][Math.floor(Math.random()*20)];

/* PICK IMPOSTOR */

const impostor = state.players[Math.floor(Math.random()*state.players.length)];
state.impostor = impostor;

/* SEND ROLES */

for(const p of state.players){

if(p===impostor){

await interaction.client.users.send(p,{
embeds:[createEmbed(
"🎭 Your Role",
`You are **IMPOSTOR**

Category: **${category}**`
)]
});

}else{

await interaction.client.users.send(p,{
embeds:[createEmbed(
"🎭 Your Role",
`You are **CREW**

Category: **${category}**
Word: **${word}**`
)]
});

}

}

/* DISCUSSION */

await thread.send({
embeds:[createEmbed(
"💬 Discussion Phase",
`Discuss for **60 seconds**.

Then voting will start automatically.`
)]
});

setTimeout(async()=>{

startVote(interaction,thread,state);

},DISCUSSION_TIME);

await interaction.update({
embeds:[createEmbed(
"🎭 Game Started",
`Game moved to <#${thread.id}>`
)],
components:[]
});

}

/* VOTE CLICK */

if(id.startsWith("imp_vote_")){

const voted = id.split("_")[2];

if(!state.votes) state.votes={};

state.votes[interaction.user.id]=voted;

await interaction.reply({
content:`You voted <@${voted}>`,
ephemeral:true
});

/* if all voted */

if(Object.keys(state.votes).length===state.players.length){

finishVote(interaction,state);

}

}

}

};

/* START VOTE */

async function startVote(interaction,thread,state){

state.votes={};

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
embeds:[createEmbed(
"🗳 Voting",
"You have **30 seconds** to vote."
)],
components:[row]
});

setTimeout(()=>{

finishVote(interaction,state);

},VOTE_TIME);

}

/* FINISH VOTE */

async function finishVote(interaction,state){

const votes = {};

Object.values(state.votes).forEach(v=>{
votes[v]=(votes[v]||0)+1;
});

let voted = Object.keys(votes).sort((a,b)=>votes[b]-votes[a])[0];

games.delete(interaction.channelId);

if(voted===state.impostor){

interaction.channel.send({
embeds:[createEmbed(
"🎉 Crew Wins",
`Impostor was <@${state.impostor}>`
)]
});

}else{

interaction.channel.send({
embeds:[createEmbed(
"💀 Impostor Wins",
`Crew voted <@${voted}>
Real impostor: <@${state.impostor}>`
)]
});

}

}
