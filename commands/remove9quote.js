const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to quotes.json
const quotesFilePath = path.join(__dirname, '..', 'data', 'quotes.json');

// Only allow planets (174163262596710400) to use this command
const ALLOWED_USER = '174163262596710400'; // planets user ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove9quote')
    .setDescription('Remove a 9quote (restricted to planets).')
    .addStringOption(option =>
      option
        .setName('quote')
        .setDescription('The text of the quote to remove')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Check if the user is allowed
    if (interaction.user.id !== ALLOWED_USER) {
      await interaction.reply({
        content: 'Only planets can remove 9quotes. Nice try though.',
        ephemeral: true,
      });
      return;
    }

    // Get the quote text
    const quoteText = interaction.options.getString('quote', true);

    try {
      // Read existing quotes
      const quotesData = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));
      
      // Find the index of the quote
      const quoteIndex = quotesData.quotes.findIndex(quote => 
        quote.toLowerCase().includes(quoteText.toLowerCase())
      );
      
      // Check if the quote was found
      if (quoteIndex === -1) {
        await interaction.reply({
          content: `No quote found containing: "${quoteText}"`,
          ephemeral: true,
        });
        return;
      }

      // Get the full quote to be removed (for display)
      const quoteToRemove = quotesData.quotes[quoteIndex];
      
      // Remove the quote
      quotesData.quotes.splice(quoteIndex, 1);

      // Save back to file
      fs.writeFileSync(quotesFilePath, JSON.stringify(quotesData, null, 2), 'utf-8');

      // Create an embed for the response
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('9Quote Removed')
        .setDescription(`The following quote has been removed:\n\n> "${quoteToRemove}"`)
        .setFooter({ text: `Quote has been deleted. There are now ${quotesData.quotes.length} quotes remaining.` });

      await interaction.reply({
        embeds: [embed],
        ephemeral: false,
      });
    } catch (err) {
      console.error('Error removing quote:', err);
      await interaction.reply({
        content: 'There was an error removing the quote. Please try again later.',
        ephemeral: true,
      });
    }
  },
}; 