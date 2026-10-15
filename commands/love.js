const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/hatingDatabase');
const { runReactionVote } = require('../utils/reactionVote');

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

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: `❌ Nice try, **${interaction.user}**! You can't remove your own hater points.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#00FF00') // Green for love
      .setTitle('💖 Love Vote')
      .setDescription(`Does **${targetUser}** deserve love?`)
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
      db.removePoint(targetUser.id);
      await interaction.followUp({
        content: `✅ **${targetUser}** deserves love! 1 hater point removed. Lover of all, simple leaf swaying in the wind.`,
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
  },
};
