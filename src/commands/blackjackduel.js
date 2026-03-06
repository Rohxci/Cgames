const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

const MAX_PLAYERS = 6;

function lobbyEmbed(state){

return createEmbed(
"♠️ Blackjack Table",
`Host: <@${state.host}>

Players (${state.players.length}/${MAX_PLAYERS})
${state.players.map(p=>`• <@${p}>`).join("\n")}

Minimum players: 2
Maximum players: 6

Rules

• Beat the dealer by getting closer to 21
• Number cards keep their value
• J, Q, K = 10
• A = 1 or 11
• Hit → draw a card
• Stand → stop drawing
• Surrender → give up the round
• If you go over 21 you bust
• Dealer draws until reaching 17
• Highest value under 21 wins`
);

}

function lobbyButtons(){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("bjd_join")
.setLabel("Join")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("bjd_leave")
.setLabel("Leave")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("bjd_start")
.setLabel("Start")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("bjd_cancel")
.setLabel("Cancel")
.setStyle(ButtonStyle.Danger)

);

}

module.exports={

data:new SlashCommandBuilder()
.setName("blackjackduel")
.setDescription("Start a Blackjack table"),

async execute(interaction){

if(games.get(interaction.channelId)){
return interaction.reply({
embeds:[createEmbed("❌ Game running","A game is already running in this channel.")]
});
}

const state={
type:"blackjackduel",
host:interaction.user.id,
players:[interaction.user.id],
round:1
};

games.create(interaction.channelId,state);

await interaction.reply({
embeds:[lobbyEmbed(state)],
components:[lobbyButtons()]
});

}

};
