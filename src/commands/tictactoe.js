const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const channelCheck = require("../utils/channelCheck");
const createEmbed = require("../utils/embed");
const games = require("../systems/games");

module.exports = {

data: new SlashCommandBuilder()
.setName("tictactoe")
.setDescription("Challenge someone to TicTacToe")
.addUserOption(option =>
option
.setName("opponent")
.setDescription("Player to challenge")
.setRequired(true)
),

async execute(interaction){

if(!channelCheck(interaction)) return;

const opponent = interaction.options.getUser("opponent");

/* prevent bots */

if(opponent.bot){
return interaction.reply({
embeds:[
createEmbed(
"❌ Invalid Opponent",
"You cannot challenge a bot."
)
]
});
}

/* prevent self */

if(opponent.id === interaction.user.id){
return interaction.reply({
embeds:[
createEmbed(
"❌ Invalid Opponent",
"You cannot challenge yourself."
)
]
});
}

/* only one game per channel */

if(games.get(interaction.channelId)){
return interaction.reply({
embeds:[
createEmbed(
"⚠️ Game Running",
"A game is already running in this channel."
)
],
ephemeral:true
});
}

/* embed */

const embed = createEmbed(

"🎮 TicTacToe Challenge",

`${interaction.user} challenged ${opponent}

**How to play**
• Players take turns placing symbols  
• ❌ vs ⭕  
• Align **3 symbols in a row** to win

Accept the challenge to start!`

);

/* buttons */

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId(`ttt_accept_${interaction.user.id}_${opponent.id}`)
.setLabel("Accept")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId(`ttt_decline_${interaction.user.id}_${opponent.id}`)
.setLabel("Decline")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId(`ttt_cancel_${interaction.user.id}_${opponent.id}`)
.setLabel("Cancel")
.setStyle(ButtonStyle.Secondary)

);

/* send */

await interaction.reply({
embeds:[embed],
components:[row]
});

}

};
