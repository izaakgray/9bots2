const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Adjust this path if your quotes.json is elsewhere
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
    // 1) Get the submitted quote
    const proposedQuote = interaction.options.getString('quote', true);

    // 2) Calculate 1-hour deadline
    const oneHourMs = 60 * 60 * 1000;
    const deadline = Date.now() + oneHourMs;
    const deadlineEpoch = Math.floor(deadline / 1000); // for <t:xxx:R>

    // 3) Build the embed
    const embed = new EmbedBuilder()
      .setColor('#FF0000') // Red side color
      .setTitle('New 9quote?!')
      .setDescription(
        [
          `> "${proposedQuote}"\n`, // The quote in a blockquote style
          `You have **until <t:${deadlineEpoch}:R>** to get **5 💀** reactions.`
        ].join('\n')
      )
      .setFooter({
        text: 'Disclaimer: all 9quotes added are real and not fabricated. Anything 9dots says to the contrary is a LIE.',
      });

    // 4) Send the embed
    const message = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    // Add the 💀 reaction
    await message.react('💀');

    // Confirmation to the user
    await interaction.followUp({
      content: 'Your 9quote proposal has been submitted!',
      ephemeral: true,
    });

    // 5) Create a reaction collector
    const filter = (reaction, user) => reaction.emoji.name === '💀' && !user.bot;
    const collector = message.createReactionCollector({ filter, time: oneHourMs });

    let previousReactionCount = 1; // Starts at 1 because the bot reacts initially

    // Handle reaction changes
    collector.on('collect', (reaction) => {
      if (reaction.count >= 5) {
        collector.stop('enough_skulls');
      }
      previousReactionCount = reaction.count;
    });

    // Handle the message being deleted
    message.channel.messages.cache.get(message.id)?.on('delete', async () => {
      collector.stop('message_deleted');
    });

    // Reaction count changes (removal tracking)
    collector.on('remove', (reaction, user) => {
      if (reaction.count < previousReactionCount - 1) {
        collector.stop('reaction_removed');
      }
      previousReactionCount = reaction.count;
    });

    // Handle collector end
    collector.on('end', async (collected, reason) => {
      if (reason === 'enough_skulls') {
        // Add the quote
        const quotesData = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));
        quotesData.quotes.push(proposedQuote);
        fs.writeFileSync(quotesFilePath, JSON.stringify(quotesData, null, 2), 'utf-8');

        // Announce success
        await interaction.followUp({
          content: `Added **"${proposedQuote}"** to the 9quotes!`,
        });
      } else if (reason === 'reaction_removed' || reason === 'message_deleted') {
        // Add the quote because of tampering
        const quotesData = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));
        quotesData.quotes.push(proposedQuote);
        fs.writeFileSync(quotesFilePath, JSON.stringify(quotesData, null, 2), 'utf-8');

        // Announce tampering
        await interaction.followUp({
          content: `**"${proposedQuote}"** has been added to the 9quotes because 9dots tried to delete or tamper with the reactions! 🐀`,
        });
      } else {
        // Not enough skulls
        await interaction.followUp({
          content: `Time’s up! This quote did not receive 5 💀 reactions within 1 hour and was NOT added.`,
        });
      }
    });
  },
};
