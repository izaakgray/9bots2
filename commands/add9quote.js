const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { quotesMessageCache } = require('../index'); // Import the cache
const fs = require('fs');
const path = require('path');

// Path to quotes.json
const quotesFilePath = path.join(__dirname, '..', 'data', 'quotes.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add9quote')
    .setDescription('Propose a new 9quote. If it gets enough votes within 1 hour, it will be added.')
    .addStringOption(option =>
      option
        .setName('quote')
        .setDescription('The text of your quote')
        .setRequired(true)
    ),

  async execute(interaction) {
    const proposedQuote = interaction.options.getString('quote', true);
    const oneHourMs = 60 * 60 * 1000;
    const deadline = Date.now() + oneHourMs;
    const deadlineEpoch = Math.floor(deadline / 1000);

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('New 9quote?!')
      .setDescription(
        `> "${proposedQuote}"\n\nYou have **until <t:${deadlineEpoch}:R>** to get **5 💀** reactions.`
      )
      .setFooter({
        text: 'Disclaimer: all 9quotes added are real and not fabricated. Anything 9dots says to the contrary is a LIE.',
      });

    const message = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    await message.react('💀');

    // Store the message in the cache
    quotesMessageCache.set(message.id, { quote: proposedQuote, channel: message.channel });

    const filter = (reaction, user) => reaction.emoji.name === '💀' && !user.bot;
    const collector = message.createReactionCollector({ filter, time: oneHourMs });

    collector.on('collect', (reaction) => {
      if (reaction.count >= 5) {
        collector.stop('enough_skulls');
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'enough_skulls') {
        const quotesData = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));
        quotesData.quotes.push(proposedQuote);
        fs.writeFileSync(quotesFilePath, JSON.stringify(quotesData, null, 2), 'utf-8');

        await interaction.followUp({
          content: `Added **"${proposedQuote}"** to the 9quotes!`,
        });

        quotesMessageCache.delete(message.id);
      } else {
        await interaction.followUp({
          content: `Time’s up! This quote did not receive 5 💀 reactions within 1 hour and was NOT added.`,
        });
      }
    });
  },
};
