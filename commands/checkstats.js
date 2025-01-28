const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database'); // Import the SQLite database
const userReactionsMap = require('../data/userReactionsMap'); // Map of user IDs to reactions

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkstats')
    .setDescription('Check how many messages you’ve sent and how many times the 1/100 trigger occurred.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check stats for. Defaults to yourself.')
        .setRequired(false)
    ),
  async execute(interaction) {
    // Get the target user or default to the command user
    const user = interaction.options.getUser('user') || interaction.user;

    // Fetch stats from the database
    const stats = db.getUserStats.get(user.id);

    // Check if the user has a 1/100 reaction
    const hasOneHundredTrigger = !!userReactionsMap[user.id];

    // Create the embed
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${user.username}'s Stats`,
        iconURL: user.displayAvatarURL({ dynamic: true }),
      })
      .setColor(hasOneHundredTrigger ? '#00FF00' : '#FF0000')
      .setTimestamp();

    if (stats) {
      embed.addFields(
        { name: 'Messages Sent', value: `${stats.messages_sent}`, inline: true },
        { name: '1/100 Triggers', value: `${stats.triggers}`, inline: true }
      );
    } else {
      embed.setDescription(`${user.username} has no recorded stats yet.`);
    }

    if (!hasOneHundredTrigger) {
      embed.setFooter({
        text: "You don't have a 1/100, try being more interesting (or just ask planets nicely and he'll add one for you).",
      });
    }

    // Send the embed (non-ephemeral)
    await interaction.reply({ embeds: [embed] });
  },
};
