const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const createEmbed=require("../utils/embed");
const games=require("../systems/games");

function drawRow(enabled){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("qd_draw")
.setLabel("DRAW!")
.setStyle(ButtonStyle.Primary)
.setDisabled(!enabled),

new ButtonBuilder()
.setCustomId("qd_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)

);

}

module.exports={

match(i){
return i.isButton() && i.customId.startsWith("qd_");
},

async run(interaction){

const id=interaction.customId;

/* ACCEPT */

if(id.startsWith("qd_accept_")){

const parts=id.split("_");
const p1=parts[2];
const p2=parts[3];

if(interaction.user.id!==p2){
return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});
}

games.create(interaction.channelId,{
player1:p1,
player2:p2,
phase:"waiting"
});

await interaction.update({
embeds:[createEmbed(
"🔫 QuickDraw",
`<@${p1}> vs <@${p2}>

Wait for **DRAW!**
First player to click wins.`
)],
components:[drawRow(false)]
});

const game=games.get(interaction.channelId);

setTimeout(async ()=>{

const g=games.get(interaction.channelId);
if(!g) return;

g.phase="draw";

await interaction.message.edit({
embeds:[createEmbed(
"🔫 QuickDraw",
`<@${p1}> vs <@${p2}>

**DRAW! CLICK NOW!**`
)],
components:[drawRow(true)]
});

},2000+Math.random()*3000);

return;

}

/* SURRENDER */

if(id==="qd_surrender"){

const game=games.get(interaction.channelId);
if(!game) return;

if(interaction.user.id!==game.player1 &&
interaction.user.id!==game.player2){
return interaction.reply({
content:"Only players can surrender.",
ephemeral:true
});
}

const winner=
interaction.user.id===game.player1
?game.player2
:game.player1;

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed(
"🏳️ Surrender",
`Winner: <@${winner}>`
)],
components:[]
});

return;

}

/* DRAW */

if(id==="qd_draw"){

const game=games.get(interaction.channelId);
if(!game) return;

if(interaction.user.id!==game.player1 &&
interaction.user.id!==game.player2){
return interaction.reply({
content:"You are not in this match.",
ephemeral:true
});
}

if(game.phase!=="draw"){
return interaction.reply({
content:"Too early.",
ephemeral:true
});
}

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed(
"🏆 QuickDraw",
`Winner: <@${interaction.user.id}>`
)],
components:[]
});

}

}

};
