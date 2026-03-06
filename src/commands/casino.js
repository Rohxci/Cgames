const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;
const STARTING_FISH = 15;

function lobbyEmbed(state){

const players = state.players
.map(id => `• <@${id}>`)
.join("\n");

return {
title: "🎰 CASINO WHEEL",
description:
`🎰 **Host**
<@${state.hostId}>

🐟 **Starting Fish**
${STARTING_FISH} 🐟

👥 **Players**
${players}

Players: ${state.players.length} / ${MAX_PLAYERS}
Minimum: ${MIN_PLAYERS}

Spin the wheel and survive the casino.
Last player with fish wins.`
};

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

module.exports = {

data: new SlashCommandBuilder()
.setName("casino")
.setDescription("Start a Casino Wheel game"),

async execute(interaction){

const channelId = interaction.channelId;

/* prevent multiple games */

if(games.get(channelId)){

return interaction.reply({
content: "A game is already running in this channel.",
ephemeral: true
});

}

/* create game state */

const state = {

type: "casino",

hostId: interaction.user.id,

players: [interaction.user.id],

alive: [],

fish: {},

turn: 0,

events: [],

threadId: null,

panelMessageId: null,

phase: "lobby"

};

games.create(channelId, state);

/* send lobby */

await interaction.reply({

embeds: [lobbyEmbed(state)],
components: lobbyButtons()

});

}

};
