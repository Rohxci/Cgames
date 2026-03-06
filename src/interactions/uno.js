const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder,
ChannelType
} = require("discord.js");

const games = require("../systems/games");

const COLORS=["🔴","🟡","🟢","🔵"];

/* deck */

function deck(){

let d=[];

for(const c of COLORS){

for(let i=0;i<10;i++) d.push(`${c} ${i}`);

d.push(`${c} Skip`);
d.push(`${c} +2`);

}

for(let i=0;i<4;i++) d.push("🌈 Wild");

return d.sort(()=>Math.random()-0.5);

}

/* playable */

function playable(card,top){

if(card==="🌈 Wild") return true;

const [tc,tv]=top.split(" ");
const [c,v]=card.split(" ");

return c===tc || v===tv;

}

/* embed */

function table(g){

return{
title:"🃏 UNO Duel",
description:`Top Card
**${g.top}**

Turn
<@${g.turn}>

Cards
<@${g.p1}>: ${g.h1.length}
<@${g.p2}>: ${g.h2.length}`
};

}

/* menu */

function menu(hand,top){

const playableCards=hand
.map((c,i)=>({c,i}))
.filter(x=>playable(x.c,top));

const list=playableCards.length?playableCards:hand.map((c,i)=>({c,i}));

return new ActionRowBuilder().addComponents(

new StringSelectMenuBuilder()
.setCustomId("uno_play")
.setPlaceholder("Play card")
.addOptions(list.map(x=>({

label:x.c,
value:String(x.i)

})))

);

}

/* buttons */

function buttons(){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("uno_draw")
.setLabel("Draw")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("uno_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)

);

}

module.exports={

match(i){

if(i.isButton()) return i.customId.startsWith("uno_");

if(i.isStringSelectMenu()) return i.customId.startsWith("uno_");

return false;

},

async run(i){

const id=i.customId;

/* ACCEPT */

if(id.startsWith("uno_accept_")){

const p1=id.split("_")[2];
const p2=id.split("_")[3];

if(i.user.id!==p2)
return i.reply({content:"Only opponent can accept.",ephemeral:true});

const thread=await i.channel.threads.create({

name:`uno-${i.user.username}`,
type:ChannelType.PrivateThread

});

await thread.members.add(p1);
await thread.members.add(p2);

const d=deck();

const h1=d.splice(0,7);
const h2=d.splice(0,7);

const top=d.shift();

games.create(thread.id,{

type:"uno",
p1,
p2,
h1,
h2,
deck:d,
top,
turn:p1,
main:i.channel.id

});

await i.update({

content:`🃏 UNO started in <#${thread.id}>`,
components:[]

});

const g=games.get(thread.id);

await thread.send({

embeds:[table(g)],
components:[menu(h1,top),buttons()]

});

return;

}

/* DECLINE */

if(id.startsWith("uno_decline_")){

const p2=id.split("_")[3];

if(i.user.id!==p2)
return i.reply({content:"Only opponent can decline.",ephemeral:true});

await i.update({content:"Challenge declined.",components:[]});

return;

}

/* GAME */

const g=games.get(i.channel.id);
if(!g) return;

/* DRAW */

if(id==="uno_draw"){

if(i.user.id!==g.turn)
return i.reply({content:"Not your turn.",ephemeral:true});

const card=g.deck.shift();

if(i.user.id===g.p1) g.h1.push(card);
else g.h2.push(card);

g.turn=i.user.id===g.p1?g.p2:g.p1;

await i.update({

embeds:[table(g)],
components:[menu(g.turn===g.p1?g.h1:g.h2,g.top),buttons()]

});

return;

}

/* SURRENDER */

if(id==="uno_surrender"){

const winner=i.user.id===g.p1?g.p2:g.p1;

const main=i.guild.channels.cache.get(g.main);

await main.send(`🃏 UNO finished\nWinner: <@${winner}>`);

games.delete(i.channel.id);

await i.channel.delete();

return;

}

/* PLAY */

if(id==="uno_play"){

if(i.user.id!==g.turn)
return i.reply({content:"Not your turn.",ephemeral:true});

const hand=i.user.id===g.p1?g.h1:g.h2;

const card=hand.splice(i.values[0],1)[0];

/* +2 */

if(card.includes("+2")){

const opp=i.user.id===g.p1?g.p2:g.p1;

const target=opp===g.p1?g.h1:g.h2;

target.push(g.deck.shift());
target.push(g.deck.shift());

}

/* skip */

if(card.includes("Skip")){

g.turn=i.user.id;

}else{

g.turn=i.user.id===g.p1?g.p2:g.p1;

}

/* wild */

if(card==="🌈 Wild"){

const color=COLORS[Math.floor(Math.random()*4)];

g.top=`${color} Wild`;

}else{

g.top=card;

}

/* UNO warning */

if(hand.length===1){

await i.channel.send(`⚠️ UNO!\n<@${i.user.id}> has only one card left`);

}

/* WIN */

if(hand.length===0){

const main=i.guild.channels.cache.get(g.main);

await main.send(`🃏 UNO finished\nWinner: <@${i.user.id}>`);

games.delete(i.channel.id);

await i.channel.delete();

return;

}

await i.update({

embeds:[table(g)],
components:[menu(g.turn===g.p1?g.h1:g.h2,g.top),buttons()]

});

}

}

};
