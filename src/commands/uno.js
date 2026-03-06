const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");

module.exports = {

data: new SlashCommandBuilder()
.setName("uno")
.setDescription("Challenge someone to UNO")
.addUserOption(option =>
option.setName("opponent")
.setDescription("Player to challenge")
.setRequired(true)
),

async execute(interaction){

const opponent = interaction.options.getUser("opponent");

if(opponent.bot){
return interaction.reply({ content:"You cannot challenge a bot." });
}

if(opponent.id === interaction.user.id){
return interaction.reply({ content:"You cannot challenge yourself." });
}

if(games.get(interaction.channelId)){
return interaction.reply({ content:"A game is already running in this channel." });
}

const embed = {
title:"🃏 UNO Duel",
description:`${interaction.user} challenged ${opponent}

Rules
• Each player starts with 7 cards
• Match color or number
• Skip skips opponent turn
• +2 makes opponent draw
• Wild lets you choose color
• First player with no cards wins`
};

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId(`uno_accept_${interaction.user.id}_${opponent.id}`)
.setLabel("Accept")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId(`uno_decline_${interaction.user.id}_${opponent.id}`)
.setLabel("Decline")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId(`uno_cancel_${interaction.user.id}_${opponent.id}`)
.setLabel("Cancel")
.setStyle(ButtonStyle.Danger)

);

await interaction.reply({
embeds:[embed],
components:[row]
});

}

};
