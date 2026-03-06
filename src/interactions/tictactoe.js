const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

/* BOARD */

function createBoard(){

return [
["⬜","⬜","⬜"],
["⬜","⬜","⬜"],
["⬜","⬜","⬜"]
];

}

/* BUILD BUTTONS */

function buildBoard(board, disabled=false){

return board.map((row,i)=>

new ActionRowBuilder().addComponents(

row.map((cell,j)=>

new ButtonBuilder()
.setCustomId(`ttt_${i}_${j}`)
.setLabel(cell)
.setStyle(ButtonStyle.Secondary)
.setDisabled(disabled || cell !== "⬜")

)

)

);

}

/* SURRENDER BUTTON */

function surrenderRow(disabled=false){

return new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("ttt_surrender")
.setLabel("Surrender")
.setStyle(ButtonStyle.Danger)
.setDisabled(disabled)

);

}

/* CHECK WIN */

function checkWin(board){

const lines = [

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

if(line.every(c => c==="❌")) return "❌";
if(line.every(c => c==="⭕")) return "⭕";

}

return null;

}

/* DRAW */

function checkDraw(board){

return board.flat().every(c => c !== "⬜");

}

module.exports = {

match(interaction){

if(!interaction.isButton()) return false;

return interaction.customId.startsWith("ttt");

},

async run(interaction){

const id = interaction.customId;

/* ACCEPT */

if(id.startsWith("ttt_accept_")){

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

type:"tictactoe",
player1:p1,
player2:p2,
turn:p1,
board

});

const embed = createEmbed(

"🎮 TicTacToe",

`<@${p1}> vs <@${p2}>

Turn: <@${p1}>`

);

await interaction.update({

embeds:[embed],
components:[...buildBoard(board), surrenderRow(false)]

});

return;

}

/* DECLINE */

if(id.startsWith("ttt_decline_")){

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

if(id.startsWith("ttt_cancel_")){

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

if(id === "ttt_surrender"){

const game = games.get(interaction.channelId);
if(!game) return;

if(interaction.user.id !== game.player1 && interaction.user.id !== game.player2){

return interaction.reply({
content:"Only players can surrender.",
ephemeral:true
});

}

const winner = interaction.user.id === game.player1 ? game.player2 : game.player1;

games.delete(interaction.channelId);

await interaction.update({

embeds:[createEmbed("🏆 TicTacToe",`Winner: <@${winner}> (opponent surrendered)`)]
,
components:[...buildBoard(game.board,true), surrenderRow(true)]

});

return;

}

/* MOVE */

if(/^ttt_[0-2]_[0-2]$/.test(id)){

const game = games.get(interaction.channelId);
if(!game) return;

const [_,r,c] = id.split("_");

if(interaction.user.id !== game.turn){

return interaction.reply({
content:"Not your turn.",
ephemeral:true
});

}

if(game.board[r][c] !== "⬜"){

return interaction.reply({
content:"Position already taken.",
ephemeral:true
});

}

const symbol = interaction.user.id === game.player1 ? "❌" : "⭕";

game.board[r][c] = symbol;

/* WIN */

const winner = checkWin(game.board);

if(winner){

const winnerId = winner === "❌" ? game.player1 : game.player2;

games.delete(interaction.channelId);

return interaction.update({

embeds:[createEmbed("🏆 TicTacToe",`Winner: <@${winnerId}> 🎉`)],
components:[...buildBoard(game.board,true), surrenderRow(true)]

});

}

/* DRAW */

if(checkDraw(game.board)){

games.delete(interaction.channelId);

return interaction.update({

embeds:[createEmbed("🤝 TicTacToe","It's a draw!")],
components:[...buildBoard(game.board,true), surrenderRow(true)]

});

}

/* NEXT TURN */

game.turn = interaction.user.id === game.player1 ? game.player2 : game.player1;

const embed = createEmbed(

"🎮 TicTacToe",

`<@${game.player1}> vs <@${game.player2}>

Turn: <@${game.turn}>`

);

await interaction.update({

embeds:[embed],
components:[...buildBoard(game.board), surrenderRow(false)]

});

}

}

};
