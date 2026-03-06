const {
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const createEmbed = require("../utils/embed");
const games = require("../systems/games");
const { lockChannel, unlockChannel } = require("../systems/channelLock");

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
if(line.every(c=>c==="❌")) return "❌";
if(line.every(c=>c==="⭕")) return "⭕";
}

return null;

}

function checkDraw(board){
return board.flat().every(c=>c!=="⬜");
}

function buildBoardRows(board,disabledMode="auto"){

return board.map((row,i)=>
new ActionRowBuilder().addComponents(
row.map((cell,j)=>{

const b=new ButtonBuilder()
.setCustomId(`ttt_${i}_${j}`)
.setLabel(cell)
.setStyle(ButtonStyle.Secondary);

if(disabledMode==="all") b.setDisabled(true);
else if(disabledMode==="auto") b.setDisabled(cell!=="⬜");

return b;

})
)
);

}

function buildEndRow(disabled=false){

return new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("ttt_end")
.setLabel("End Game")
.setStyle(ButtonStyle.Danger)
.setDisabled(disabled)
);

}

module.exports={

match(interaction){

if(!interaction.isButton()) return false;

const id=interaction.customId;

return id==="ttt_end"
|| id.startsWith("ttt_accept_")
|| id.startsWith("ttt_decline_")
|| /^ttt_[0-2]_[0-2]$/.test(id);

},

async run(interaction){

const id=interaction.customId;

/* ACCEPT */

if(id.startsWith("ttt_accept_")){

const parts=id.split("_");
const challenger=parts[2];
const opponent=parts[3];

if(interaction.user.id!==opponent){
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
player1:challenger,
player2:opponent,
turn:challenger,
board
});

const embed=createEmbed(
"🎮 TicTacToe",
`<@${challenger}> vs <@${opponent}>\n\nTurn: <@${challenger}>`
);

await interaction.update({
embeds:[embed],
components:[...buildBoardRows(board,"auto"),buildEndRow(false)]
});

/* LOCK CHANNEL AFTER RESPONSE */

const game=games.get(interaction.channelId);

game.originalChannelName=await lockChannel(
interaction.channel,
[challenger,opponent]
);

return;

}

/* DECLINE */

if(id.startsWith("ttt_decline_")){

const parts=id.split("_");
const opponent=parts[3];

if(interaction.user.id!==opponent){
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

/* END GAME */

if(id==="ttt_end"){

const game=games.get(interaction.channelId);
if(!game) return;

if(interaction.user.id!==game.player1 && interaction.user.id!==game.player2){
return interaction.reply({
content:"Only the players can end the game.",
ephemeral:true
});
}

const endedBy=interaction.user.id;

await unlockChannel(interaction.channel,game.originalChannelName);

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("🛑 TicTacToe",`Game ended by <@${endedBy}>.`)],
components:[]
});

return;

}

/* GRID */

if(/^ttt_[0-2]_[0-2]$/.test(id)){

const game=games.get(interaction.channelId);
if(!game) return;

const [_,row,col]=id.split("_");

if(interaction.user.id!==game.turn){
return interaction.reply({content:"Not your turn.",ephemeral:true});
}

if(game.board[row][col]!=="⬜"){
return interaction.reply({content:"Position taken.",ephemeral:true});
}

const symbol=interaction.user.id===game.player1?"❌":"⭕";

game.board[row][col]=symbol;

/* WIN */

const winner=checkWin(game.board);

if(winner){

const winnerId=winner==="❌"?game.player1:game.player2;

await unlockChannel(interaction.channel,game.originalChannelName);

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("🏆 TicTacToe",`Winner: <@${winnerId}> 🎉`)],
components:[]
});

return;

}

/* DRAW */

if(checkDraw(game.board)){

await unlockChannel(interaction.channel,game.originalChannelName);

games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("🤝 TicTacToe","It's a draw!")],
components:[]
});

return;

}

/* NEXT TURN */

game.turn=interaction.user.id===game.player1?game.player2:game.player1;

const embed=createEmbed(
"🎮 TicTacToe",
`<@${game.player1}> vs <@${game.player2}>\n\nTurn: <@${game.turn}>`
);

await interaction.update({
embeds:[embed],
components:[...buildBoardRows(game.board,"auto"),buildEndRow(false)]
});

return;

}

}

};
