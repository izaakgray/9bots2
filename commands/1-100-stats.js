const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('1-100-stats')
    .setDescription('Check total 1/100 messages and triggers across all users.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const stats = db.getTotalStats(); // Fetch total messages & triggers

      const embed = new EmbedBuilder()
        .setColor('#FF4500') // Orange color for attention
        .setTitle('🎲 1/100 Stats Overview')
        .addFields(
          { name: '📨 Total Messages Sent:', value: `${stats.totalMessages || 0}`, inline: true },
          { name: '🔥 Total 1/100 Triggers:', value: `${stats.totalTriggers || 0}`, inline: true }
        )
        .setFooter({ text: 'Tracking all users with a 1/100 chance.' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching 1/100 stats:', error);
      await interaction.editReply('⚠️ An error occurred while retrieving 1/100 stats.');
    }
  },
};
