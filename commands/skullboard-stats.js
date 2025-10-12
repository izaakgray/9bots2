const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const skullboardDb = require('../utils/skullboardDatabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skullboard-stats')
    .setDescription('View skullboard statistics for this server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('overview')
        .setDescription('View general skullboard statistics')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('top')
        .setDescription('View the most skulled messages')
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of messages to show (default: 10, max: 25)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'overview') {
      await this.handleOverview(interaction);
    } else if (subcommand === 'top') {
      await this.handleTop(interaction);
    }
  },

  async handleOverview(interaction) {
    const config = skullboardDb.getConfig.get(interaction.guild.id);

    if (!config) {
      return await interaction.reply({
        content: '❌ Skullboard is not configured for this server.',
        ephemeral: true
      });
    }

    const totalEntries = skullboardDb.getTotalEntries.get(interaction.guild.id);
    const recentEntries = skullboardDb.getRecentEntries.all(interaction.guild.id, 5, 0);

    // Calculate total skulls
    const totalSkulls = recentEntries.reduce((sum, entry) => sum + entry.skull_count, 0);

    const embed = new EmbedBuilder()
      .setTitle('💀 Skullboard Statistics')
      .setColor('#2f3136')
      .addFields(
        {
          name: '📊 Total Messages',
          value: totalEntries.total?.toString() || '0',
          inline: true
        },
        {
          name: '😵 Total Skulls',
          value: totalSkulls.toString(),
          inline: true
        },
        {
          name: '📺 Channel',
          value: `<#${config.skullboard_channel_id}>`,
          inline: true
        },
        {
          name: '🎯 Threshold',
          value: config.skull_threshold.toString(),
          inline: true
        },
        {
          name: '⚡ Status',
          value: config.enabled ? '✅ Enabled' : '❌ Disabled',
          inline: true
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async handleTop(interaction) {
    const config = skullboardDb.getConfig.get(interaction.guild.id);

    if (!config) {
      return await interaction.reply({
        content: '❌ Skullboard is not configured for this server.',
        ephemeral: true
      });
    }

    const limit = interaction.options.getInteger('limit') || 10;
    const topEntries = skullboardDb.getTopSkulled.all(interaction.guild.id, limit);

    if (topEntries.length === 0) {
      return await interaction.reply({
        content: '❌ No skullboard entries found.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`💀 Top ${limit} Most Skulled Messages`)
      .setColor('#2f3136')
      .setTimestamp();

    let description = '';
    for (let i = 0; i < topEntries.length; i++) {
      const entry = topEntries[i];
      const content = entry.content ? 
        (entry.content.length > 100 ? entry.content.substring(0, 100) + '...' : entry.content) : 
        '*No content*';
      
      description += `**${i + 1}.** ${entry.skull_count} 😵 - [Jump to message](${`https://discord.com/channels/${entry.guild_id}/${entry.channel_id}/${entry.message_id}`})\n`;
      description += `*${content}*\n\n`;
    }

    embed.setDescription(description);

    await interaction.reply({ embeds: [embed] });
  },
};
