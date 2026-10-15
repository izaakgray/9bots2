const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/hatingDatabase');
const { runReactionVote } = require('../utils/reactionVote');

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

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: `❌ Nice try, **${interaction.user}**! You can't give yourself hater points.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🔥 Hater Vote')
      .setDescription(`Is **${targetUser}** hating?`)
      .setFooter({ text: 'Upvote or downvote! Voting ends in 1 minute.' });

    const message = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    const { upvoters, downvoters } = await runReactionVote(message, 60 * 1000);
    const upvotes = upvoters.length;
    const downvotes = downvoters.length;

    // Check if the only upvoter is the person who initiated the command
    const onlySelfVoted = upvotes === 1 && upvoters[0] === interaction.user.id;

    if (upvotes > downvotes && !onlySelfVoted) {
      db.addPoint(targetUser.id);
      await interaction.followUp({
        content: `✅ **${targetUser}** was hating! Added to the leaderboard.`,
      });
    } else if (upvotes > downvotes && onlySelfVoted) {
      await interaction.followUp({
        content: `❌ Nice try, **${interaction.user}**! You can't give hater points when you're the only one who voted.`,
      });
    } else {
      // Add a hater point to the command initiator if the vote doesn't pass
      db.addPoint(interaction.user.id);
      await interaction.followUp({
        content: `❌ **${targetUser}** wasn't hating, ur all haters. **${interaction.user}** gets a hater point instead for false accusations!`,
      });
    }
  },
};
