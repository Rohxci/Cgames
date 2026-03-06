async function lockChannel(channel, players){

const everyone = channel.guild.roles.everyone;

await channel.permissionOverwrites.edit(everyone,{
SendMessages:false
});

for(const player of players){
await channel.permissionOverwrites.edit(player,{
SendMessages:true
});
}

const originalName = channel.name;

await channel.setName("🔴busy");

return originalName;

}

async function unlockChannel(channel, originalName){

const everyone = channel.guild.roles.everyone;

await channel.permissionOverwrites.edit(everyone,{
SendMessages:true
});

if(originalName){
await channel.setName(originalName);
}

}

module.exports = {
lockChannel,
unlockChannel
};
