// commands/create9quote.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { generateQuoteImage } = require('../utils/imageGenerator');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create9quote')
    .setDescription('Create a 9quote image with your own text.')
    .addStringOption(option =>
      option
        .setName('text')
        .setDescription('The text to put in the quote image')
        .setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('text', true);

    // Same hardcoded user as /9quote
    const fixedUserId = '590304012457214064';

    const member = await interaction.guild.members.fetch(fixedUserId).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: 'That user is not in this server, so we can’t fetch their nickname/color.',
        ephemeral: true,
      });
    }

    // Emoji images are fetched over the network, so give ourselves more than 3s
    await interaction.deferReply();

    const nickname = member.nickname || member.user.username;
    const roleColor =
      member.displayHexColor === '#000000' ? '#ffffff' : member.displayHexColor;
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });

    const imageBuffer = await generateQuoteImage({
      avatarURL,
      nickname,
      roleColor,
      quote: text,
    });

    const attachment = new AttachmentBuilder(imageBuffer, { name: 'quote.png' });
    return interaction.editReply({ files: [attachment] });
  },
};
