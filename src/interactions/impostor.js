const fs = require("fs");
const path = require("path");

const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder
} = require("discord.js");

const createEmbed = require("../utils/embed");
const games = require("../systems/games");

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;

const WORDS_PATH = path.join(__dirname, "..", "data", "impostor_words.json");

function pickRandom(arr){
return arr[Math.floor(Math.random()*arr.length)];
}

function loadWords(){
const raw = fs.readFileSync(WORDS_PATH,"utf8");
return JSON.parse(raw);
}

function pickWord(){
const words = loadWords();
const categories = Object.keys(words);
const category = pickRandom(categories);
const word = pickRandom(words[category]);
return {category,word};
}

function lobbyEmbed(state){
const players = state.players.map(p=>`• <@${p}>`).join("\n") || "—";

return createEmbed(
"🎭 Impostor Lobby",
[
`Players: ${state.players.length}/${MAX_PLAYERS}`,
`Host: <@${state.hostId}>`,
"",
"Rules",
"• 1 impostor",
"• Crew receives the secret word",
"• Impostor only sees the category",
"• Discuss freely in chat",
"• Vote to find the impostor",
"",
players
].join("\n")
);
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
.setLabel("Start Game")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("imp_cancel")
.setLabel("Cancel")
.setStyle(ButtonStyle.Danger)

)
];
}

function revealButtons(){
return[
new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("imp_reveal")
.setLabel("Reveal Role")
.setStyle(ButtonStyle.Success)

)
];
}

function durationVote(state){

const options=[
{label:"30 seconds",value:"30"},
{label:"60 seconds",value:"60"},
{label:"90 seconds",value:"90"},
{label:"120 seconds",value:"120"}
];

const menu = new StringSelectMenuBuilder()
.setCustomId("imp_time_vote")
.setPlaceholder("Select discussion time")
.addOptions(options);

return[
new ActionRowBuilder().addComponents(menu)
];
}

async function voteMenu(interaction,state){

const options=[];

for(const id of state.players){

const member = await interaction.guild.members.fetch(id).catch(()=>null);
const name = member ? member.displayName : id;

options.push({
label:name.slice(0,100),
value:id
});

}

const menu=new StringSelectMenuBuilder()
.setCustomId("imp_vote")
.setPlaceholder("Vote the impostor")
.addOptions(options);

return[
new ActionRowBuilder().addComponents(menu)
];
}

module.exports={

match(interaction){

return interaction.customId?.startsWith("imp_");

},

async run(interaction){

const state = games.get(interaction.channelId);
if(!state)return;

const id = interaction.customId;

/* JOIN */

if(id==="imp_join"){

if(state.players.length>=MAX_PLAYERS)
return interaction.reply({content:"Lobby full",ephemeral:true});

if(!state.players.includes(interaction.user.id))
state.players.push(interaction.user.id);

await interaction.update({
embeds:[lobbyEmbed(state)],
components:lobbyButtons()
});

return;
}

/* LEAVE */

if(id==="imp_leave"){

state.players=state.players.filter(p=>p!==interaction.user.id);

await interaction.update({
embeds:[lobbyEmbed(state)],
components:lobbyButtons()
});

return;
}

/* CANCEL */

if(id==="imp_cancel"){

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("🎭 Game cancelled","")],
components:[]
});

return;
}

/* START */

if(id==="imp_start"){

if(state.players.length<MIN_PLAYERS)
return interaction.reply({content:"Need at least 3 players",ephemeral:true});

const {category,word}=pickWord();

state.category=category;
state.word=word;
state.impostorId=pickRandom(state.players);

await interaction.update({

embeds:[createEmbed(
"🎭 Roles",
`Category: **${category}**

Everyone click **Reveal Role**`
)],

components:revealButtons()

});

return;
}

/* REVEAL */

if(id==="imp_reveal"){

if(interaction.user.id===state.impostorId){

await interaction.reply({
embeds:[createEmbed("🎭 Your Role",`You are the **IMPOSTOR**

Category: ${state.category}`)],
ephemeral:true
});

}else{

await interaction.reply({
embeds:[createEmbed("🎭 Your Role",`You are **CREW**

Category: ${state.category}
Word: **${state.word}**`)],
ephemeral:true
});

}

state.revealed=(state.revealed||0)+1;

if(state.revealed===state.players.length){

await interaction.message.edit({

embeds:[createEmbed(
"⏳ Vote discussion time",
"Players vote how long the discussion lasts"
)],

components:durationVote(state)

});

}

return;
}

/* TIME VOTE */

if(interaction.isStringSelectMenu() && id==="imp_time_vote"){

state.timeVotes=state.timeVotes||{};
state.timeVotes[interaction.user.id]=parseInt(interaction.values[0]);

await interaction.reply({content:"Vote submitted",ephemeral:true});

if(Object.keys(state.timeVotes).length===state.players.length){

const counts={};

Object.values(state.timeVotes).forEach(v=>{
counts[v]=(counts[v]||0)+1;
});

let max=0;
let selected=60;

for(const t in counts){

if(counts[t]>max){
max=counts[t];
selected=parseInt(t);
}

}

state.duration=selected;

await interaction.message.edit({

embeds:[createEmbed(
"🎭 Discussion started",
`Category: **${state.category}**

Time: **${selected} seconds**

Discuss in chat to find the impostor.`
)],

components:[
new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("imp_end")
.setLabel("End Discussion")
.setStyle(ButtonStyle.Danger)

)
]

});

setTimeout(async()=>{

if(!games.get(interaction.channelId))return;

const voteComponents=await voteMenu(interaction,state);

await interaction.channel.send({
embeds:[createEmbed("🗳 Voting started","Vote the impostor")],
components:voteComponents
});

},selected*1000);

}

return;
}

/* END DISCUSSION */

if(id==="imp_end"){

const voteComponents=await voteMenu(interaction,state);

await interaction.channel.send({
embeds:[createEmbed("🗳 Voting started","Vote the impostor")],
components:voteComponents
});

return;
}

/* VOTE */

if(interaction.isStringSelectMenu() && id==="imp_vote"){

state.votes=state.votes||{};
state.votes[interaction.user.id]=interaction.values[0];

await interaction.reply({content:"Vote registered",ephemeral:true});

if(Object.keys(state.votes).length===state.players.length){

const counts={};

Object.values(state.votes).forEach(v=>{
counts[v]=(counts[v]||0)+1;
});

let max=0;
let voted=null;

for(const k in counts){
if(counts[k]>max){
max=counts[k];
voted=k;
}
}

const crewWin=voted===state.impostorId;

games.delete(interaction.channelId);

await interaction.channel.send({

embeds:[createEmbed(
"🎭 Results",
`Word: **${state.word}**

Impostor: <@${state.impostorId}>

${crewWin?"✅ Crew wins":"😈 Impostor wins"}`
)]

});

}

}

}

};
