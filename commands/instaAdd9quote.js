const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to quotes.json
const quotesFilePath = path.join(__dirname, '..', 'data', 'quotes.json');

// Allowed user IDs
const ALLOWED_USERS = ['174163262596710400', '784019976381005844'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insta-add-9quote')
    .setDescription('Instantly add a 9quote (restricted to specific users).')
    .addStringOption(option =>
      option
        .setName('quote')
        .setDescription('The text of the 9quote to add')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Check if the user is allowed
    if (!ALLOWED_USERS.includes(interaction.user.id)) {
      await interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true,
      });
      return;
    }

    // Get the quote
    const quote = interaction.options.getString('quote', true);

    try {
      // Read existing quotes
      const quotesData = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));

      // Add the new quote
      quotesData.quotes.push(quote);

      // Save back to file
      fs.writeFileSync(quotesFilePath, JSON.stringify(quotesData, null, 2), 'utf-8');

      await interaction.reply({
        content: `The quote **"${quote}"** has been added successfully!`,
        ephemeral: false,
      });
    } catch (err) {
      console.error('Error adding quote:', err);
      await interaction.reply({
        content: 'There was an error adding the quote. Please try again later.',
        ephemeral: true,
      });
    }
  },
};
