const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const createEmbed = require("../utils/embed");
const games = require("../systems/games");

function checkWin(board){

const lines=[
[board[0][0],board[0][1],board[0][2]],
[board[1][0],board[1][1],board[1][2]],
[board[2][0],board[2][1],board[2][2]],
[board[0][0],board[1][0],board[2][0]],
[board[0][1],board[1][1],board[2][1]],
[board[0][2],board[1][2],board[2][2]],
[board[0][0],board[1][1],board[2][2]],
[board[0][2],board[1][1],board[2][0]]
];

for(const line of lines){
if(line.every(c=>c==="❌")) return "❌";
if(line.every(c=>c==="⭕")) return "⭕";
}

return null;

}

function checkDraw(board){
return board.flat().every(c=>c!=="⬜");
}

function buildBoard(board){

return board.map((row,i)=>
new ActionRowBuilder().addComponents(
row.map((cell,j)=>
new ButtonBuilder()
.setCustomId(`ttt_${i}_${j}`)
.setLabel(cell)
.setStyle(ButtonStyle.Secondary)
.setDisabled(cell!=="⬜")
)
)
);

}

function surrenderRow(){

return new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("ttt_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)
);

}

module.exports={

match(i){
return i.isButton() && i.customId.startsWith("ttt_");
},

async run(interaction){

const id=interaction.customId;

/* ACCEPT */

if(id.startsWith("ttt_accept_")){

const parts=id.split("_");
const p1=parts[2];
const p2=parts[3];

if(interaction.user.id!==p2){
return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});
}

const board=[
["⬜","⬜","⬜"],
["⬜","⬜","⬜"],
["⬜","⬜","⬜"]
];

games.create(interaction.channelId,{
player1:p1,
player2:p2,
turn:p1,
board
});

await interaction.update({
embeds:[createEmbed(
"🎮 TicTacToe",
`<@${p1}> vs <@${p2}>

Get three in a row to win.

Turn: <@${p1}>`
)],
components:[...buildBoard(board),surrenderRow()]
});

return;

}

/* SURRENDER */

if(id==="ttt_surrender"){

const game=games.get(interaction.channelId);
if(!game) return;

if(interaction.user.id!==game.player1 &&
interaction.user.id!==game.player2){
return interaction.reply({
content:"Only the players can surrender.",
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

/* MOVE */

if(/^ttt_[0-2]_[0-2]$/.test(id)){

const game=games.get(interaction.channelId);
if(!game) return;

if(interaction.user.id!==game.player1 &&
interaction.user.id!==game.player2){
return interaction.reply({
content:"You are not in this match.",
ephemeral:true
});
}

const [_,r,c]=id.split("_");

if(interaction.user.id!==game.turn){
return interaction.reply({
content:"Not your turn.",
ephemeral:true
});
}

if(game.board[r][c]!=="⬜"){
return interaction.reply({
content:"Already taken.",
ephemeral:true
});
}

const symbol=
interaction.user.id===game.player1?"❌":"⭕";

game.board[r][c]=symbol;

const win=checkWin(game.board);

if(win){

const winner=win==="❌"?game.player1:game.player2;

games.delete(interaction.channelId);

return interaction.update({
embeds:[createEmbed(
"🏆 TicTacToe",
`Winner: <@${winner}>`
)],
components:buildBoard(game.board)
});
}

if(checkDraw(game.board)){

games.delete(interaction.channelId);

return interaction.update({
embeds:[createEmbed("🤝 Draw","Nobody wins")],
components:buildBoard(game.board)
});
}

game.turn=
interaction.user.id===game.player1
?game.player2
:game.player1;

await interaction.update({
embeds:[createEmbed(
"🎮 TicTacToe",
`<@${game.player1}> vs <@${game.player2}>

Turn: <@${game.turn}>`
)],
components:[...buildBoard(game.board),surrenderRow()]
});

}

}

};
