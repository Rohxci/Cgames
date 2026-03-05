const GAME_CHANNELS = process.env.GAMES_CHANNELS
  ? process.env.GAMES_CHANNELS.split(",")
  : [];

module.exports = function channelCheck(interaction) {

if (GAME_CHANNELS.length === 0) return true;

if (!GAME_CHANNELS.includes(interaction.channelId)) {
return false;
}

return true;

};
