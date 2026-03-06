const {
SlashCommandBuilder,
PermissionFlagsBits
} = require("discord.js");

const games = require("../systems/games");

/* channels where games can exist */

const GAME_CHANNELS = [
"1479124545117097984",
"1479180040842252288",
"1479180070546309250",
"1479180141778309130",
"1479180177597530275",
"1479481732892987433",
"1479481762064105552"
];

module.exports = {

data: new SlashCommandBuilder()
.setName("endgames")
.setDescription("Force end all active games")
.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

async execute(interaction){

let ended = 0;

for(const id of GAME_CHANNELS){

const game = games.get(id);

if(!game) continue;

try{

const channel = await interaction.client.channels.fetch(id);

if(channel){
await channel.send("🛑 A staff member ended the game.");
}

}catch{}

games.delete(id);

ended++;

}

if(ended === 0){

return interaction.reply({
content:"No active games.",
ephemeral:true
});

}

await interaction.reply({
content:`🛑 ${ended} game(s) terminated.`,
ephemeral:true
});

}

};
