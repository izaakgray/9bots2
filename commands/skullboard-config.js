const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const skullboardDb = require('../utils/skullboardDatabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skullboard-config')
    .setDescription('View or update skullboard configuration')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current skullboard configuration')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('update')
        .setDescription('Update skullboard settings')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The skullboard channel')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('emoji')
            .setDescription('The skull emoji')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('threshold')
            .setDescription('Number of reactions needed')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(50)
        )
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable the skullboard')
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      await this.handleView(interaction);
    } else if (subcommand === 'update') {
      await this.handleUpdate(interaction);
    }
  },

  async handleView(interaction) {
    const config = skullboardDb.getConfig.get(interaction.guild.id);

    if (!config) {
      return await interaction.reply({
        content: '❌ Skullboard is not configured for this server. Use `/skullboard-setup` to set it up.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('💀 Skullboard Configuration')
      .setColor('#2f3136')
      .addFields(
        {
          name: '📺 Channel',
          value: config.skullboard_channel_id ? `<#${config.skullboard_channel_id}>` : 'Not set',
          inline: true
        },
        {
          name: '😵 Emoji',
          value: config.skull_emoji || '💀',
          inline: true
        },
        {
          name: '🎯 Threshold',
          value: config.skull_threshold?.toString() || '5',
          inline: true
        },
        {
          name: '⚡ Status',
          value: config.enabled ? '✅ Enabled' : '❌ Disabled',
          inline: true
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async handleUpdate(interaction) {
    const currentConfig = skullboardDb.getConfig.get(interaction.guild.id);

    if (!currentConfig) {
      return await interaction.reply({
        content: '❌ Skullboard is not configured for this server. Use `/skullboard-setup` to set it up first.',
        ephemeral: true
      });
    }

    const channel = interaction.options.getChannel('channel');
    const emoji = interaction.options.getString('emoji');
    const threshold = interaction.options.getInteger('threshold');
    const enabled = interaction.options.getBoolean('enabled');

    // Validate channel if provided
    if (channel && !channel.isTextBased()) {
      return await interaction.reply({
        content: '❌ The skullboard channel must be a text channel!',
        ephemeral: true
      });
    }

    if (channel && !channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
      return await interaction.reply({
        content: '❌ I don\'t have permission to send messages in that channel!',
        ephemeral: true
      });
    }

    try {
      // Update configuration
      skullboardDb.setConfig.run(
        interaction.guild.id,
        channel?.id || currentConfig.skullboard_channel_id,
        emoji || currentConfig.skull_emoji,
        threshold || currentConfig.skull_threshold,
        enabled !== null ? enabled : currentConfig.enabled
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ Skullboard Configuration Updated')
        .setColor('#00ff00')
        .setDescription('The skullboard configuration has been updated successfully!')
        .addFields(
          {
            name: '📺 Channel',
            value: channel ? `<#${channel.id}>` : `<#${currentConfig.skullboard_channel_id}>`,
            inline: true
          },
          {
            name: '😵 Emoji',
            value: emoji || currentConfig.skull_emoji,
            inline: true
          },
          {
            name: '🎯 Threshold',
            value: (threshold || currentConfig.skull_threshold).toString(),
            inline: true
          },
          {
            name: '⚡ Status',
            value: (enabled !== null ? enabled : currentConfig.enabled) ? '✅ Enabled' : '❌ Disabled',
            inline: true
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error updating skullboard config:', error);
      await interaction.reply({
        content: '❌ An error occurred while updating the configuration.',
        ephemeral: true
      });
    }
  },
};
