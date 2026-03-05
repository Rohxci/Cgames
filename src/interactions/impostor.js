const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const games = require("../systems/games");

const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;

const WORDS = {
  places: ["Beach","Airport","School","Restaurant","Hospital","Cinema"],
  food: ["Pizza","Burger","Pasta","Sushi","Ice Cream"],
  animals: ["Dog","Cat","Lion","Elephant","Giraffe"]
};

function random(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

function lobbyEmbed(state){
  const players = state.players.map(p=>`• <@${p}>`).join("\n") || "—";
  return {
    title:"🎭 Impostor Lobby",
    description:`Players: ${state.players.length}/${MAX_PLAYERS}

Host: <@${state.hostId}>

${players}`
  };
}

function lobbyButtons(){
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("imp_join")
        .setLabel("Join")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("imp_leave")
        .setLabel("Leave")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("imp_start")
        .setLabel("Start")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("imp_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

module.exports = {

  match(interaction){
    return interaction.customId?.startsWith("imp_");
  },

  async run(interaction){

    const state = games.get(interaction.channelId);
    if(!state || state.type !== "impostor") return;

    const id = interaction.customId;

    /* JOIN */

    if(id === "imp_join"){

      if(!state.players.includes(interaction.user.id)){
        state.players.push(interaction.user.id);
      }

      await interaction.update({
        embeds:[lobbyEmbed(state)],
        components:lobbyButtons()
      });

      return;
    }

    /* LEAVE */

    if(id === "imp_leave"){

      state.players = state.players.filter(p=>p!==interaction.user.id);

      await interaction.update({
        embeds:[lobbyEmbed(state)],
        components:lobbyButtons()
      });

      return;
    }

    /* CANCEL */

    if(id === "imp_cancel"){

      if(interaction.user.id !== state.hostId){
        return interaction.reply({
          content:"Only the host can cancel the game.",
          ephemeral:true
        });
      }

      games.delete(interaction.channelId);

      await interaction.update({
        content:"Game cancelled.",
        embeds:[],
        components:[]
      });

      return;
    }

    /* START GAME */

    if(id === "imp_start"){

      if(interaction.user.id !== state.hostId){
        return interaction.reply({
          content:"Only the host can start the game.",
          ephemeral:true
        });
      }

      if(state.players.length < MIN_PLAYERS){
        return interaction.reply({
          content:"Need at least 3 players.",
          ephemeral:true
        });
      }

      state.impostor = random(state.players);

      const categories = Object.keys(WORDS);
      state.category = random(categories);
      state.word = random(WORDS[state.category]);

      await interaction.update({
        embeds:[{
          title:"🎭 Reveal your role",
          description:"Click the button below to see your role."
        }],
        components:[
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("imp_reveal")
              .setLabel("Reveal Role")
              .setStyle(ButtonStyle.Success)
          )
        ]
      });

      return;
    }

    /* REVEAL ROLE */

    if(id === "imp_reveal"){

      if(interaction.user.id === state.impostor){

        await interaction.reply({
          ephemeral:true,
          embeds:[{
            title:"🎭 Your Role",
            description:`You are **THE IMPOSTOR**

Category: **${state.category}**

Blend in and don't get caught.`
          }]
        });

      }else{

        await interaction.reply({
          ephemeral:true,
          embeds:[{
            title:"🎭 Your Role",
            description:`You are **CREW**

Word: **${state.word}**

Find the impostor.`
          }]
        });

      }

      /* dopo il reveal appare il bottone voto */

      await interaction.message.edit({
        embeds:[{
          title:"💬 Discussion phase",
          description:"Discuss in chat.\n\nHost can start the final vote anytime."
        }],
        components:[
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("imp_vote_start")
              .setLabel("Start Final Vote")
              .setStyle(ButtonStyle.Primary)
          )
        ]
      });

      return;
    }

    /* START FINAL VOTE */

    if(id === "imp_vote_start"){

      if(interaction.user.id !== state.hostId){
        return interaction.reply({
          content:"Only the host can start the vote.",
          ephemeral:true
        });
      }

      const options = [];

      for(const p of state.players){

        const member = await interaction.guild.members.fetch(p).catch(()=>null);
        const name = member ? member.displayName : p;

        options.push({
          label:name.slice(0,100),
          value:p
        });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId("imp_vote")
        .setPlaceholder("Vote the impostor")
        .addOptions(options);

      await interaction.update({
        embeds:[{
          title:"🗳 Final Vote",
          description:"Select who you think is the impostor."
        }],
        components:[
          new ActionRowBuilder().addComponents(menu)
        ]
      });

      return;
    }

    /* VOTE */

    if(interaction.isStringSelectMenu() && id === "imp_vote"){

      state.votes = state.votes || {};
      state.votes[interaction.user.id] = interaction.values[0];

      await interaction.reply({
        content:"Vote registered.",
        ephemeral:true
      });

      if(Object.keys(state.votes).length === state.players.length){

        const counts = {};

        Object.values(state.votes).forEach(v=>{
          counts[v] = (counts[v]||0)+1;
        });

        let max = 0;
        let voted = null;

        for(const k in counts){
          if(counts[k] > max){
            max = counts[k];
            voted = k;
          }
        }

        const crewWin = voted === state.impostor;

        games.delete(interaction.channelId);

        await interaction.channel.send({
          embeds:[{
            title:"🎭 Game Over",
            description:`Impostor: <@${state.impostor}>

${crewWin ? "✅ Crew wins!" : "😈 Impostor wins!"}`
          }]
        });
      }

      return;
    }

  }

};
