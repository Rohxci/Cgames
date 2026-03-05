const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const createEmbed = require("../utils/embed");
const games = require("../systems/games");

const ROWS = 6;
const COLS = 7;

function createBoard() {
return Array.from({ length: ROWS }, () =>
Array.from({ length: COLS }, () => "⚪")
);
}

function buildButtons(disabled=false){

const row = new ActionRowBuilder();

for(let i=0;i<COLS;i++){

row.addComponents(
new ButtonBuilder()
.setCustomId(`c4_col_${i}`)
.setLabel(`${i+1}`)
.setStyle(ButtonStyle.Secondary)
.setDisabled(disabled)
);

}

return [row];
}

function boardToString(board){
return board.map(r => r.join("")).join("\n");
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

function checkWin(board,symbol){

for(let r=0;r<ROWS;r++){
for(let c=0;c<COLS;c++){

if(
board[r][c]===symbol &&
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

module.exports = {

match(interaction){

if(!interaction.isButton()) return false;

const id = interaction.customId;

return id.startsWith("c4_");

},

async run(interaction){

const id = interaction.customId;

/* ACCEPT */

if(id.startsWith("c4_accept_")){

const parts = id.split("_");

const p1 = parts[2];
const p2 = parts[3];

if(interaction.user.id!==p2){
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
"🔴 Connect4",
`<@${p1}> vs <@${p2}>\n\nTurn: <@${p1}>\n\n${boardToString(board)}`
);

await interaction.update({
embeds:[embed],
components:buildButtons(false)
});

return;
}

/* DECLINE */

if(id.startsWith("c4_decline_")){

await interaction.update({
embeds:[createEmbed("❌ Challenge Declined","The challenge was declined.")],
components:[]
});

return;
}

/* MOVE */

if(id.startsWith("c4_col_")){

const game = games.get(interaction.channelId);
if(!game) return;

const col = parseInt(id.split("_")[2]);

if(interaction.user.id!==game.turn){
return interaction.reply({
content:"Not your turn.",
ephemeral:true
});
}

const symbol = interaction.user.id===game.player1 ? "🔴":"🟡";

const row = drop(game.board,col,symbol);

if(row===null){
return interaction.reply({
content:"Column is full.",
ephemeral:true
});
}

if(checkWin(game.board,symbol)){

games.delete(interaction.channelId);

return interaction.update({
embeds:[createEmbed(
"🏆 Connect4",
`Winner: <@${interaction.user.id}>\n\n${boardToString(game.board)}`
)],
components:buildButtons(true)
});

}

game.turn = interaction.user.id===game.player1 ? game.player2 : game.player1;

const embed = createEmbed(
"🔴 Connect4",
`<@${game.player1}> vs <@${game.player2}>\n\nTurn: <@${game.turn}>\n\n${boardToString(game.board)}`
);

await interaction.update({
embeds:[embed],
components:buildButtons(false)
});

}

}

};
