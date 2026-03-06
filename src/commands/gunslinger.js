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
.setName("gunslinger")
.setDescription("Challenge someone to a Gunslinger duel")
.addUserOption(option =>
option
.setName("opponent")
.setDescription("Player to challenge")
.setRequired(true)
),

async execute(interaction){

if(!channelCheck(interaction)) return;

const opponent = interaction.options.getUser("opponent");

if(opponent.bot){
return interaction.reply({
embeds:[createEmbed("❌ Invalid Opponent","You cannot challenge a bot.")]
});
}

if(opponent.id === interaction.user.id){
return interaction.reply({
embeds:[createEmbed("❌ Invalid Opponent","You cannot challenge yourself.")]
});
}

if(games.get(interaction.channelId)){
return interaction.reply({
embeds:[createEmbed("⚠️ Game Running","A game is already running in this channel.")],
ephemeral:true
});
}

const embed = createEmbed(

"🤠 Gunslinger Duel Challenge",

`${interaction.user} challenged ${opponent}

**How to play**

Each round choose a move:

🔫 Attack — use 1 ammo to deal damage  
🛡 Defend — block attacks  
🔄 Reload — gain 1 ammo (max 5)

Both players choose secretly.

Last player standing wins.`

);

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId(`gs_accept_${interaction.user.id}_${opponent.id}`)
.setLabel("Accept")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId(`gs_decline_${interaction.user.id}_${opponent.id}`)
.setLabel("Decline")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId(`gs_cancel_${interaction.user.id}_${opponent.id}`)
.setLabel("Cancel")
.setStyle(ButtonStyle.Secondary)

);

await interaction.reply({
embeds:[embed],
components:[row]
});

}

};
