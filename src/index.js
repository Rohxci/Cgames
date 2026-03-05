require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
Client,
Collection,
GatewayIntentBits,
Events,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const createEmbed = require("./utils/embed");
const games = require("./systems/games");

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

/* LOAD COMMANDS */

const commandsPath = path.join(__dirname,"commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
const filePath = path.join(commandsPath,file);
const command = require(filePath);
client.commands.set(command.data.name,command);
}

/* READY */

client.once("ready", () => {
console.log(`Logged in as ${client.user.tag}`);
});

/* HELPERS */

function checkWin(board) {

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

for (const line of lines) {
if (line.every(cell => cell === "❌")) return "❌";
if (line.every(cell => cell === "⭕")) return "⭕";
}

return null;
}

function checkDraw(board) {
return board.flat().every(cell => cell !== "⬜");
}

function buildBoardRows(board, disabledMode = "auto") {
return board.map((row,i)=>
new ActionRowBuilder().addComponents(
row.map((cell,j)=> {
const b = new ButtonBuilder()
.setCustomId(`ttt_${i}_${j}`)
.setLabel(cell)
.setStyle(ButtonStyle.Secondary);

if (disabledMode === "all") b.setDisabled(true);
else if (disabledMode === "auto") b.setDisabled(cell !== "⬜");

return b;
})
)
);
}

function buildEndRow(disabled = false) {
return new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("ttt_end")
.setLabel("End Game")
.setStyle(ButtonStyle.Danger)
.setDisabled(disabled)
);
}

/* INTERACTIONS */

client.on(Events.InteractionCreate, async interaction => {

if (interaction.isChatInputCommand()) {

const command = client.commands.get(interaction.commandName);
if (!command) return;

try {
await command.execute(interaction);
} catch (error) {
console.error(error);
await interaction.reply({
content:"There was an error executing this command.",
ephemeral:true
});
}

}

/* BUTTONS */

if (interaction.isButton()) {

const id = interaction.customId;

/* ACCEPT */

if (id.startsWith("ttt_accept_")) {

const parts = id.split("_");
const challenger = parts[2];
const opponent = parts[3];

if (interaction.user.id !== opponent) {
return interaction.reply({
content:"Only the challenged player can accept.",
ephemeral:true
});
}

const board = [
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

const embed = createEmbed(
"🎮 TicTacToe",
`<@${challenger}> vs <@${opponent}>\n\nTurn: <@${challenger}>`
);

await interaction.update({
embeds:[embed],
components:[...buildBoardRows(board,"auto"), buildEndRow(false)]
});

return;
}

/* DECLINE */

if (id.startsWith("ttt_decline_")) {

const parts = id.split("_");
const opponent = parts[3];

if (interaction.user.id !== opponent) {
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

/* END GAME BUTTON */

if (id === "ttt_end") {

const game = games.get(interaction.channelId);
if (!game) return;

if (interaction.user.id !== game.player1 && interaction.user.id !== game.player2) {
return interaction.reply({
content:"Only the players in this match can end the game.",
ephemeral:true
});
}

const endedBy = interaction.user.id;

const boardRowsLocked = buildBoardRows(game.board,"all");
games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("🛑 TicTacToe","Game ended by <@" + endedBy + ">.")],
components:[...boardRowsLocked, buildEndRow(true)]
});

return;
}

/* GRID CLICK */

if (/^ttt_[0-2]_[0-2]$/.test(id)) {

const game = games.get(interaction.channelId);
if (!game) return;

const [_,row,col] = id.split("_");

if (interaction.user.id !== game.turn) {
return interaction.reply({ content:"Not your turn.", ephemeral:true });
}

if (game.board[row][col] !== "⬜") {
return interaction.reply({ content:"Position already taken.", ephemeral:true });
}

const symbol = interaction.user.id === game.player1 ? "❌" : "⭕";
game.board[row][col] = symbol;

/* WIN */

const winner = checkWin(game.board);

if (winner) {

const winnerId = winner === "❌" ? game.player1 : game.player2;
const locked = buildBoardRows(game.board,"all");
games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("🏆 TicTacToe",`Winner: <@${winnerId}> 🎉`)],
components:[...locked, buildEndRow(true)]
});

return;
}

/* DRAW */

if (checkDraw(game.board)) {

const locked = buildBoardRows(game.board,"all");
games.delete(interaction.channelId);

await interaction.update({
embeds:[createEmbed("🤝 TicTacToe","It's a draw!")],
components:[...locked, buildEndRow(true)]
});

return;
}

/* NEXT TURN */

game.turn = interaction.user.id === game.player1 ? game.player2 : game.player1;

const embed = createEmbed(
"🎮 TicTacToe",
`<@${game.player1}> vs <@${game.player2}>\n\nTurn: <@${game.turn}>`
);

await interaction.update({
embeds:[embed],
components:[...buildBoardRows(game.board,"auto"), buildEndRow(false)]
});

return;
}

}

});

client.login(process.env.DISCORD_TOKEN);
