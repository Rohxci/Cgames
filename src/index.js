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

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {

const filePath = path.join(commandsPath, file);
const command = require(filePath);

client.commands.set(command.data.name, command);

}

let games = {};

client.once("ready", () => {

console.log(`Logged in as ${client.user.tag}`);

});

client.on(Events.InteractionCreate, async interaction => {

if (interaction.isChatInputCommand()) {

const command = client.commands.get(interaction.commandName);

if (!command) return;

try {

await command.execute(interaction);

} catch (error) {

console.error(error);

await interaction.reply({
content: "There was an error executing this command.",
ephemeral: true
});

}

}

if (interaction.isButton()) {

if (!interaction.customId.startsWith("ttt")) return;

const game = games[interaction.channelId];

if (!game) return;

const [_, row, col] = interaction.customId.split("_");

if (interaction.user.id !== game.turn) {

return interaction.reply({
content: "It is not your turn.",
ephemeral: true
});

}

if (game.board[row][col] !== "⬜") {

return interaction.reply({
content: "This position is already taken.",
ephemeral: true
});

}

const symbol = interaction.user.id === game.player1 ? "❌" : "⭕";

game.board[row][col] = symbol;

game.turn = interaction.user.id === game.player1 ? game.player2 : game.player1;

const rows = game.board.map((r,i) =>
new ActionRowBuilder().addComponents(
r.map((cell,j)=>
new ButtonBuilder()
.setCustomId(`ttt_${i}_${j}`)
.setLabel(cell)
.setStyle(ButtonStyle.Secondary)
.setDisabled(cell !== "⬜")
)
)
);

const embed = createEmbed(
"🎮 TicTacToe",
`<@${game.player1}> vs <@${game.player2}>\n\nTurn: <@${game.turn}>`
);

await interaction.update({
embeds:[embed],
components: rows
});

}

});

client.login(process.env.DISCORD_TOKEN);
