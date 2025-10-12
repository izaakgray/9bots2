const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const SkullboardManager = require('../utils/skullboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skullboard-setup')
    .setDescription('Setup the skullboard for this server')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel where skullboard messages will be posted')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('emoji')
        .setDescription('The emoji to use for skullboard (default: 💀)')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('threshold')
        .setDescription('Number of skull reactions needed (default: 5)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const emoji = interaction.options.getString('emoji') || '💀';
    const threshold = interaction.options.getInteger('threshold') || 5;

    // Check if the channel is text-based
    if (!channel.isTextBased()) {
      return await interaction.reply({
        content: '❌ The skullboard channel must be a text channel!',
        ephemeral: true
      });
    }

    // Check if the bot has permission to send messages in the channel
    if (!channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
      return await interaction.reply({
        content: '❌ I don\'t have permission to send messages in that channel!',
        ephemeral: true
      });
    }

    try {
      // Setup the skullboard
      const skullboardManager = new SkullboardManager(interaction.client);
      const success = await skullboardManager.setupSkullboard(
        interaction.guild.id,
        channel.id,
        emoji,
        threshold
      );

      if (success) {
        await interaction.reply({
          content: `✅ Skullboard setup complete!\n\n**Channel:** ${channel}\n**Emoji:** ${emoji}\n**Threshold:** ${threshold} reaction${threshold > 1 ? 's' : ''}\n\nNow when messages get ${threshold} ${emoji} reaction${threshold > 1 ? 's' : ''}, they'll be posted to the skullboard!`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '❌ Failed to setup skullboard. Please try again.',
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error setting up skullboard:', error);
      await interaction.reply({
        content: '❌ An error occurred while setting up the skullboard.',
        ephemeral: true
      });
    }
  },
};
