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
title:"🤠 Gunslinger Duel",
description:`<@${interaction.user.id}> challenged <@${opponent.id}>!

Each player has **5 lives**.

Attack = shoot (needs ammo)
Defend = block attack
Reload = gain ammo`
}],
components:[row]
});

},

async run(interaction){

if(!interaction.customId?.startsWith("gunslinger_")) return;

const state = games.get(interaction.channelId);
if(!state || state.type !== "gunslinger") return;

const id = interaction.customId;

/* ACCEPT */

if(id === "gunslinger_accept"){

if(interaction.user.id !== state.players[1]){
return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});
}

const row = new ActionRowBuilder().addComponents(

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

await interaction.update({
embeds:[{
title:"🤠 Duel Started",
description:`<@${state.players[0]}> vs <@${state.players[1]}>

❤️ Lives: 5
🔫 Ammo: 0

Choose your move.`
}],
components:[row]
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

if(
id === "gunslinger_attack" ||
id === "gunslinger_defend" ||
id === "gunslinger_reload"
){

if(!state.players.includes(interaction.user.id)){
return interaction.reply({
content:"You are not part of this duel.",
ephemeral:true
});
}

if(state.choices[interaction.user.id]){
return interaction.reply({
content:"You already selected a move.",
ephemeral:true
});
}

state.choices[interaction.user.id] = id;

await interaction.reply({
content:"Move locked.",
ephemeral:true
});

/* WAIT BOTH */

if(Object.keys(state.choices).length < 2) return;

const p1 = state.players[0];
const p2 = state.players[1];

const c1 = state.choices[p1];
const c2 = state.choices[p2];

/* RELOAD */

if(c1 === "gunslinger_reload") state.ammo[p1]++;
if(c2 === "gunslinger_reload") state.ammo[p2]++;

/* ATTACK */

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
description:`Winner: <@${winner}>

Final Lives
<@${p1}>: ${state.lives[p1]} ❤️
<@${p2}>: ${state.lives[p2]} ❤️`
}]
});

return;

}

/* NEXT TURN */

const row = new ActionRowBuilder().addComponents(

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
components:[row]
});

}

}

};
