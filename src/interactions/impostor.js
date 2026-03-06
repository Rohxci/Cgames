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
  places: ["Beach", "Airport", "School", "Restaurant", "Hospital", "Cinema"],
  food: ["Pizza", "Burger", "Pasta", "Sushi", "Ice Cream"],
  animals: ["Dog", "Cat", "Lion", "Elephant", "Giraffe"]
};

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function lobbyEmbed(state) {
  const players = state.players.map(p => `• <@${p}>`).join("\n") || "—";

  return {
    title: "🎭 Impostor Lobby",
    description: `Players: ${state.players.length}/${MAX_PLAYERS}

Host: <@${state.hostId}>

**How it works**
• One player is the impostor
• Normal players get the secret word
• The impostor only gets the category
• Discuss in chat
• The host starts the final vote
• Vote the impostor to win

${players}`
  };
}

function lobbyButtons() {
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

function startedButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("imp_reveal")
        .setLabel("Reveal Role")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("imp_vote_start")
        .setLabel("Start Final Vote")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function voteMenu(state, guild) {
  const options = state.players.map(playerId => {
    const member = guild.members.cache.get(playerId);
    const label = member ? member.displayName : playerId;

    return {
      label: label.slice(0, 100),
      value: playerId
    };
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("imp_vote")
      .setPlaceholder("Vote the impostor")
      .addOptions(options)
  );
}

module.exports = {
  match(interaction) {
    const id = interaction.customId;
    return typeof id === "string" && id.startsWith("imp_");
  },

  async run(interaction) {
    const game = games.get(interaction.channelId);
    if (!game || game.type !== "impostor") return;

    const id = interaction.customId;

    /* JOIN */

    if (id === "imp_join") {
      if (game.phase !== "lobby") {
        return interaction.reply({
          content: "The game has already started.",
          ephemeral: true
        });
      }

      if (game.players.includes(interaction.user.id)) {
        return interaction.reply({
          content: "You are already in the lobby.",
          ephemeral: true
        });
      }

      if (game.players.length >= MAX_PLAYERS) {
        return interaction.reply({
          content: "The lobby is full.",
          ephemeral: true
        });
      }

      game.players.push(interaction.user.id);

      await interaction.update({
        embeds: [lobbyEmbed(game)],
        components: lobbyButtons()
      });

      return;
    }

    /* LEAVE */

    if (id === "imp_leave") {
      if (game.phase !== "lobby") {
        return interaction.reply({
          content: "You cannot leave after the game has started.",
          ephemeral: true
        });
      }

      if (!game.players.includes(interaction.user.id)) {
        return interaction.reply({
          content: "You are not in the lobby.",
          ephemeral: true
        });
      }

      game.players = game.players.filter(p => p !== interaction.user.id);

      if (game.players.length === 0) {
        games.delete(interaction.channelId);

        await interaction.update({
          content: "Lobby closed.",
          embeds: [],
          components: []
        });

        return;
      }

      if (game.hostId === interaction.user.id) {
        game.hostId = game.players[0];
      }

      await interaction.update({
        embeds: [lobbyEmbed(game)],
        components: lobbyButtons()
      });

      return;
    }

    /* CANCEL */

    if (id === "imp_cancel") {
      if (interaction.user.id !== game.hostId) {
        return interaction.reply({
          content: "Only the host can cancel the game.",
          ephemeral: true
        });
      }

      games.delete(interaction.channelId);

      await interaction.update({
        embeds: [],
        components: [],
        content: "Game cancelled."
      });

      return;
    }

    /* START */

    if (id === "imp_start") {
      if (interaction.user.id !== game.hostId) {
        return interaction.reply({
          content: "Only the host can start the game.",
          ephemeral: true
        });
      }

      if (game.players.length < MIN_PLAYERS) {
        return interaction.reply({
          content: "Need at least 3 players.",
          ephemeral: true
        });
      }

      const categories = Object.keys(WORDS);
      game.category = random(categories);
      game.word = random(WORDS[game.category]);
      game.impostorId = random(game.players);
      game.phase = "started";
      game.revealed = [];
      game.votes = {};

      await interaction.update({
        embeds: [{
          title: "🎭 Game Started",
          description: `Click **Reveal Role** to see your role privately.

Then discuss in chat.

When everyone is ready, the host can press **Start Final Vote**.`
        }],
        components: startedButtons()
      });

      return;
    }

    /* REVEAL ROLE */

    if (id === "imp_reveal") {
      if (!game.players.includes(interaction.user.id)) {
        return interaction.reply({
          content: "You are not in this game.",
          ephemeral: true
        });
      }

      if (interaction.user.id === game.impostorId) {
        await interaction.reply({
          ephemeral: true,
          embeds: [{
            title: "🎭 Your Role",
            description: `You are **THE IMPOSTOR**

Category: **${game.category}**

Blend in and do not get caught.`
          }]
        });
      } else {
        await interaction.reply({
          ephemeral: true,
          embeds: [{
            title: "🎭 Your Role",
            description: `You are **CREW**

Word: **${game.word}**

Find the impostor.`
          }]
        });
      }

      return;
    }

    /* START FINAL VOTE */

    if (id === "imp_vote_start") {
      if (interaction.user.id !== game.hostId) {
        return interaction.reply({
          content: "Only the host can start the vote.",
          ephemeral: true
        });
      }

      if (game.phase !== "started") {
        return interaction.reply({
          content: "Voting is not available right now.",
          ephemeral: true
        });
      }

      game.phase = "voting";

      await interaction.update({
        embeds: [{
          title: "🗳 Final Vote",
          description: "Choose who you think is the impostor."
        }],
        components: [voteMenu(game, interaction.guild)]
      });

      return;
    }

    /* FINAL VOTE */

    if (id === "imp_vote" && interaction.isStringSelectMenu()) {
      if (!game.players.includes(interaction.user.id)) {
        return interaction.reply({
          content: "You are not in this game.",
          ephemeral: true
        });
      }

      game.votes[interaction.user.id] = interaction.values[0];

      await interaction.reply({
        content: "Vote registered.",
        ephemeral: true
      });

      if (Object.keys(game.votes).length === game.players.length) {
        const counts = {};

        for (const votedId of Object.values(game.votes)) {
          counts[votedId] = (counts[votedId] || 0) + 1;
        }

        let votedOut = null;
        let maxVotes = 0;

        for (const playerId of Object.keys(counts)) {
          if (counts[playerId] > maxVotes) {
            maxVotes = counts[playerId];
            votedOut = playerId;
          }
        }

        const crewWin = votedOut === game.impostorId;

        games.delete(interaction.channelId);

        await interaction.channel.send({
          embeds: [{
            title: "🎭 Game Over",
            description: `Impostor: <@${game.impostorId}>
Word: **${game.word}**

${crewWin ? "✅ Crew wins!" : "😈 Impostor wins!"}`
          }]
        });
      }

      return;
    }
  }
};
