const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");
const channelCheck = require("../utils/channelCheck");

module.exports = {

data: new SlashCommandBuilder()
.setName("impostor")
.setDescription("Start an Impostor party game"),

async execute(interaction){

if(!channelCheck(interaction)) return;

if(games.get(interaction.channelId)){
return interaction.reply({
embeds:[createEmbed("❌ Game running","A game is already running in this channel.")],
ephemeral:true
});
}

const host = interaction.user.id;

games.create(interaction.channelId,{
type:"impostor",
host,
players:[host],
phase:"lobby",
thread:null
});

const embed = createEmbed(
"🎭 Impostor Lobby",
`Host: <@${host}>

Players: 1

Join the game!`
);

const row = new ActionRowBuilder().addComponents(

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

);

await interaction.reply({
embeds:[embed],
components:[row]
});

}

};
