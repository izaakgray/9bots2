const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/hatingDatabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('the-hater-leaderboard')
    .setDescription('View the hater leaderboard.'),

  async execute(interaction) {
    let currentPage = 0;
    const pageSize = 5;

    const generateLeaderboardEmbed = (users, page, totalUsers) => {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🏆 The Hater Leaderboard')
        .setFooter({ text: `Page ${page + 1} of ${Math.ceil(totalUsers / pageSize)}` });

      if (users.length === 0) {
        embed.setDescription('No haters have been judged yet.');
      } else {
        const leaderboardText = users
          .map((user, index) => `**#${page * pageSize + index + 1}** <@${user.user_id}> - **${user.points} points**`)
          .join('\n');
        embed.setDescription(leaderboardText);
      }

      return embed;
    };

    db.getTotalUsers((totalUsers) => {
      db.getLeaderboard(pageSize, currentPage * pageSize, async (users) => {
        const leaderboardMessage = await interaction.reply({
          embeds: [generateLeaderboardEmbed(users, currentPage, totalUsers)],
          fetchReply: true,
        });

        if (totalUsers > pageSize) {
          await leaderboardMessage.react('⬅️');
          await leaderboardMessage.react('➡️');

          const filter = (reaction, user) =>
            ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === interaction.user.id;
          const collector = leaderboardMessage.createReactionCollector({ filter, time: 60 * 1000 });

          collector.on('collect', async (reaction) => {
            if (reaction.emoji.name === '➡️' && (currentPage + 1) * pageSize < totalUsers) {
              currentPage++;
            } else if (reaction.emoji.name === '⬅️' && currentPage > 0) {
              currentPage--;
            }

            db.getLeaderboard(pageSize, currentPage * pageSize, async (updatedUsers) => {
              await leaderboardMessage.edit({
                embeds: [generateLeaderboardEmbed(updatedUsers, currentPage, totalUsers)],
              });
            });

            await reaction.users.remove(interaction.user.id);
          });
        }
      });
    });
  },
};
