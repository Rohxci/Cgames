const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const createEmbed = require("../utils/embed");
const games = require("../systems/games");

const MAX_AMMO = 5;
const MAX_LIVES = 5;

function moveRow(){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("gs_attack")
.setLabel("Attack")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId("gs_defend")
.setLabel("Defend")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("gs_reload")
.setLabel("Reload")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("gs_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Secondary)

);

}

function readyEmbed(state){

const [p1,p2] = state.players;

const r1 = state.choices[p1] ? "✅" : "⏳";
const r2 = state.choices[p2] ? "✅" : "⏳";

return {

title:"🤠 Gunslinger Duel",

description:`Ready Status

<@${p1}> ${r1}
<@${p2}> ${r2}

❤️ Lives
<@${p1}>: ${state.lives[p1]}
<@${p2}>: ${state.lives[p2]}

🔫 Ammo
<@${p1}>: ${state.ammo[p1]}
<@${p2}>: ${state.ammo[p2]}`

};

}

module.exports = {

match(interaction){

if(!interaction.isButton()) return false;

const id = interaction.customId;

return (
id.startsWith("gs_accept_") ||
id.startsWith("gs_decline_") ||
id.startsWith("gs_cancel_") ||
id.startsWith("gs_")
);

},

async run(interaction){

const id = interaction.customId;

/* ACCEPT */

if(id.startsWith("gs_accept_")){

const parts = id.split("_");

const p1 = parts[2];
const p2 = parts[3];

if(interaction.user.id !== p2){

return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});

}

const state = {

type:"gunslinger",
players:[p1,p2],
lives:{
[p1]:MAX_LIVES,
[p2]:MAX_LIVES
},
ammo:{
[p1]:0,
[p2]:0
},
choices:{}

};

games.create(interaction.channelId,state);

await interaction.update({

embeds:[readyEmbed(state)],
components:[moveRow()]

});

return;

}

/* DECLINE */

if(id.startsWith("gs_decline_")){

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

if(id.startsWith("gs_cancel_")){

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

/* MOVES */

const state = games.get(interaction.channelId);
if(!state) return;

if(!state.players.includes(interaction.user.id)){

return interaction.reply({
content:"You are not part of this duel.",
ephemeral:true
});

}

/* SURRENDER */

if(id === "gs_surrender"){

const winner = state.players.find(p => p !== interaction.user.id);

games.delete(interaction.channelId);

await interaction.update({

embeds:[createEmbed("💀 Duel Over",`Winner: <@${winner}>`)],
components:[]

});

return;

}

/* ATTACK */

if(id === "gs_attack"){

if(state.ammo[interaction.user.id] <= 0){

return interaction.reply({
content:"❌ No ammo! Reload first.",
ephemeral:true
});

}

}

/* SAVE MOVE */

if(state.choices[interaction.user.id]){

return interaction.reply({
content:"You already chose.",
ephemeral:true
});

}

state.choices[interaction.user.id] = id;

/* UPDATE READY STATUS */

await interaction.update({

embeds:[readyEmbed(state)],
components:[moveRow()]

});

/* WAIT BOTH */

if(Object.keys(state.choices).length < 2) return;

const [p1,p2] = state.players;

const c1 = state.choices[p1];
const c2 = state.choices[p2];

let log = [];

/* RELOAD */

if(c1 === "gs_reload" && state.ammo[p1] < MAX_AMMO){
state.ammo[p1]++;
log.push(`🔄 <@${p1}> reloaded`);
}

if(c2 === "gs_reload" && state.ammo[p2] < MAX_AMMO){
state.ammo[p2]++;
log.push(`🔄 <@${p2}> reloaded`);
}

/* ATTACK */

if(c1 === "gs_attack"){

state.ammo[p1]--;

if(c2 !== "gs_defend"){
state.lives[p2]--;
log.push(`🔫 <@${p1}> attacked`);
}

}

if(c2 === "gs_attack"){

state.ammo[p2]--;

if(c1 !== "gs_defend"){
state.lives[p1]--;
log.push(`🔫 <@${p2}> attacked`);
}

}

/* DEFEND */

if(c1 === "gs_defend") log.push(`🛡 <@${p1}> defended`);
if(c2 === "gs_defend") log.push(`🛡 <@${p2}> defended`);

state.choices = {};

/* WIN CHECK */

if(state.lives[p1] <= 0 || state.lives[p2] <= 0){

const winner = state.lives[p1] > 0 ? p1 : p2;

games.delete(interaction.channelId);

await interaction.channel.send({

embeds:[
createEmbed(
"💀 Duel Over",
`Winner: <@${winner}>

${log.join("\n")}`
)
]

});

return;

}

/* NEXT ROUND */

await interaction.channel.send({

embeds:[
createEmbed(
"🤠 Round Result",

`${log.join("\n")}

❤️ Lives
<@${p1}>: ${state.lives[p1]}
<@${p2}>: ${state.lives[p2]}

🔫 Ammo
<@${p1}>: ${state.ammo[p1]}
<@${p2}>: ${state.ammo[p2]}`
)
],
components:[moveRow()]

});

}

};
