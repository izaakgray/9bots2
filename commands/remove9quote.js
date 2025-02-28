const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to quotes.json
const quotesFilePath = path.join(__dirname, '..', 'data', 'quotes.json');

// Only allow user 174163262596710400 (9dots) to use this command
const ALLOWED_USER = '174163262596710400';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove9quote')
    .setDescription('Remove a 9quote (restricted to 9dots).')
    .addIntegerOption(option =>
      option
        .setName('index')
        .setDescription('The index of the quote to remove (1-based)')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Check if the user is allowed
    if (interaction.user.id !== ALLOWED_USER) {
      await interaction.reply({
        content: 'Only 9dots can remove 9quotes. Nice try though.',
        ephemeral: true,
      });
      return;
    }

    // Get the index (1-based from user input)
    const index = interaction.options.getInteger('index', true);

    try {
      // Read existing quotes
      const quotesData = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));
      
      // Check if the index is valid
      if (index < 1 || index > quotesData.quotes.length) {
        await interaction.reply({
          content: `Invalid index. Please provide a number between 1 and ${quotesData.quotes.length}.`,
          ephemeral: true,
        });
        return;
      }

      // Get the quote to be removed (for display)
      const quoteToRemove = quotesData.quotes[index - 1];
      
      // Remove the quote (convert from 1-based to 0-based)
      quotesData.quotes.splice(index - 1, 1);

      // Save back to file
      fs.writeFileSync(quotesFilePath, JSON.stringify(quotesData, null, 2), 'utf-8');

      // Create an embed for the response
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('9Quote Removed')
        .setDescription(`The following quote has been removed:\n\n> "${quoteToRemove}"`)
        .setFooter({ text: `Quote #${index} has been deleted. There are now ${quotesData.quotes.length} quotes remaining.` });

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