const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");

/* BUTTON ROW */

function gameButtons(){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("rr_trigger")
.setLabel("Pull Trigger")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId("rr_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Secondary)

);

}

/* EMBED */

function gameEmbed(state){

return {
title:"🔫 Russian Roulette",
description:`<@${state.player1}> vs <@${state.player2}>

Chamber: ${state.chamber} / 6

Turn: <@${state.turn}>`
};

}

module.exports = {

match(interaction){
if(!interaction.isButton()) return false;
return interaction.customId.startsWith("rr_");
},

async run(interaction){

const id = interaction.customId;

/* ACCEPT */

if(id.startsWith("rr_accept_")){

const parts = id.split("_");

const p1 = parts[2];
const p2 = parts[3];

if(interaction.user.id !== p2){
return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});
}

const bullet = Math.floor(Math.random()*6)+1;

games.create(interaction.channelId,{
type:"roulette",
player1:p1,
player2:p2,
turn:p1,
bullet,
chamber:1
});

const state = games.get(interaction.channelId);

await interaction.update({
embeds:[gameEmbed(state)],
components:[gameButtons()]
});

return;
}

/* DECLINE */

if(id.startsWith("rr_decline_")){

const p2 = id.split("_")[3];

if(interaction.user.id !== p2){
return interaction.reply({
content:"Only the challenged player can decline.",
ephemeral:true
});
}

await interaction.update({
content:"Challenge declined.",
embeds:[],
components:[]
});

return;
}

/* CANCEL */

if(id.startsWith("rr_cancel_")){

const p1 = id.split("_")[2];

if(interaction.user.id !== p1){
return interaction.reply({
content:"Only the challenger can cancel.",
ephemeral:true
});
}

await interaction.update({
content:"Challenge cancelled.",
embeds:[],
components:[]
});

return;
}

/* GAME ACTIONS */

const game = games.get(interaction.channelId);
if(!game) return;

if(interaction.user.id !== game.turn){
return interaction.reply({
content:"Not your turn.",
ephemeral:true
});
}

/* TRIGGER */

if(id === "rr_trigger"){

if(game.chamber === game.bullet){

const winner =
interaction.user.id === game.player1
? game.player2
: game.player1;

games.delete(interaction.channelId);

await interaction.update({
embeds:[{
title:"🔫 Russian Roulette",
description:`💥 **BANG**

Winner: <@${winner}>`
}],
components:[]
});

return;
}

game.chamber++;

game.turn =
interaction.user.id === game.player1
? game.player2
: game.player1;

await interaction.update({
embeds:[{
title:"🔫 Russian Roulette",
description:`*click*

Safe.

Chamber: ${game.chamber} / 6

Turn: <@${game.turn}>`
}],
components:[gameButtons()]
});

return;
}

/* SURRENDER */

if(id === "rr_surrender"){

const winner =
interaction.user.id === game.player1
? game.player2
: game.player1;

games.delete(interaction.channelId);

await interaction.update({
embeds:[{
title:"🔫 Russian Roulette",
description:`${interaction.user} surrendered.

Winner: <@${winner}>`
}],
components:[]
});

}

}

};
