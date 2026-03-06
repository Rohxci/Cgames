const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const createEmbed = require("../utils/embed");
const games = require("../systems/games");

const FAKE_WORDS = [
"BANANA",
"GO",
"FIRE",
"NOW",
"WAIT"
];

function drawRow(enabled){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("qd_draw")
.setLabel("DRAW")
.setStyle(ButtonStyle.Primary)
.setDisabled(!enabled),

new ButtonBuilder()
.setCustomId("qd_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)

);

}

module.exports = {

match(interaction){

if(!interaction.isButton()) return false;

const id = interaction.customId;

return (
id.startsWith("qd_accept_") ||
id.startsWith("qd_decline_") ||
id.startsWith("qd_cancel_") ||
id === "qd_draw" ||
id === "qd_surrender"
);

},

async run(interaction){

const id = interaction.customId;

/* ACCEPT */

if(id.startsWith("qd_accept_")){

const parts = id.split("_");

const p1 = parts[2];
const p2 = parts[3];

if(interaction.user.id !== p2){

return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});

}

games.create(interaction.channelId,{
type:"quickdraw",
player1:p1,
player2:p2,
phase:"waiting",
drawTime:null
});

await interaction.update({

embeds:[
createEmbed(
"🔫 QuickDraw",
`<@${p1}> vs <@${p2}>

Get ready...
Wait for the signal.`
)
],
components:[drawRow(false)]

});

/* random wait */

setTimeout(async () => {

const game = games.get(interaction.channelId);
if(!game) return;

/* fake signal chance */

if(Math.random() < 0.5){

const fake = FAKE_WORDS[Math.floor(Math.random()*FAKE_WORDS.length)];

await interaction.message.edit({

embeds:[
createEmbed(
"🔫 QuickDraw",
`<@${p1}> vs <@${p2}>

⚠️ ${fake}`
)
],
components:[drawRow(true)]

});

setTimeout(async () => {

const g = games.get(interaction.channelId);
if(!g) return;

g.phase = "draw";
g.drawTime = Date.now();

await interaction.message.edit({

embeds:[
createEmbed(
"🔫 QuickDraw",
`<@${p1}> vs <@${p2}>

**DRAW!**`
)
],
components:[drawRow(true)]

});

},2000);

}else{

game.phase = "draw";
game.drawTime = Date.now();

await interaction.message.edit({

embeds:[
createEmbed(
"🔫 QuickDraw",
`<@${p1}> vs <@${p2}>

**DRAW!**`
)
],
components:[drawRow(true)]

});

}

},2000 + Math.random()*3000);

return;

}

/* DECLINE */

if(id.startsWith("qd_decline_")){

const p2 = id.split("_")[3];

if(interaction.user.id !== p2){

return interaction.reply({
content:"Only the challenged player can decline.",
ephemeral:true
});

}

await interaction.update({

embeds:[createEmbed("❌ Challenge Declined","The challenge was declined.")],
components:[]

});

return;

}

/* CANCEL */

if(id.startsWith("qd_cancel_")){

const p1 = id.split("_")[2];

if(interaction.user.id !== p1){

return interaction.reply({
content:"Only the challenger can cancel.",
ephemeral:true
});

}

await interaction.update({

embeds:[createEmbed("❌ Challenge Cancelled","The challenge was cancelled.")],
components:[]

});

return;

}

/* SURRENDER */

if(id === "qd_surrender"){

const game = games.get(interaction.channelId);
if(!game) return;

if(interaction.user.id !== game.player1 &&
interaction.user.id !== game.player2){

return interaction.reply({
content:"Only players can surrender.",
ephemeral:true
});

}

const winner =
interaction.user.id === game.player1
? game.player2
: game.player1;

games.delete(interaction.channelId);

await interaction.update({

embeds:[
createEmbed(
"🏆 QuickDraw",
`Winner: <@${winner}> (opponent surrendered)`
)
],
components:[drawRow(false)]

});

return;

}

/* DRAW CLICK */

if(id === "qd_draw"){

const game = games.get(interaction.channelId);
if(!game) return;

if(interaction.user.id !== game.player1 &&
interaction.user.id !== game.player2){

return interaction.reply({
content:"You are not part of this match.",
ephemeral:true
});

}

if(game.phase !== "draw"){

const winner =
interaction.user.id === game.player1
? game.player2
: game.player1;

games.delete(interaction.channelId);

return interaction.update({

embeds:[
createEmbed(
"❌ Too Early!",
`Winner: <@${winner}>`
)
],
components:[drawRow(false)]

});

}

const reaction = Date.now() - game.drawTime;

games.delete(interaction.channelId);

await interaction.update({

embeds:[
createEmbed(
"🏆 QuickDraw",
`Winner: <@${interaction.user.id}>

Reaction time: **${reaction} ms**`
)
],
components:[drawRow(false)]

});

}

}

};
