const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoteimage')
    .setDescription('Get an emote as an image file for easy saving')
    .addStringOption(option =>
      option
        .setName('emote')
        .setDescription('The emote to convert to image (can be custom or standard emoji)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const emoteInput = interaction.options.getString('emote');
    
    try {
      let emojiUrl;
      let fileName;
      
      // Check if it's a custom emoji (format: <:name:id> or <a:name:id> for animated)
      if (emoteInput.startsWith('<') && emoteInput.endsWith('>')) {
        const emojiId = emoteInput.split(':')[2]?.replace('>', '');
        const isAnimated = emoteInput.startsWith('<a:');
        
        if (emojiId) {
          // Get the emoji from the client's cache
          const customEmoji = interaction.client.emojis.cache.get(emojiId);
          
          if (customEmoji) {
            emojiUrl = customEmoji.url;
            fileName = `${customEmoji.name}.${isAnimated ? 'gif' : 'png'}`;
          } else {
            return interaction.reply({
              content: '❌ Custom emoji not found. Make sure the emoji is from a server the bot can access.',
              ephemeral: true
            });
          }
        } else {
          return interaction.reply({
            content: '❌ Invalid emoji format. Please use a valid custom emoji or standard emoji.',
            ephemeral: true
          });
        }
      } else {
        // Standard emoji - use Twemoji CDN
        const emojiCode = emoteInput.codePointAt(0).toString(16).toUpperCase();
        emojiUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${emojiCode}.png`;
        fileName = `emoji_${emojiCode}.png`;
      }
      
      // Fetch the emoji image
      const response = await fetch(emojiUrl);
      
      if (!response.ok) {
        return interaction.reply({
          content: '❌ Failed to fetch emoji image. The emoji might not be valid.',
          ephemeral: true
        });
      }
      
      const imageBuffer = await response.arrayBuffer();
      const attachment = new AttachmentBuilder(Buffer.from(imageBuffer), { name: fileName });
      
      await interaction.reply({
        content: `📎 Here's your emote as an image file:`,
        files: [attachment]
      });
      
    } catch (error) {
      console.error('Error in emoteimage command:', error);
      await interaction.reply({
        content: '❌ An error occurred while processing the emote. Please try again.',
        ephemeral: true
      });
    }
  },
};
