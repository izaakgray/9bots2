const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Uses the OpenAI API Key from .env
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('askgpt')
    .setDescription('Ask GPT-4o Mini a question.')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your question for GPT-4o Mini')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply(); // Acknowledge the command while processing

    const question = interaction.options.getString('question', true);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Uses GPT-4o Mini
        messages: [{ role: 'user', content: question }],
        max_tokens: 250,
      });

      const reply = response.choices[0].message.content;

      // Embed response
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('GPT-4o Mini Response')
        .addFields(
          { name: 'Question:', value: question },
          { name: 'Answer:', value: reply }
        )
        .setFooter({ text: 'Powered by OpenAI GPT-4o Mini' });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('OpenAI Error:', error);
      await interaction.editReply('An error occurred while contacting GPT-4o Mini.');
    }
  },
};
