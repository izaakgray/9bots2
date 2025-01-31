const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('1-100-stats')
    .setDescription('Check total 1/100 messages and triggers across all users.'),

  async execute(interaction) {
    await interaction.deferReply();

    db.getTotalStats((stats) => {
      const embed = new EmbedBuilder()
        .setColor('#FF4500') // Reddit orange for attention
        .setTitle('🎲 1/100 Stats Overview')
        .addFields(
          { name: '📨 Total Messages Sent:', value: `${stats.totalMessages}`, inline: true },
          { name: '🔥 Total 1/100 Triggers:', value: `${stats.totalTriggers}`, inline: true }
        )
        .setFooter({ text: 'Data collected from all users with a 1/100 chance.' });

      interaction.editReply({ embeds: [embed] });
    });
  },
};
