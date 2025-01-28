// commands/add9quote.js
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
    // 1) The submitted quote
    const proposedQuote = interaction.options.getString('quote', true);

    // 2) Calculate 1-hour deadline (in ms -> s)
    const oneHourMs = 60 * 60 * 1000;
    const deadline = Date.now() + oneHourMs;
    const deadlineEpoch = Math.floor(deadline / 1000); // for <t:xxx:R>

    // 3) Build the embed
    //    - Put ALL instructions in the description to avoid repetition
    const embed = new EmbedBuilder()
      .setColor('#FF0000') // Red side color
      .setTitle('New 9quote?!')
      .setDescription(
        [
          `> "${proposedQuote}"\n`, // The quote in a blockquote style
          `You have **until <t:${deadlineEpoch}:R>** to get **5 💀** reactions.`
        ].join('\n')
      )
      .setFooter({ text: 'Disclaimer all 9quotes added are real and not fabricated, anything 9dots says to the contrary is a LIE.' }); // Something simple for the footer

    // 4) Send the embed (not ephemeral)
    const message = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    // Add the 💀 reaction
    await message.react('💀');

    // 5) Confirm to the user that it was posted
    await interaction.followUp({
      content: 'Thank you for fighting against the oppression of stouffville.',
      ephemeral: true,
    });

    // 6) Reaction collector
    const filter = (reaction, user) => {
      return reaction.emoji.name === '💀' && !user.bot;
    };
    const collector = message.createReactionCollector({
      filter,
      time: oneHourMs,
    });

    // If we hit 5 💀
    collector.on('collect', (reaction, user) => {
        console.log(`Collected a ${reaction.emoji.name} from ${user.tag}`);
        console.log(`Current reaction.count is ${reaction.count}`);
        if (reaction.count >= 5) {
          collector.stop('enough_skulls');
        }
      });
      

    // 7) End logic
    collector.on('end', async (collected, reason) => {
      if (reason === 'enough_skulls') {
        // Reached 5 or more
        try {
          const quotesData = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));
          quotesData.quotes.push(proposedQuote);
          fs.writeFileSync(quotesFilePath, JSON.stringify(quotesData, null, 2), 'utf-8');

          await interaction.followUp({
            content: `Added **"${proposedQuote}"** to the 9quotes!`,
            ephemeral: false,
          });
        } catch (err) {
          console.error('Error writing to quotes.json:', err);
          await interaction.followUp({
            content: 'Failed to add your quote due to an internal error!',
            ephemeral: true,
          });
        }
      } else {
        // Not enough skulls
        await interaction.followUp({
          content: `Time’s up! This quote did not receive 5 💀 reactions within 1 hour and was NOT added. 9Dots tyranny wins again sadly...`,
          ephemeral: false,
        });
      }
    });
  },
};
