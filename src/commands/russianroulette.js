const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");

module.exports = {

data: new SlashCommandBuilder()
.setName("russianroulette")
.setDescription("Challenge someone to Russian Roulette")
.addUserOption(option =>
option.setName("opponent")
.setDescription("Player to challenge")
.setRequired(true)
),

async execute(interaction){

const opponent = interaction.options.getUser("opponent");

if(opponent.bot){
return interaction.reply({
content:"You cannot challenge a bot."
});
}

if(opponent.id === interaction.user.id){
return interaction.reply({
content:"You cannot challenge yourself."
});
}

if(games.get(interaction.channelId)){
return interaction.reply({
content:"A game is already running in this channel."
});
}

const embed = {
title:"🔫 Russian Roulette",
description:`${interaction.user} challenged ${opponent}

━━━━━━━━━━━━━━
Rules
━━━━━━━━━━━━━━

• The revolver has 6 chambers
• One bullet is loaded
• Players take turns pulling the trigger
• Each turn the chamber advances
• You can spin the chamber to reshuffle the bullet
• If the gun fires → you lose`
};

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId(`rr_accept_${interaction.user.id}_${opponent.id}`)
.setLabel("Accept")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId(`rr_decline_${interaction.user.id}_${opponent.id}`)
.setLabel("Decline")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId(`rr_cancel_${interaction.user.id}_${opponent.id}`)
.setLabel("Cancel")
.setStyle(ButtonStyle.Danger)

);

await interaction.reply({
embeds:[embed],
components:[row]
});

}

};
