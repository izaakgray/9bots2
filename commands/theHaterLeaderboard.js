const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const db = require('../utils/hatingDatabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('the-hater-leaderboard')
    .setDescription('View the hater leaderboard.'),

  async execute(interaction) {
    // We now show 10 users per page
    const pageSize = 10;
    let currentPage = 0;

    // Helper to display rank icons for #1, #2, #3
    const getRankLabel = (position) => {
      switch (position) {
        case 1:
          return '🥇';
        case 2:
          return '🥈';
        case 3:
          return '🥉';
        default:
          return `#${position}`;
      }
    };

    /**
     * Generates an embed representing one "page" of the leaderboard.
     *
     * @param {Array} users - The slice of users for this page.
     * @param {number} page - The current page index (0-based).
     * @param {number} totalUsers - The total count of users in the leaderboard.
     */
    const generateLeaderboardEmbed = (users, page, totalUsers) => {
      const totalPages = Math.ceil(totalUsers / pageSize);

      // Create the embed
      const embed = new EmbedBuilder()
        // Choose a nicer color, e.g. Discord blurple
        .setColor('#5865F2')
        .setTitle('🏆 The Hater Leaderboard')
        // You can add a thumbnail or an image to spruce it up
        .setThumbnail('https://static.vecteezy.com/system/resources/previews/019/013/598/non_2x/medal-awards-and-trophies-png.png')
        .setFooter({
          text: `Page ${page + 1} of ${totalPages} | Total Haters: ${totalUsers}`,
        });

      if (users.length === 0) {
        embed.setDescription('No haters have been judged yet.');
      } else {
        // Build the text for each user on this page
        const leaderboardText = users
          .map((user, index) => {
            const overallPosition = page * pageSize + index + 1;
            const rankLabel = getRankLabel(overallPosition);
            return `**${rankLabel}** <@${user.user_id}> — **${user.points} points**`;
          })
          .join('\n');

        embed.setDescription(leaderboardText);
      }

      return embed;
    };

    // Retrieve the total number of users
    db.getTotalUsers(async (totalUsers) => {
      // If no one is on the leaderboard, just send a single embed
      if (totalUsers === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#5865F2')
              .setTitle('🏆 The Hater Leaderboard')
              .setThumbnail('https://static.vecteezy.com/system/resources/previews/019/013/598/non_2x/medal-awards-and-trophies-png.png')
              .setDescription('No haters have been judged yet.'),
          ],
        });
      }

      // Otherwise, fetch the first page from the DB
      db.getLeaderboard(pageSize, currentPage * pageSize, async (users) => {
        // Build the first page's embed
        let embed = generateLeaderboardEmbed(users, currentPage, totalUsers);

        // Create the initial row of buttons
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('⬅️ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),

          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next ➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled((currentPage + 1) * pageSize >= totalUsers)
        );

        // Send the initial response
        const leaderboardMessage = await interaction.reply({
          embeds: [embed],
          components: [row],
          fetchReply: true,
        });

        // If there’s only one page, don’t bother collecting button presses
        if (totalUsers <= pageSize) return;

        // Create a collector that lasts for 10 minutes (600 seconds)
        const filter = (i) => i.user.id === interaction.user.id;
        const collector = leaderboardMessage.createMessageComponentCollector({
          filter,
          time: 600_000, // 10 minutes in milliseconds
        });

        collector.on('collect', async (i) => {
          // Acknowledge the button click to avoid "interaction failed"
          await i.deferUpdate();

          // Move the page index depending on which button was clicked
          if (i.customId === 'next') {
            if ((currentPage + 1) * pageSize < totalUsers) {
              currentPage++;
            }
          } else if (i.customId === 'prev') {
            if (currentPage > 0) {
              currentPage--;
            }
          }

          // Fetch the new slice of data for the updated page
          db.getLeaderboard(pageSize, currentPage * pageSize, async (updatedUsers) => {
            embed = generateLeaderboardEmbed(updatedUsers, currentPage, totalUsers);

            // Update the button states (disabled if on first or last page)
            const newRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('⬅️ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),

              new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next ➡️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled((currentPage + 1) * pageSize >= totalUsers)
            );

            // Edit the original message with the updated embed and buttons
            await leaderboardMessage.edit({
              embeds: [embed],
              components: [newRow],
            });
          });
        });

        // Once the collector ends (10 minutes pass), disable the buttons
        collector.on('end', () => {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('prev')
              .setLabel('⬅️ Previous')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),

            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next ➡️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

          leaderboardMessage
            .edit({
              components: [disabledRow],
            })
            .catch(console.error);
        });
      });
    });
  },
};
