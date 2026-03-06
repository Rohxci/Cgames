const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

const ROWS = 6;
const COLS = 7;

/* CREATE BOARD */

function createBoard(){

return Array.from({ length: ROWS }, () =>
Array.from({ length: COLS }, () => "⚪")
);

}

/* BOARD STRING */

function boardToString(board){

const grid = board.map(r => r.join("")).join("\n");
const numbers = "1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣";

return grid + "\n" + numbers;

}

/* DROP PIECE */

function drop(board,col,symbol){

for(let r=ROWS-1;r>=0;r--){

if(board[r][col] === "⚪"){

board[r][col] = symbol;
return r;

}

}

return null;

}

/* COLUMN FULL */

function columnFull(board,col){

return board[0][col] !== "⚪";

}

/* DRAW */

function checkDraw(board){

return board[0].every(cell => cell !== "⚪");

}

/* WIN CHECK */

function checkWin(board,symbol){

for(let r=0;r<ROWS;r++){

for(let c=0;c<COLS;c++){

if(

board[r][c] === symbol &&
board[r]?.[c+1] === symbol &&
board[r]?.[c+2] === symbol &&
board[r]?.[c+3] === symbol

) return true;

if(

board[r]?.[c] === symbol &&
board[r+1]?.[c] === symbol &&
board[r+2]?.[c] === symbol &&
board[r+3]?.[c] === symbol

) return true;

if(

board[r]?.[c] === symbol &&
board[r+1]?.[c+1] === symbol &&
board[r+2]?.[c+2] === symbol &&
board[r+3]?.[c+3] === symbol

) return true;

if(

board[r]?.[c] === symbol &&
board[r+1]?.[c-1] === symbol &&
board[r+2]?.[c-2] === symbol &&
board[r+3]?.[c-3] === symbol

) return true;

}

}

return false;

}

/* BUTTONS */

function buildButtons(board, disabled=false){

const row1 = new ActionRowBuilder();
const row2 = new ActionRowBuilder();

for(let i=0;i<5;i++){

row1.addComponents(

new ButtonBuilder()
.setCustomId(`c4_col_${i}`)
.setLabel(`${i+1}`)
.setStyle(ButtonStyle.Secondary)
.setDisabled(disabled || columnFull(board,i))

);

}

for(let i=5;i<7;i++){

row2.addComponents(

new ButtonBuilder()
.setCustomId(`c4_col_${i}`)
.setLabel(`${i+1}`)
.setStyle(ButtonStyle.Secondary)
.setDisabled(disabled || columnFull(board,i))

);

}

row2.addComponents(

new ButtonBuilder()
.setCustomId("c4_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)
.setDisabled(disabled)

);

return [row1,row2];

}

module.exports = {

match(interaction){

if(!interaction.isButton()) return false;

return interaction.customId.startsWith("c4");

},

async run(interaction){

const id = interaction.customId;

/* ACCEPT */

if(id.startsWith("c4_accept_")){

const parts = id.split("_");

const p1 = parts[2];
const p2 = parts[3];

if(interaction.user.id !== p2){

return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});

}

const board = createBoard();

games.create(interaction.channelId,{
type:"connect4",
player1:p1,
player2:p2,
turn:p1,
board
});

const embed = createEmbed(

"🎮 Connect4",

`🔴 <@${p1}>
🟡 <@${p2}>

Turn: <@${p1}>

${boardToString(board)}`

);

await interaction.update({

embeds:[embed],
components:buildButtons(board)

});

return;

}

/* DECLINE */

if(id.startsWith("c4_decline_")){

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

if(id.startsWith("c4_cancel_")){

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

/* SURRENDER */

if(id === "c4_surrender"){

const game = games.get(interaction.channelId);
if(!game) return;

if(interaction.user.id !== game.player1 &&
interaction.user.id !== game.player2){

return interaction.reply({
content:"Only players can surrender.",
ephemeral:true
});

}

const winner =
interaction.user.id === game.player1
? game.player2
: game.player1;

games.delete(interaction.channelId);

await interaction.update({

embeds:[
createEmbed(
"🏆 Connect4",
`Winner: <@${winner}> (opponent surrendered)

${boardToString(game.board)}`
)
],
components:buildButtons(game.board,true)

});

return;

}

/* MOVE */

if(id.startsWith("c4_col_")){

const game = games.get(interaction.channelId);
if(!game) return;

const col = parseInt(id.split("_")[2]);

if(interaction.user.id !== game.turn){

return interaction.reply({
content:"Not your turn.",
ephemeral:true
});

}

const symbol =
interaction.user.id === game.player1
? "🔴"
: "🟡";

const row = drop(game.board,col,symbol);

if(row === null){

return interaction.reply({
content:"Column is full.",
ephemeral:true
});

}

/* WIN */

if(checkWin(game.board,symbol)){

games.delete(interaction.channelId);

return interaction.update({

embeds:[
createEmbed(
"🏆 Connect4",
`Winner: <@${interaction.user.id}> 🎉

${boardToString(game.board)}`
)
],
components:buildButtons(game.board,true)

});

}

/* DRAW */

if(checkDraw(game.board)){

games.delete(interaction.channelId);

return interaction.update({

embeds:[
createEmbed(
"🤝 Connect4",
`It's a draw!

${boardToString(game.board)}`
)
],
components:buildButtons(game.board,true)

});

}

/* NEXT TURN */

game.turn =
interaction.user.id === game.player1
? game.player2
: game.player1;

const embed = createEmbed(

"🎮 Connect4",

`🔴 <@${game.player1}>
🟡 <@${game.player2}>

Turn: <@${game.turn}>

${boardToString(game.board)}`

);

await interaction.update({

embeds:[embed],
components:buildButtons(game.board)

});

}

}

};
