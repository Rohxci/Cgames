const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");

function moveButtons(){
return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("gunslinger_attack")
.setLabel("Attack")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId("gunslinger_defend")
.setLabel("Defend")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("gunslinger_reload")
.setLabel("Reload")
.setStyle(ButtonStyle.Secondary)

);
}

module.exports = {

match(interaction){
return interaction.customId?.startsWith("gunslinger_");
},

async run(interaction){

const state = games.get(interaction.channelId);
if(!state || state.type !== "gunslinger") return;

const id = interaction.customId;

const [p1,p2] = state.players;

/* ACCEPT */

if(id === "gunslinger_accept"){

if(interaction.user.id !== p2){
return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});
}

await interaction.update({
embeds:[{
title:"🤠 Duel Started",
description:`<@${p1}> vs <@${p2}>

❤️ Lives: 5
🔫 Ammo: 0

Choose your move.`
}],
components:[moveButtons()]
});

return;

}

/* DECLINE */

if(id === "gunslinger_decline"){

games.delete(interaction.channelId);

await interaction.update({
content:"Duel declined.",
embeds:[],
components:[]
});

return;

}

/* MOVES */

if(!state.players.includes(interaction.user.id)){
return interaction.reply({
content:"You are not part of this duel.",
ephemeral:true
});
}

if(state.choices[interaction.user.id]){
return interaction.reply({
content:"You already chose.",
ephemeral:true
});
}

state.choices[interaction.user.id] = id;

await interaction.reply({
content:"Move locked.",
ephemeral:true
});

if(Object.keys(state.choices).length < 2) return;

const c1 = state.choices[p1];
const c2 = state.choices[p2];

if(c1 === "gunslinger_reload") state.ammo[p1]++;
if(c2 === "gunslinger_reload") state.ammo[p2]++;

if(c1 === "gunslinger_attack" && state.ammo[p1] > 0){
state.ammo[p1]--;
if(c2 !== "gunslinger_defend"){
state.lives[p2]--;
}
}

if(c2 === "gunslinger_attack" && state.ammo[p2] > 0){
state.ammo[p2]--;
if(c1 !== "gunslinger_defend"){
state.lives[p1]--;
}
}

state.choices = {};

/* WIN CHECK */

if(state.lives[p1] <= 0 || state.lives[p2] <= 0){

const winner = state.lives[p1] > 0 ? p1 : p2;

games.delete(interaction.channelId);

await interaction.channel.send({
embeds:[{
title:"💀 Duel Result",
description:`Winner: <@${winner}>`
}]
});

return;

}

/* NEXT TURN */

await interaction.channel.send({
embeds:[{
title:"🤠 Next Turn",
description:`❤️ Lives

<@${p1}>: ${state.lives[p1]}
<@${p2}>: ${state.lives[p2]}

🔫 Ammo

<@${p1}>: ${state.ammo[p1]}
<@${p2}>: ${state.ammo[p2]}`
}],
components:[moveButtons()]
});

}

};
