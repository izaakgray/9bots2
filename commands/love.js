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
      const upvotes = (message.reactions.cache.get('⬆️')?.count || 1) - 1; // Remove bot's reaction
      const downvotes = (message.reactions.cache.get('⬇️')?.count || 1) - 1;

      // Get the users who upvoted
      const upvoters = await message.reactions.cache.get('⬆️')?.users.fetch();
      // Remove the bot from the upvoters
      const botId = message.author.id; // The bot's ID
      upvoters?.delete(botId);
      
      // Check if the only upvoter is the person who initiated the command
      const onlySelfVoted = upvotes === 1 && upvoters?.has(interaction.user.id) && upvoters?.size === 1;
      
      // Check if the target user is the same as the command initiator
      const isSelfTarget = targetUser.id === interaction.user.id;

      if (upvotes > downvotes && !onlySelfVoted && !isSelfTarget) {
        db.removePoint(targetUser.id);
        await interaction.followUp({
          content: `✅ **${targetUser}** deserves love! 1 hater point removed. Lover of all, simple leaf swaying in the wind.`,
        });
      } else if (isSelfTarget) {
        await interaction.followUp({
          content: `❌ Nice try, **${interaction.user}**! You can't remove your own hater points.`,
        });
      } else if (upvotes > downvotes && onlySelfVoted) {
        await interaction.followUp({
          content: `❌ Nice try, **${interaction.user}**! You can't remove hater points when you're the only one who voted.`,
        });
      } else {
        await interaction.followUp({
          content: `❌ **${targetUser}** is still a hater...`,
        });
      }
    });
  },
};
