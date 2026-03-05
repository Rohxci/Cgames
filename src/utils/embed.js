const { EmbedBuilder } = require("discord.js");

const COLOR = "#ff4fd8";

function createEmbed(title, description) {

return new EmbedBuilder()
.setColor(COLOR)
.setTitle(title)
.setDescription(description)
.setFooter({ text: "Cornèr Games • Fun System" })
.setTimestamp();

}

module.exports = createEmbed;
