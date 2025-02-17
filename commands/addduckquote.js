const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Adjust this path for duck quotes
const quotesFilePath = path.join(__dirname, '..', 'data', 'duckquotes.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addduckquote')
    .setDescription('Propose a new duck quote. If it gets enough votes within 1 hour, it will be added.')
    .addStringOption(option =>
      option
        .setName('quote')
        .setDescription('The text of your quote')
        .setRequired(true)
    ),

  async execute(interaction) {
    // 1) The submitted quote
    const proposedQuote = interaction.options.getString('quote', true);

    // 2) Calculate 1-hour deadline (in ms -> s)
    const oneHourMs = 60 * 60 * 1000;
    const deadline = Date.now() + oneHourMs;
    const deadlineEpoch = Math.floor(deadline / 1000); // for <t:xxx:R>

    // 3) Build the embed
    const embed = new EmbedBuilder()
      .setColor('#00FF00') // Green side color
      .setTitle('New Duck Quote?!')
      .setDescription(
        [
          `> "${proposedQuote}"\n`, // The quote in a blockquote style
          `You have **until <t:${deadlineEpoch}:R>** to get **5 🦆** reactions.`
        ].join('\n')
      )
      .setFooter({ text: 'Quack quack!' });

    // 4) Send the embed (not ephemeral)
    const message = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    // Add the 🦆 reaction
    await message.react('🦆');

    // 5) Confirm to the user that it was posted
    await interaction.followUp({
      content: 'Your duck quote has been proposed!',
      ephemeral: true,
    });

    // 6) Reaction collector
    const filter = (reaction, user) => {
      return reaction.emoji.name === '🦆' && !user.bot;
    };
    const collector = message.createReactionCollector({
      filter,
      time: oneHourMs,
    });

    // If we hit 5 🦆
    collector.on('collect', (reaction, user) => {
      console.log(`Collected a ${reaction.emoji.name} from ${user.tag}`);
      console.log(`Current reaction.count is ${reaction.count}`);
      if (reaction.count >= 5) {
        collector.stop('enough_ducks');
      }
    });

    // 7) End logic
    collector.on('end', async (collected, reason) => {
      if (reason === 'enough_ducks') {
        // Reached 5 or more
        try {
          // Create the file if it doesn't exist
          if (!fs.existsSync(quotesFilePath)) {
            fs.writeFileSync(quotesFilePath, JSON.stringify({ quotes: [] }, null, 2), 'utf-8');
          }
          
          const quotesData = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));
          quotesData.quotes.push(proposedQuote);
          fs.writeFileSync(quotesFilePath, JSON.stringify(quotesData, null, 2), 'utf-8');

          await interaction.followUp({
            content: `Added **"${proposedQuote}"** to the duck quotes!`,
            ephemeral: false,
          });
        } catch (err) {
          console.error('Error writing to duckquotes.json:', err);
          await interaction.followUp({
            content: 'Failed to add your quote due to an internal error!',
            ephemeral: true,
          });
        }
      } else {
        // Not enough ducks
        await interaction.followUp({
          content: `Time's up! This quote did not receive 5 🦆 reactions within 1 hour and was NOT added.`,
          ephemeral: false,
        });
      }
    });
  },
}; 