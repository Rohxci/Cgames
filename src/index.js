require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
Client,
Collection,
GatewayIntentBits,
Events
} = require("discord.js");

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
client.handlers = [];

/* LOAD COMMANDS */
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.existsSync(commandsPath)
? fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))
: [];

for (const file of commandFiles) {
const filePath = path.join(commandsPath, file);
const command = require(filePath);
client.commands.set(command.data.name, command);
}

/* LOAD INTERACTION HANDLERS */
const interactionsPath = path.join(__dirname, "interactions");

if (fs.existsSync(interactionsPath)) {
const handlerFiles = fs.readdirSync(interactionsPath).filter(f => f.endsWith(".js"));

for (const file of handlerFiles) {
try {
const filePath = path.join(interactionsPath, file);
const handler = require(filePath);

if (handler && typeof handler.match === "function" && typeof handler.run === "function") {
client.handlers.push(handler);
} else {
console.warn(`[HANDLER SKIPPED] ${file} (missing match/run)`);
}
} catch (err) {
console.error(`[HANDLER LOAD ERROR] ${file}`, err);
}
}
}

/* READY */
client.once("ready", () => {
console.log(`Logged in as ${client.user.tag}`);
console.log(`Loaded commands: ${client.commands.size}`);
console.log(`Loaded handlers: ${client.handlers.length}`);
});

/* ROUTER */
client.on(Events.InteractionCreate, async interaction => {

try {

/* SLASH COMMANDS */
if (interaction.isChatInputCommand()) {

const command = client.commands.get(interaction.commandName);
if (!command) return;

await command.execute(interaction);
return;
}

/* COMPONENTS & MODALS */
if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {

for (const handler of client.handlers) {
if (handler.match(interaction)) {
await handler.run(interaction);
return;
}
}

/* no handler matched -> prevent "interaction failed" */
if (!interaction.replied && !interaction.deferred) {
return interaction.reply({
content: "This interaction is not active (no handler matched).",
ephemeral: true
});
}

return;
}

} catch (error) {

console.error(error);

if (!interaction.replied && !interaction.deferred) {
return interaction.reply({
content: "There was an error processing this interaction.",
ephemeral: true
});
}

}

});

client.login(process.env.DISCORD_TOKEN);
