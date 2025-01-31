const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/hatingDatabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hating')
    .setDescription('Let\'s decide if they were hating rn..')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to judge')
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🔥 Hater Vote')
      .setDescription(`Is **${targetUser}** hating?`)
      .setFooter({ text: 'Upvote or downvote! Voting ends in 1 minute.' });

    const message = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    await message.react('⬆️'); // Upvote
    await message.react('⬇️'); // Downvote

    const voteTracker = new Map(); // Tracks which users have voted & prevents double votes

    // Reaction collector logic
    const filter = (reaction, user) => {
      if (user.bot) return false; // Ignore bot reactions
      return ['⬆️', '⬇️'].includes(reaction.emoji.name);
    };

    const collector = message.createReactionCollector({ filter, time: 60 * 1000 });

    collector.on('collect', (reaction, user) => {
      const existingVote = voteTracker.get(user.id);

      // Prevent voting for both up & down
      if (existingVote && existingVote !== reaction.emoji.name) {
        reaction.users.remove(user.id);
      } else {
        voteTracker.set(user.id, reaction.emoji.name);
      }
    });

    collector.on('end', async () => {
      const upvotes = message.reactions.cache.get('⬆️')?.count || 1; // Includes bot's reaction
      const downvotes = message.reactions.cache.get('⬇️')?.count || 1;

      const totalVotes = upvotes + downvotes - 2; // Remove bot's reactions
      const upvotePercentage = upvotes / (totalVotes || 1); // Avoid divide by zero

      if (upvotePercentage > 0.5) {
        db.addPoint(targetUser.id);
        await interaction.followUp({
          content: `✅ **${targetUser}** was hating! Added to the leaderboard.`,
        });
      } else {
        await interaction.followUp({
          content: `❌ **${targetUser}** wasn't hating, ur all haters.`,
        });
      }
    });
  },
};
