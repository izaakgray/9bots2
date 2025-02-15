const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/hatingDatabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('love')
    .setDescription('Let\'s decide if they deserve love rn..')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to judge')
        .setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');

    const embed = new EmbedBuilder()
      .setColor('#00FF00') // Green for love
      .setTitle('💖 Love Vote')
      .setDescription(`Does **${targetUser}** deserve love?`)
      .setFooter({ text: 'Upvote or downvote! Voting ends in 1 minute.' });

    const message = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    await message.react('⬆️'); // Upvote
    await message.react('⬇️'); // Downvote

    const voteTracker = new Map(); // Tracks votes & allows switching

    const filter = (reaction, user) => {
      if (user.bot) return false;
      return ['⬆️', '⬇️'].includes(reaction.emoji.name);
    };

    const collector = message.createReactionCollector({ filter, time: 60 * 1000 });

    collector.on('collect', async (reaction, user) => {
      const existingVote = voteTracker.get(user.id);

      if (existingVote === reaction.emoji.name) {
        // Clicking again removes vote
        voteTracker.delete(user.id);
        await reaction.users.remove(user.id);
      } else {
        // Switch votes (remove previous vote)
        if (existingVote) {
          const prevReaction = message.reactions.cache.get(existingVote);
          if (prevReaction) await prevReaction.users.remove(user.id);
        }

        voteTracker.set(user.id, reaction.emoji.name);
      }
    });

    collector.on('end', async () => {
      const upvotes = (message.reactions.cache.get('⬆️')?.count || 1) - 1; // Remove bot’s reaction
      const downvotes = (message.reactions.cache.get('⬇️')?.count || 1) - 1;

      if (upvotes > downvotes) {
        db.removePoint(targetUser.id);
        await interaction.followUp({
          content: `✅ **${targetUser}** deserves love! 1 hater point removed. Lover of all, simple leaf swaying in the wind.`,
        });
      } else {
        await interaction.followUp({
          content: `❌ **${targetUser}** is still a hater...`,
        });
      }
    });
  },
};
