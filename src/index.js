require("dotenv").config();

const {
Client,
GatewayIntentBits,
Events
} = require("discord.js");

const GAMES_CHANNEL_ID = process.env.GAMES_CHANNEL_ID;

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {

console.log(`Logged in as ${client.user.tag}`);

});

client.on(Events.InteractionCreate, async interaction => {

if (!interaction.isChatInputCommand()) return;

if (interaction.channelId !== GAMES_CHANNEL_ID) {

return interaction.reply({
content: `🎮 Please use game commands in <#${GAMES_CHANNEL_ID}>`,
ephemeral: true
});

}

if (interaction.commandName === "ping") {

await interaction.reply("🏓 Pong!");

}

if (interaction.commandName === "coinflip") {

const result = Math.random() < 0.5 ? "Heads" : "Tails";

await interaction.reply(`🪙 Coinflip: **${result}**`);

}

});

client.login(process.env.DISCORD_TOKEN);
