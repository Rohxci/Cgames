const GAME_CHANNELS = [
"1479124545117097984",
"1479180040842252288",
"1479180070546309250",
"1479180141778309130",
"1479180177597530275"
];

module.exports = function channelCheck(interaction) {

if (!GAME_CHANNELS.includes(interaction.channelId)) {
return false;
}

return true;

};
