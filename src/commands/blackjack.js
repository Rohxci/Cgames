const {
SlashCommandBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

const games = require("../systems/games");
const createEmbed = require("../utils/embed");

module.exports = {

data: new SlashCommandBuilder()
.setName("blackjack")
.setDescription("Play Blackjack against the dealer"),

async execute(interaction){

/* prevent multiple games */

if(games.get(interaction.channelId)){

return interaction.reply({
embeds:[createEmbed("❌ Game running","A game is already running in this channel.")]
});

}

/* rules embed */

const embed = createEmbed(
"♠️ Blackjack",
`Beat the dealer by getting closer to **21**

• Number cards keep their value  
• J, Q, K = 10  
• A = 1 or 11  

**Hit** → draw a card  
**Stand** → stop drawing  
**Surrender** → give up the game  

Dealer draws until **17**`
);

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId(`bj_start_${interaction.user.id}`)
.setLabel("Start")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId(`bj_cancel_${interaction.user.id}`)
.setLabel("Cancel")
.setStyle(ButtonStyle.Danger)

);

await interaction.reply({
embeds:[embed],
components:[row]
});

}

};
