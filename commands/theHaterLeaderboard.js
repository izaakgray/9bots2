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
    let currentPage = 0;
    const pageSize = 5;

    /**
     * Generates an embed representing one "page" of the leaderboard.
     *
     * @param {Array} users - The slice of users for this page.
     * @param {number} page - The current page index (0-based).
     * @param {number} totalUsers - The total count of users in the leaderboard.
     */
    const generateLeaderboardEmbed = (users, page, totalUsers) => {
      const totalPages = Math.ceil(totalUsers / pageSize);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🏆 The Hater Leaderboard')
        .setFooter({ text: `Page ${page + 1} of ${totalPages} | Total Haters: ${totalUsers}` });

      if (users.length === 0) {
        embed.setDescription('No haters have been judged yet.');
      } else {
        const leaderboardText = users
          .map((user, index) => 
            `**#${page * pageSize + index + 1}** <@${user.user_id}> - **${user.points} points**`
          )
          .join('\n');

        embed.setDescription(leaderboardText);
      }

      return embed;
    };

    // Retrieve total number of users in the database
    db.getTotalUsers(async (totalUsers) => {
      // If there are no users at all, just reply with a single embed
      if (totalUsers === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('🏆 The Hater Leaderboard')
              .setDescription('No haters have been judged yet.'),
          ],
        });
      }

      // Otherwise, get the users for the first page
      db.getLeaderboard(pageSize, currentPage * pageSize, async (users) => {
        // Build initial embed
        let embed = generateLeaderboardEmbed(users, currentPage, totalUsers);

        // Build the row of buttons
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('⬅️ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0), // disabled if on first page

          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next ➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled((currentPage + 1) * pageSize >= totalUsers) // disabled if on last page
        );

        // Send the initial reply with embed and buttons
        const leaderboardMessage = await interaction.reply({
          embeds: [embed],
          components: [row],
          fetchReply: true,
        });

        // If there's only one page, no need to collect button interactions
        if (totalUsers <= pageSize) return;

        // Create a message component collector (for the buttons)
        const filter = (i) => {
          // Ensure the button press is from the same user who ran the command
          return i.user.id === interaction.user.id;
        };

        const collector = leaderboardMessage.createMessageComponentCollector({
          filter,
          time: 60_000, // 60 seconds
        });

        collector.on('collect', async (i) => {
          // We acknowledge the button press to avoid "This interaction failed" message
          await i.deferUpdate();

          if (i.customId === 'next') {
            if ((currentPage + 1) * pageSize < totalUsers) {
              currentPage++;
            }
          } else if (i.customId === 'prev') {
            if (currentPage > 0) {
              currentPage--;
            }
          }

          // Fetch the updated leaderboard slice
          db.getLeaderboard(pageSize, currentPage * pageSize, async (updatedUsers) => {
            // Rebuild the embed
            embed = generateLeaderboardEmbed(updatedUsers, currentPage, totalUsers);

            // Update button states
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

        collector.on('end', () => {
          // Once time is up, disable the buttons to prevent further clicks
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

          leaderboardMessage.edit({
            components: [disabledRow],
          }).catch(console.error);
        });
      });
    });
  },
};
