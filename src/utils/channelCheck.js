const SERVER_ID = "1477760575575687182";

const ALLOWED_CHANNELS = [

"1479124545117097984",
"1479180040842252288",
"1479180070546309250",
"1479180141778309130",
"1479180177597530275",
"1479481732892987433",
"1479481762064105552"

];

module.exports = function channelCheck(interaction){

if(interaction.guildId !== SERVER_ID){

interaction.reply({
content:"This bot only works in the official server.",
ephemeral:true
});

return false;

}

if(!ALLOWED_CHANNELS.includes(interaction.channelId)){

interaction.reply({
content:"🎮 Please use game commands in a game channel.",
ephemeral:true
});

return false;

}

return true;

};
