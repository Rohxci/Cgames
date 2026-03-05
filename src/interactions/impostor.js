const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");
const channelCheck = require("../utils/channelCheck");

const MAX_PLAYERS = 10;

function lobbyEmbed(state){

const players = state.players.map(p=>`• <@${p}>`).join("\n");

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

module.exports = {

data: new SlashCommandBuilder()
.setName("impostor")
.setDescription("Start an Impostor game"),

async execute(interaction){

if(!channelCheck(interaction)) return;

/* prevent multiple games */

if(games.get(interaction.channelId)){

return interaction.reply({
content:"A game is already running in this channel.",
ephemeral:true
});

}

const state = {

type:"impostor",
hostId: interaction.user.id,
players:[interaction.user.id],
phase:"lobby"

};

games.create(interaction.channelId,state);

await interaction.reply({

embeds:[lobbyEmbed(state)],
components:lobbyButtons()

});

}

};const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");
const channelCheck = require("../utils/channelCheck");

const MAX_PLAYERS = 10;

function lobbyEmbed(state){

const players = state.players.map(p=>`• <@${p}>`).join("\n");

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

module.exports = {

data: new SlashCommandBuilder()
.setName("impostor")
.setDescription("Start an Impostor game"),

async execute(interaction){

if(!channelCheck(interaction)) return;

/* prevent multiple games */

if(games.get(interaction.channelId)){

return interaction.reply({
content:"A game is already running in this channel.",
ephemeral:true
});

}

const state = {

type:"impostor",
hostId: interaction.user.id,
players:[interaction.user.id],
phase:"lobby"

};

games.create(interaction.channelId,state);

await interaction.reply({

embeds:[lobbyEmbed(state)],
components:lobbyButtons()

});

}

};
