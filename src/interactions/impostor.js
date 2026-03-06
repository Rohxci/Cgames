const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ChannelType
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

/* FIND GAME */

function findGame(channel){

let game = games.get(channel.id);
if(game) return game;

if(channel.isThread()){
return games.get(channel.parentId);
}

return null;

}

/* THEMES */

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

const state = findGame(interaction.channel);
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

/* CANCEL */

if(id==="imp_cancel"){

if(interaction.user.id!==state.host){
return interaction.reply({content:"Only host can cancel.",ephemeral:true});
}

games.delete(interaction.channel.id);

await interaction.update({
embeds:[createEmbed("❌ Game cancelled","Lobby closed.")],
components:[]
});

}

/* START */

if(id==="imp_start"){

if(interaction.user.id!==state.host){
return interaction.reply({content:"Only host can start.",ephemeral:true});
}

if(state.players.length<2){
return interaction.reply({content:"Need at least 2 players.",ephemeral:true});
}

const thread = await interaction.channel.threads.create({
name:"🎭 impostor-game",
type:ChannelType.PrivateThread
});

state.thread = thread.id;
state.revealed = {};
state.endDiscussionVotes = [];
state.votes = {};

for(const p of state.players){
await thread.members.add(p);
}

const categories = Object.keys(THEMES);
const category = categories[Math.floor(Math.random()*categories.length)];
const word = THEMES[category][Math.floor(Math.random()*20)];

state.category = category;
state.word = word;
state.impostor = state.players[Math.floor(Math.random()*state.players.length)];

await interaction.update({
embeds:[createEmbed(
"🎭 Impostor Game Started",
`The match is happening in: <#${thread.id}>`
)],
components:[]
});

await thread.send({
embeds:[createEmbed(
"🎭 Game Started",
"Press **Reveal Role** to see your role."
)],
components:[
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("imp_reveal")
.setLabel("Reveal Role")
.setStyle(ButtonStyle.Primary)
)
]
});

await thread.send({
embeds:[createEmbed(
"💬 Discussion",
"Discuss and press **End Discussion** when ready."
)],
components:[
new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("imp_end_discussion")
.setLabel("End Discussion")
.setStyle(ButtonStyle.Secondary)
)
]
});

}

/* REVEAL */

if(id==="imp_reveal"){

if(state.revealed[interaction.user.id]){
return interaction.reply({content:"You already revealed your role.",ephemeral:true});
}

state.revealed[interaction.user.id] = true;

if(interaction.user.id===state.impostor){

return interaction.reply({
embeds:[createEmbed(
"🎭 Your Role",
`You are **IMPOSTOR**

Category: **${state.category}**`
)],
ephemeral:true
});

}else{

return interaction.reply({
embeds:[createEmbed(
"🎭 Your Role",
`You are **CREW**

Category: **${state.category}**
Word: **${state.word}**`
)],
ephemeral:true
});

}

}

/* END DISCUSSION */

if(id==="imp_end_discussion"){

if(!state.endDiscussionVotes.includes(interaction.user.id)){
state.endDiscussionVotes.push(interaction.user.id);
}

const needed = Math.floor(state.players.length/2)+1;

if(state.endDiscussionVotes.length < needed){

return interaction.reply({
content:`Votes: ${state.endDiscussionVotes.length}/${needed}`,
ephemeral:true
});

}

const row = new ActionRowBuilder();

for(const p of state.players){

const user = await interaction.client.users.fetch(p);

row.addComponents(
new ButtonBuilder()
.setCustomId(`imp_vote_${p}`)
.setLabel(`Vote ${user.username}`)
.setStyle(ButtonStyle.Secondary)
);

}

row.addComponents(
new ButtonBuilder()
.setCustomId("imp_force_end_vote")
.setLabel("End Vote")
.setStyle(ButtonStyle.Danger)
);

await interaction.channel.send({
embeds:[createEmbed(
"🗳 Voting Phase",
"Vote the impostor."
)],
components:[row]
});

}

/* VOTE */

if(id.startsWith("imp_vote_")){

if(state.votes[interaction.user.id]){
return interaction.reply({content:"You already voted.",ephemeral:true});
}

const voted = id.split("_")[2];
state.votes[interaction.user.id] = voted;

await interaction.reply({
content:`You voted <@${voted}>`,
ephemeral:true
});

if(Object.keys(state.votes).length === state.players.length){
finishGame(interaction,state);
}

}

/* FORCE END VOTE */

if(id==="imp_force_end_vote"){

if(interaction.user.id!==state.host){
return interaction.reply({content:"Only host can end vote.",ephemeral:true});
}

finishGame(interaction,state);

}

}

};

/* FINISH GAME */

async function finishGame(interaction,state){

const votes = {};

Object.values(state.votes).forEach(v=>{
votes[v]=(votes[v]||0)+1;
});

let voted = Object.keys(votes).sort((a,b)=>votes[b]-votes[a])[0];

let results="";

for(const voter in state.votes){
results+=`<@${voter}> → <@${state.votes[voter]}>\n`;
}

const mainChannel = interaction.channel.parent;

const playersPing = state.players.map(p=>`<@${p}>`).join(" ");

if(voted===state.impostor){

await mainChannel.send({
content:playersPing,
embeds:[createEmbed(
"🎉 Crew Wins",
`${results}

Impostor was <@${state.impostor}>`
)]
});

}else{

await mainChannel.send({
content:playersPing,
embeds:[createEmbed(
"💀 Impostor Wins",
`${results}

Real impostor: <@${state.impostor}>`
)]
});

}

try{
await interaction.channel.delete();
}catch{}

games.delete(mainChannel.id);

}
