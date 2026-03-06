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
.setName("quickdraw")
.setDescription("Challenge someone to a QuickDraw duel")
.addUserOption(option =>
option
.setName("opponent")
.setDescription("Player to challenge")
.setRequired(true)
),

async execute(interaction){

if(!channelCheck(interaction)) return;

const opponent = interaction.options.getUser("opponent");

/* prevent bot */

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

/* one game per channel */

if(games.exists(interaction.channelId)){

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

"🔫 QuickDraw Challenge",

`${interaction.user} challenged ${opponent}

**How to play**
Wait for the signal.

Press **DRAW** when it appears.

⚠️ Sometimes fake signals appear.
If you click too early, you lose.`

);

/* buttons */

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId(`qd_accept_${interaction.user.id}_${opponent.id}`)
.setLabel("Accept")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId(`qd_decline_${interaction.user.id}_${opponent.id}`)
.setLabel("Decline")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId(`qd_cancel_${interaction.user.id}_${opponent.id}`)
.setLabel("Cancel")
.setStyle(ButtonStyle.Secondary)

);

await interaction.reply({
embeds:[embed],
components:[row]
});

}

};
