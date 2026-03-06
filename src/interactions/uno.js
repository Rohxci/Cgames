const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder,
ChannelType
} = require("discord.js");

const games = require("../systems/games");

const COLORS = ["🔴","🟡","🟢","🔵"];

/* DECK */

function buildDeck(){

const deck=[];

for(const c of COLORS){

for(let i=0;i<10;i++){
deck.push(`${c} ${i}`);
}

deck.push(`${c} Skip`);
deck.push(`${c} +2`);

}

for(let i=0;i<4;i++){
deck.push("🌈 Wild");
}

return deck.sort(()=>Math.random()-0.5);

}

/* PLAYABLE */

function playable(hand,top){

const [tc,tv]=top.split(" ");

return hand.filter(card=>{

if(card==="🌈 Wild") return true;

const [c,v]=card.split(" ");

return c===tc || v===tv;

});

}

/* TABLE */

function table(state){

return{
title:"🃏 UNO Duel",
description:`Top Card
${state.top}

Turn
<@${state.turn}>

Cards
<@${state.player1}>: ${state.hand1.length}
<@${state.player2}>: ${state.hand2.length}`
};

}

/* BUTTONS */

function buttons(){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("uno_draw")
.setLabel("Draw Card")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("uno_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)

);

}

/* MENU */

function menu(cards){

return new ActionRowBuilder().addComponents(

new StringSelectMenuBuilder()
.setCustomId("uno_play")
.setPlaceholder("Select card")
.addOptions(cards.map(c=>({
label:c,
value:c
})))

);

}

/* COLOR */

function colorMenu(){

return new ActionRowBuilder().addComponents(

new StringSelectMenuBuilder()
.setCustomId("uno_color")
.setPlaceholder("Choose color")
.addOptions([
{label:"Red",value:"🔴"},
{label:"Yellow",value:"🟡"},
{label:"Green",value:"🟢"},
{label:"Blue",value:"🔵"}
])

);

}

module.exports={

match(interaction){

if(interaction.isButton())
return interaction.customId.startsWith("uno_");

if(interaction.isStringSelectMenu())
return interaction.customId.startsWith("uno_");

return false;

},

async run(interaction){

const id=interaction.customId;

/* ACCEPT */

if(id.startsWith("uno_accept_")){

const parts=id.split("_");

const p1=parts[2];
const p2=parts[3];

if(interaction.user.id!==p2){
return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});
}

const thread=await interaction.channel.threads.create({
name:`uno-${interaction.user.username}`,
type:ChannelType.PrivateThread,
autoArchiveDuration:60
});

await thread.members.add(p1);
await thread.members.add(p2);

const deck=buildDeck();

const hand1=deck.splice(0,7);
const hand2=deck.splice(0,7);

const top=deck.shift();

games.create(thread.id,{
type:"uno",
player1:p1,
player2:p2,
turn:p1,
deck,
hand1,
hand2,
top,
mainChannel:interaction.channel.id
});

await interaction.update({
content:`🃏 UNO started in <#${thread.id}>`,
components:[],
embeds:[]
});

const game=games.get(thread.id);

await thread.send({
embeds:[table(game)],
components:[
menu(playable(hand1,top).length ? playable(hand1,top) : hand1),
buttons()
]
});

return;

}

/* DECLINE */

if(id.startsWith("uno_decline_")){

const p2=id.split("_")[3];

if(interaction.user.id!==p2){
return interaction.reply({
content:"Only the challenged player can decline.",
ephemeral:true
});
}

await interaction.update({
content:"Challenge declined.",
components:[],
embeds:[]
});

return;

}

/* CANCEL */

if(id.startsWith("uno_cancel_")){

const p1=id.split("_")[2];

if(interaction.user.id!==p1){
return interaction.reply({
content:"Only the challenger can cancel.",
ephemeral:true
});
}

await interaction.update({
content:"Challenge cancelled.",
components:[],
embeds:[]
});

return;

}

/* GAME */

const game=games.get(interaction.channelId);
if(!game) return;

/* DRAW */

if(id==="uno_draw"){

await interaction.deferUpdate();

if(interaction.user.id!==game.turn) return;

const card=game.deck.shift();

if(interaction.user.id===game.player1)
game.hand1.push(card);
else
game.hand2.push(card);

game.turn=
interaction.user.id===game.player1
?game.player2
:game.player1;

const nextHand=
game.turn===game.player1
?game.hand1
:game.hand2;

const cards=playable(nextHand,game.top);

const menuCards=cards.length?cards:nextHand;

await interaction.message.edit({
embeds:[table(game)],
components:[
menu(menuCards),
buttons()
]
});

return;

}

/* SURRENDER */

if(id==="uno_surrender"){

await interaction.deferUpdate();

const winner=
interaction.user.id===game.player1
?game.player2
:game.player1;

const main=interaction.guild.channels.cache.get(game.mainChannel);

await main.send(`🃏 UNO Duel finished\nWinner: <@${winner}>`);

games.delete(interaction.channelId);

await interaction.channel.delete();

return;

}

/* PLAY CARD */

if(id==="uno_play"){

await interaction.deferUpdate();

const card=interaction.values[0];

let hand;

if(interaction.user.id===game.player1)
hand=game.hand1;
else
hand=game.hand2;

const index=hand.indexOf(card);
if(index===-1) return;

hand.splice(index,1);

if(card==="🌈 Wild"){

game.pendingWildPlayer=interaction.user.id;

await interaction.message.edit({
content:"Choose color",
components:[colorMenu()]
});

return;

}

apply(card,game,interaction);

}

/* COLOR */

if(id==="uno_color"){

await interaction.deferUpdate();

if(game.pendingWildPlayer!==interaction.user.id) return;

const color=interaction.values[0];

game.top=`${color} Wild`;

game.pendingWildPlayer=null;

apply(null,game,interaction);

}

/* APPLY */

async function apply(card,game,interaction){

if(card && card.includes("+2")){

const opp=
interaction.user.id===game.player1
?game.player2
:game.player1;

const target=
opp===game.player1
?game.hand1
:game.hand2;

target.push(game.deck.shift());
target.push(game.deck.shift());

}

if(card && card.includes("Skip")){

game.turn=interaction.user.id;

}else{

game.turn=
interaction.user.id===game.player1
?game.player2
:game.player1;

}

if(card) game.top=card;

const hand=
game.turn===game.player1
?game.hand1
:game.hand2;

if(hand.length===0){

const main=interaction.guild.channels.cache.get(game.mainChannel);

await main.send(`🃏 UNO Duel finished\nWinner: <@${interaction.user.id}>`);

games.delete(interaction.channelId);

await interaction.channel.delete();

return;

}

const cards=playable(hand,game.top);
const menuCards=cards.length?cards:hand;

await interaction.message.edit({
embeds:[table(game)],
components:[
menu(menuCards),
buttons()
]
});

}

}

};
