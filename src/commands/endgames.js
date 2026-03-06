const {
SlashCommandBuilder,
PermissionFlagsBits
} = require("discord.js");

const games = require("../systems/games");

module.exports = {

data: new SlashCommandBuilder()
.setName("endgames")
.setDescription("Force end all active games")
.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

async execute(interaction){

const activeGames = Object.keys(games._games || {});

if(activeGames.length === 0){

return interaction.reply({
content:"No active games.",
ephemeral:true
});

}

for(const channelId of activeGames){

try{

const channel = await interaction.client.channels.fetch(channelId);

if(channel){

channel.send("🛑 A staff member ended the game.");

}

}catch{}

games.delete(channelId);

}

await interaction.reply({
content:`🛑 ${activeGames.length} game(s) terminated.`,
ephemeral:true
});

}

};
