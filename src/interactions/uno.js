const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder,
ChannelType
} = require("discord.js");

const games = require("../systems/games");

const COLORS = ["🔴","🟡","🟢","🔵"];

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

/* embed */

function table(g){

return{
title:"🃏 UNO Duel",
description:`Top Card
${g.top}

Turn
<@${g.turn}>

Cards
<@${g.p1}>: ${g.h1.length}
<@${g.p2}>: ${g.h2.length}`
};

}

/* menu */

function menu(hand){

return new ActionRowBuilder().addComponents(

new StringSelectMenuBuilder()
.setCustomId("uno_play")
.setPlaceholder("Play card")
.addOptions(hand.map((c,i)=>({

label:c,
value:String(i)

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

/* handler */

module.exports={

match(i){

if(i.isButton()) return i.customId.startsWith("uno_");

if(i.isStringSelectMenu()) return i.customId.startsWith("uno_");

return false;

},

async run(i){

const id=i.customId;

/* accept */

if(id.startsWith("uno_accept_")){

const p1=id.split("_")[2];
const p2=id.split("_")[3];

if(i.user.id!==p2)
return i.reply({content:"Only opponent can accept.",ephemeral:true});

const thread=await i.channel.threads.create({

name:"uno-game",
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

content:`UNO started in <#${thread.id}>`,
components:[]

});

const g=games.get(thread.id);

await thread.send({

embeds:[table(g)],
components:[menu(h1),buttons()]

});

return;

}

/* decline */

if(id.startsWith("uno_decline_")){

const p2=id.split("_")[3];

if(i.user.id!==p2)
return i.reply({content:"Only opponent can decline.",ephemeral:true});

await i.update({content:"Challenge declined.",components:[]});

return;

}

/* game */

const g=games.get(i.channel.id);
if(!g) return;

/* draw */

if(id==="uno_draw"){

if(i.user.id!==g.turn)
return i.reply({content:"Not your turn.",ephemeral:true});

const card=g.deck.shift();

if(i.user.id===g.p1) g.h1.push(card);
else g.h2.push(card);

g.turn=i.user.id===g.p1?g.p2:g.p1;

await i.update({

embeds:[table(g)],
components:[menu(g.turn===g.p1?g.h1:g.h2),buttons()]

});

return;

}

/* surrender */

if(id==="uno_surrender"){

const winner=i.user.id===g.p1?g.p2:g.p1;

const main=i.guild.channels.cache.get(g.main);

await main.send(`UNO finished. Winner: <@${winner}>`);

games.delete(i.channel.id);

await i.channel.delete();

return;

}

/* play */

if(id==="uno_play"){

if(i.user.id!==g.turn)
return i.reply({content:"Not your turn.",ephemeral:true});

const hand=i.user.id===g.p1?g.h1:g.h2;

const card=hand.splice(i.values[0],1)[0];

g.top=card;

if(hand.length===0){

const main=i.guild.channels.cache.get(g.main);

await main.send(`UNO finished. Winner: <@${i.user.id}>`);

games.delete(i.channel.id);

await i.channel.delete();

return;

}

g.turn=i.user.id===g.p1?g.p2:g.p1;

await i.update({

embeds:[table(g)],
components:[menu(g.turn===g.p1?g.h1:g.h2),buttons()]

});

}

}

};
