const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const createEmbed=require("../utils/embed");
const games=require("../systems/games");

const ROWS=6;
const COLS=7;

function createBoard(){
return Array.from({length:ROWS},()=>Array.from({length:COLS},()=>"⚪"));
}

function boardToString(board){
return board.map(r=>r.join("")).join("\n")+"\n1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣";
}

function drop(board,col,symbol){

for(let r=ROWS-1;r>=0;r--){
if(board[r][col]==="⚪"){
board[r][col]=symbol;
return r;
}
}

return null;

}

function checkDraw(board){
return board[0].every(c=>c!=="⚪");
}

function checkWin(board,symbol){

for(let r=0;r<ROWS;r++){
for(let c=0;c<COLS;c++){

if(
board[r]?.[c]===symbol &&
board[r]?.[c+1]===symbol &&
board[r]?.[c+2]===symbol &&
board[r]?.[c+3]===symbol
) return true;

if(
board[r]?.[c]===symbol &&
board[r+1]?.[c]===symbol &&
board[r+2]?.[c]===symbol &&
board[r+3]?.[c]===symbol
) return true;

if(
board[r]?.[c]===symbol &&
board[r+1]?.[c+1]===symbol &&
board[r+2]?.[c+2]===symbol &&
board[r+3]?.[c+3]===symbol
) return true;

if(
board[r]?.[c]===symbol &&
board[r+1]?.[c-1]===symbol &&
board[r+2]?.[c-2]===symbol &&
board[r+3]?.[c-3]===symbol
) return true;

}
}

return false;

}

function buildButtons(){

const row1=new ActionRowBuilder();
const row2=new ActionRowBuilder();

for(let i=0;i<4;i++){
row1.addComponents(
new ButtonBuilder()
.setCustomId(`c4_${i}`)
.setLabel(`${i+1}`)
.setStyle(ButtonStyle.Secondary)
);
}

for(let i=4;i<7;i++){
row2.addComponents(
new ButtonBuilder()
.setCustomId(`c4_${i}`)
.setLabel(`${i+1}`)
.setStyle(ButtonStyle.Secondary)
);
}

row2.addComponents(
new ButtonBuilder()
.setCustomId("c4_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)
);

return [row1,row2];

}

module.exports={

match(i){
return i.isButton() && i.customId.startsWith("c4_");
},

async run(interaction){

const id=interaction.customId;

/* ACCEPT */

if(id.startsWith("c4_accept_")){

const parts=id.split("_");
const p1=parts[2];
const p2=parts[3];

if(interaction.user.id!==p2){
return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});
}

const board=createBoard();

games.create(interaction.channelId,{
player1:p1,
player2:p2,
turn:p1,
board
});

await interaction.update({
embeds:[createEmbed(
"🔴 Connect4",
`<@${p1}> vs <@${p2}>

Drop discs to connect four in a row.

${boardToString(board)}`
)],
components:buildButtons()
});

return;

}

/* SURRENDER */

if(id==="c4_surrender"){

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

}
};
