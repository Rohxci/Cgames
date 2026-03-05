const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 3;

function pickRandom(arr) {
return arr[Math.floor(Math.random() * arr.length)];
}

function lobbyEmbed(state){

const players = state.players.map(p=>`• <@${p}>`).join("\n") || "—";

return createEmbed(
"🎭 Impostor Lobby",
`Players: ${state.players.length}/${MAX_PLAYERS}

Host: <@${state.hostId}>

Rules
• 1 impostor
• Crew gets the secret word
• Impostor only sees the category
• Discuss in chat
• Vote to find the impostor

${players}`
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

module.exports={

match(interaction){

const id = interaction.customId;
return typeof id === "string" && id.startsWith("imp_");

},

async run(interaction){

const state = games.get(interaction.channelId);
if(!state) return;

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

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("🎭 Game cancelled","")],
components:[]
});

return;

}

/* START GAME */

if(id==="imp_start"){

if(state.players.length < MIN_PLAYERS){

return interaction.reply({
content:"Need at least 3 players.",
ephemeral:true
});

}

state.impostor = pickRandom(state.players);

await interaction.update({

embeds:[createEmbed(
"🎭 Roles",
"Everyone click **Reveal Role** to see your role."
)],

components:[
new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("imp_reveal")
.setLabel("Reveal Role")
.setStyle(ButtonStyle.Success)

)
]

});

return;

}

/* REVEAL ROLE */

if(id==="imp_reveal"){

if(interaction.user.id === state.impostor){

await interaction.reply({
embeds:[createEmbed(
"🎭 Your Role",
"You are the **IMPOSTOR**"
)],
ephemeral:true
});

}else{

await interaction.reply({
embeds:[createEmbed(
"🎭 Your Role",
"You are **CREW**"
)],
ephemeral:true
});

}

state.revealed = (state.revealed || 0) + 1;

if(state.revealed === state.players.length){

await interaction.message.edit({

embeds:[createEmbed(
"⏳ Discussion phase",
"Discuss in chat to find the impostor.

Host can end discussion anytime."
)],

components:[
new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("imp_vote_start")
.setLabel("Start Vote")
.setStyle(ButtonStyle.Primary)

)
]

});

}

return;

}

/* START VOTE */

if(id==="imp_vote_start"){

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

await interaction.channel.send({

embeds:[createEmbed(
"🗳 Voting phase",
"Vote who you think is the impostor."
)],

components:[
new ActionRowBuilder().addComponents(menu)
]

});

return interaction.deferUpdate();

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

embeds:[createEmbed(
"🎭 Results",
`Impostor: <@${state.impostor}>

${crewWin ? "✅ Crew wins" : "😈 Impostor wins"}`
)]

});

}

}

}

};
