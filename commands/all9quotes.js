const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to quotes.json
const quotesFilePath = path.join(__dirname, '..', 'data', 'quotes.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('all9quotes')
    .setDescription('Get every 9quote as a .txt file.'),

  async execute(interaction) {
    try {
      // Read fresh from disk so newly added/removed quotes are included
      const { quotes } = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));

      // One numbered quote per line
      const text = quotes.map((quote, i) => `${i + 1}. ${quote}`).join('\n');

      const attachment = new AttachmentBuilder(Buffer.from(text, 'utf-8'), { name: '9quotes.txt' });
      await interaction.reply({
        content: `All ${quotes.length} 9quotes:`,
        files: [attachment],
      });
    } catch (err) {
      console.error('Error exporting quotes:', err);
      await interaction.reply({
        content: 'There was an error exporting the quotes. Please try again later.',
        ephemeral: true,
      });
    }
  },
};
