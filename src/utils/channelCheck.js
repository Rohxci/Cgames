const GAMES_CHANNEL_ID = process.env.GAMES_CHANNEL_ID;

module.exports = function channelCheck(interaction) {

if (interaction.channelId !== GAMES_CHANNEL_ID) {

interaction.reply({
content: `🎮 Please use game commands in <#${GAMES_CHANNEL_ID}>`,
ephemeral: true
});

return false;

}

return true;

};
