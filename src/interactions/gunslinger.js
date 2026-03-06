const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games=require("../systems/games");

function moveButtons(){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("gun_attack")
.setLabel("Attack")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId("gun_defend")
.setLabel("Defend")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("gun_reload")
.setLabel("Reload")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("gun_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)

);

}

module.exports={

match(i){
return i.isButton() && i.customId.startsWith("gun_");
},

async run(interaction){

const id=interaction.customId;

const game=games.get(interaction.channelId);
if(!game) return;

const [p1,p2]=game.players;

/* SURRENDER */

if(id==="gun_surrender"){

if(interaction.user.id!==p1 && interaction.user.id!==p2){
return interaction.reply({
content:"Only players can surrender.",
ephemeral:true
});
}

const winner=
interaction.user.id===p1?p2:p1;

games.delete(interaction.channelId);

await interaction.update({
content:`🏳️ Winner: <@${winner}>`,
components:[]
});

return;

}

/* MOVE */

if(![p1,p2].includes(interaction.user.id)){
return interaction.reply({
content:"You are not playing.",
ephemeral:true
});
}

if(game.choices[interaction.user.id]){
return interaction.reply({
content:"You already chose.",
ephemeral:true
});
}

game.choices[interaction.user.id]=id;

await interaction.reply({
content:"Move locked.",
ephemeral:true
});

if(Object.keys(game.choices).length<2) return;

const c1=game.choices[p1];
const c2=game.choices[p2];

if(c1==="gun_reload") game.ammo[p1]++;
if(c2==="gun_reload") game.ammo[p2]++;

if(c1==="gun_attack" && game.ammo[p1]>0){
game.ammo[p1]--;
if(c2!=="gun_defend") game.lives[p2]--;
}

if(c2==="gun_attack" && game.ammo[p2]>0){
game.ammo[p2]--;
if(c1!=="gun_defend") game.lives[p1]--;
}

game.choices={};

/* WIN */

if(game.lives[p1]<=0 || game.lives[p2]<=0){

const winner=game.lives[p1]>0?p1:p2;

games.delete(interaction.channelId);

await interaction.channel.send({
content:`💀 Winner: <@${winner}>`
});

return;

}

await interaction.channel.send({
content:`❤️ ${p1}: ${game.lives[p1]} | ${p2}: ${game.lives[p2]}`
});

}

};
