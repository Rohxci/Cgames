const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");
const channelCheck = require("../utils/channelCheck");

module.exports = {

data: new SlashCommandBuilder()
.setName("gunslinger")
.setDescription("Challenge someone to a gunslinger duel")
.addUserOption(option =>
option
.setName("user")
.setDescription("Player to duel")
.setRequired(true)
),

async execute(interaction){

if(!channelCheck(interaction)) return;

const opponent = interaction.options.getUser("user");

if(opponent.id === interaction.user.id){
return interaction.reply({
content:"You cannot challenge yourself.",
ephemeral:true
});
}

if(opponent.bot){
return interaction.reply({
content:"You cannot challenge a bot.",
ephemeral:true
});
}

if(games.get(interaction.channelId)){
return interaction.reply({
content:"A game is already running in this channel.",
ephemeral:true
});
}

const state = {
type:"gunslinger",
players:[interaction.user.id, opponent.id],
lives:{
[interaction.user.id]:5,
[opponent.id]:5
},
ammo:{
[interaction.user.id]:0,
[opponent.id]:0
},
choices:{}
};

games.create(interaction.channelId,state);

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("gunslinger_accept")
.setLabel("Accept")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("gunslinger_decline")
.setLabel("Decline")
.setStyle(ButtonStyle.Danger)

);

await interaction.reply({

embeds:[{

title:"🤠 Gunslinger Duel Challenge",

description:`<@${interaction.user.id}> challenged <@${opponent.id}> to a duel!

⚔️ **Game Rules**

Each player starts with **5 lives ❤️** and **0 ammo 🔫**

**Attack**
Shoot your opponent. Requires **1 ammo**.

**Defend**
Blocks an incoming attack.

**Reload**
Gain **1 ammo** but you are vulnerable.

**Surrender**
Give up the duel and your opponent wins.

🎯 The duel continues in rounds until one player's **lives reach 0**.`

}],

components:[row]

});

}

};
