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
      .setTitle('Hater Vote')
      .setDescription(`Is ${targetUser} hating?`)
      .setFooter({ text: 'Upvote or downvote! Voting ends in 5 minutes.' });

    const message = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    await message.react('⬆️'); // Upvote
    await message.react('⬇️'); // Downvote

    // Start a reaction collector
    const filter = (reaction) => ['⬆️', '⬇️'].includes(reaction.emoji.name);
    const collector = message.createReactionCollector({ filter, time: 5 * 60 * 1000 });

    collector.on('end', async (collected) => {
      const upvotes = collected.get('⬆️')?.count || 1; // Includes bot's reaction
      const downvotes = collected.get('⬇️')?.count || 1;

      const totalVotes = upvotes + downvotes;
      const upvotePercentage = upvotes / totalVotes;

      if (upvotePercentage > 2 / 3) {
        db.addPoint(targetUser.id);
        await interaction.followUp({
          content: `${targetUser} was hating, added to the leaderboard.`,
        });
      } else {
        await interaction.followUp({
          content: `${targetUser} wasn't hating, ur all haters.`,
        });
      }
    });
  },
};
