// commands/9quote.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { generateQuoteImage } = require('../utils/imageGenerator');
const { quotes } = require('../data/quotes.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('9quote')
    .setDescription('Get a random 9quote.'),
    
  async execute(interaction) {
    // 1) Hardcode the user ID, but fetch them as a GUILD MEMBER
    const fixedUserId = '590304012457214064';

    // Make sure you have the GuildMembers intent enabled in your index.js
    // Also, ensure the user is actually in this guild; otherwise, "member" will be null
    const member = await interaction.guild.members.fetch(fixedUserId).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: 'That user is not in this server, so we can’t fetch their nickname/color.',
        ephemeral: true,
      });
    }

    // 2) Grab name and color from the member
    const nickname = member.nickname || member.user.username;
    const roleColor =
      member.displayHexColor === '#000000' ? '#ffffff' : member.displayHexColor;

    // 3) Choose a random quote
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // 4) Get the avatar URL (from the user object)
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });

    // 5) Generate the image using your utility
    const imageBuffer = await generateQuoteImage({
      avatarURL,
      nickname,
      roleColor,
      quote: randomQuote,
    });

    // 6) Reply with the attachment
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'quote.png' });
    return interaction.reply({ files: [attachment] });
  },
};
