const GAME_CHANNELS = process.env.GAMES_CHANNELS
  ? process.env.GAMES_CHANNELS.split(",")
  : [];

module.exports = async function channelCheck(interaction) {

if (GAME_CHANNELS.length === 0) return true;

if (!GAME_CHANNELS.includes(interaction.channelId)) {

await interaction.reply({
content: `🎮 Please use game commands in a games channel.`,
ephemeral: true
});

return false;

}

return true;

};
