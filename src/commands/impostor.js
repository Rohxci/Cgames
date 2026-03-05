const { SlashCommandBuilder } = require("discord.js");

const games = require("../systems/games");
const channelCheck = require("../utils/channelCheck");

module.exports = {

data: new SlashCommandBuilder()
.setName("impostor")
.setDescription("Start an Impostor game"),

async execute(interaction) {

if (!channelCheck(interaction)) return;

/* prevent multiple games */

if (games.get(interaction.channelId)) {

return interaction.reply({
content: "A game is already running in this channel.",
ephemeral: true
});

}

/* create game state */

games.create(interaction.channelId, {

type: "impostor",
hostId: interaction.user.id,
players: [interaction.user.id],
phase: "lobby"

});

/* trigger handler */

await interaction.reply({
content: "🎭 Impostor lobby created.",
ephemeral: false
});

}

};
