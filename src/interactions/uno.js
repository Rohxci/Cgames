const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder
} = require("discord.js");

const games = require("../systems/games");

const COLORS = ["🔴","🟡","🟢","🔵"];

function buildDeck(){

const deck = [];

for(const color of COLORS){

for(let i=0;i<10;i++){
deck.push(`${color} ${i}`);
}

deck.push(`${color} Skip`);
deck.push(`${color} +2`);

}

for(let i=0;i<4;i++){
deck.push("🌈 Wild");
}

return deck.sort(()=>Math.random()-0.5);

}

function playableCards(hand, top){

const [topColor, topValue] = top.split(" ");

return hand.filter(card=>{

if(card === "🌈 Wild") return true;

const [c,v] = card.split(" ");

return c === topColor || v === topValue;

});

}

function tableEmbed(state){

return {
title:"🃏 UNO Duel",
description:`Top Card
${state.top}

Turn
<@${state.turn}>

Cards left
<@${state.player1}>: ${state.hand1.length}
<@${state.player2}>: ${state.hand2.length}`
};

}

function actionButtons(){

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

function cardMenu(cards){

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

module.exports = {

match(interaction){

if(interaction.isButton()){
return interaction.customId.startsWith("uno_");
}

if(interaction.isStringSelectMenu()){
return interaction.customId.startsWith("uno_");
}

return false;

},

async run(interaction){

const id = interaction.customId;

/* ACCEPT */

if(id.startsWith("uno_accept_")){

const parts = id.split("_");

const p1 = parts[2];
const p2 = parts[3];

if(interaction.user.id !== p2){
return interaction.reply({ content:"Only the challenged player can accept.", ephemeral:true });
}

const thread = await interaction.channel.threads.create({
name:`uno-${p1}-${p2}`,
autoArchiveDuration:60
});

const deck = buildDeck();

const hand1 = deck.splice(0,7);
const hand2 = deck.splice(0,7);

const top = deck.shift();

games.create(interaction.channelId,{
type:"uno",
threadId:thread.id,
player1:p1,
player2:p2,
turn:p1,
deck,
hand1,
hand2,
top
});

await interaction.update({
content:`UNO game started in <#${thread.id}>`,
embeds:[],
components:[]
});

const game = games.get(interaction.channelId);

await thread.send({
embeds:[tableEmbed(game)],
components:[
cardMenu(playableCards(hand1,top)),
actionButtons()
]
});

return;

}

/* DECLINE */

if(id.startsWith("uno_decline_")){

const p2 = id.split("_")[3];

if(interaction.user.id !== p2){
return interaction.reply({ content:"Only the challenged player can decline.", ephemeral:true });
}

await interaction.update({
content:"Challenge declined.",
embeds:[],
components:[]
});

return;

}

/* CANCEL */

if(id.startsWith("uno_cancel_")){

const p1 = id.split("_")[2];

if(interaction.user.id !== p1){
return interaction.reply({ content:"Only the challenger can cancel.", ephemeral:true });
}

await interaction.update({
content:"Challenge cancelled.",
embeds:[],
components:[]
});

return;

}

const game = games.get(interaction.channelId);
if(!game) return;

/* DRAW */

if(id === "uno_draw"){

if(interaction.user.id !== game.turn){
return interaction.reply({ content:"Not your turn.", ephemeral:true });
}

const card = game.deck.shift();

if(interaction.user.id === game.player1){
game.hand1.push(card);
}else{
game.hand2.push(card);
}

game.turn = interaction.user.id === game.player1 ? game.player2 : game.player1;

await interaction.update({
embeds:[tableEmbed(game)],
components:[actionButtons()]
});

return;

}

/* SURRENDER */

if(id === "uno_surrender"){

const winner =
interaction.user.id === game.player1
? game.player2
: game.player1;

games.delete(interaction.channelId);

await interaction.update({
embeds:[{
title:"🃏 UNO Duel",
description:`${interaction.user} surrendered.

Winner: <@${winner}>`
}],
components:[]
});

return;

}

/* PLAY CARD */

if(id === "uno_play"){

const card = interaction.values[0];

let hand;

if(interaction.user.id === game.player1){
hand = game.hand1;
}else{
hand = game.hand2;
}

const index = hand.indexOf(card);
if(index === -1) return;

hand.splice(index,1);

if(card === "🌈 Wild"){

game.pendingWild = true;

await interaction.update({
content:"Choose a color",
components:[colorMenu()]
});

return;

}

applyCard(card,game,interaction);

}

/* COLOR SELECT */

if(id === "uno_color"){

const color = interaction.values[0];

game.top = `${color} Wild`;

applyCard(null,game,interaction);

}

function applyCard(card,game,interaction){

if(card && card.includes("+2")){

const opponent =
interaction.user.id === game.player1
? game.player2
: game.player1;

const targetHand =
opponent === game.player1
? game.hand1
: game.hand2;

targetHand.push(game.deck.shift());
targetHand.push(game.deck.shift());

}

if(card && card.includes("Skip")){

game.turn = interaction.user.id;

}else{

game.turn =
interaction.user.id === game.player1
? game.player2
: game.player1;

}

if(card){
game.top = card;
}

const hand =
game.turn === game.player1
? game.hand1
: game.hand2;

if(hand.length === 0){

games.delete(interaction.channelId);

interaction.update({
embeds:[{
title:"🃏 UNO Duel",
description:`Winner: <@${interaction.user.id}>`
}],
components:[]
});

return;

}

interaction.update({
embeds:[tableEmbed(game)],
components:[
cardMenu(playableCards(hand,game.top)),
actionButtons()
]
});

}

}

};
