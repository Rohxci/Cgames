const { EmbedBuilder } = require("discord.js");

module.exports = function createEmbed(title, description){

return new EmbedBuilder()
.setColor("#2b2d31")
.setTitle(title)
.setDescription(description);

};
