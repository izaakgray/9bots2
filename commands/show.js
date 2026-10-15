const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const lostDir = path.join(__dirname, '..', 'data', 'lost');
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('show')
    .setDescription('Show an image.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('lost')
        .setDescription('Show a random lost image.')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'lost') {
      // Read the folder each time so newly added images are picked up without a restart
      const images = fs
        .readdirSync(lostDir)
        .filter(file => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()));

      if (images.length === 0) {
        return interaction.reply({
          content: '❌ No images found in the lost folder.',
          ephemeral: true,
        });
      }

      const randomImage = images[Math.floor(Math.random() * images.length)];
      const attachment = new AttachmentBuilder(path.join(lostDir, randomImage), {
        name: `lost${path.extname(randomImage).toLowerCase()}`,
      });

      await interaction.reply({ files: [attachment] });
    }
  },
};
