require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
Client,
Collection,
GatewayIntentBits,
Events,
REST,
Routes
} = require("discord.js");

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
client.handlers = [];

/* LOAD COMMANDS */

const commands = [];
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {

const filePath = path.join(commandsPath, file);
const command = require(filePath);

client.commands.set(command.data.name, command);
commands.push(command.data.toJSON());

}

}

/* LOAD INTERACTIONS */

const interactionsPath = path.join(__dirname, "interactions");

if (fs.existsSync(interactionsPath)) {

const files = fs.readdirSync(interactionsPath).filter(file => file.endsWith(".js"));

for (const file of files) {

const filePath = path.join(interactionsPath, file);
const handler = require(filePath);

if(handler.match && handler.run){
client.handlers.push(handler);
}

}

}

/* READY */

client.once("ready", async () => {

console.log(`Logged in as ${client.user.tag}`);
console.log(`Commands loaded: ${client.commands.size}`);
console.log(`Handlers loaded: ${client.handlers.length}`);

/* AUTO DEPLOY COMMANDS */

try {

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

await rest.put(

Routes.applicationGuildCommands(
process.env.CLIENT_ID,
process.env.GUILD_ID
),

{ body: commands }

);

console.log("Slash commands deployed automatically.");

} catch (error) {

console.error("Command deploy error:", error);

}

});

/* ROUTER */

client.on(Events.InteractionCreate, async interaction => {

try {

/* COMMAND */

if (interaction.isChatInputCommand()) {

const command = client.commands.get(interaction.commandName);

if (!command) return;

await command.execute(interaction);

return;

}

/* BUTTON */

if (interaction.isButton()) {

for (const handler of client.handlers) {

if (handler.match(interaction)) {

await handler.run(interaction);
return;

}

}

}

} catch (error) {

console.error(error);

if (!interaction.replied) {

interaction.reply({
content: "There was an error processing this interaction.",
ephemeral: true
});

}

}

});

client.login(process.env.DISCORD_TOKEN);
