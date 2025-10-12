const skullboardDb = require('./skullboardDatabase');

/**
 * Handle skull reaction events for the skullboard
 */
class SkullboardManager {
  constructor(client) {
    this.client = client;
  }

  /**
   * Check if a message should be added to the skullboard
   */
  async handleReactionAdd(reaction, user) {
    // Ignore bot reactions
    if (user.bot) return;

    // Get the full message (reactions are partial)
    const message = await reaction.message.fetch();
    
    // Get guild configuration
    const config = skullboardDb.getConfig.get(message.guild.id);
    if (!config || !config.enabled) return;

    // Check if it's the skull emoji
    if (reaction.emoji.name !== config.skull_emoji) return;

    // Check if message already in skullboard
    const existing = skullboardDb.getSkullboardEntry.get(message.id);

    if (existing) {
      // Update existing skullboard entry
      await this.updateSkullboardEntry(message, reaction.count, config);
    } else if (reaction.count >= config.skull_threshold) {
      // Create new skullboard entry
      await this.createSkullboardEntry(message, reaction.count, config);
    }
  }

  /**
   * Handle skull reaction removal
   */
  async handleReactionRemove(reaction, user) {
    // Ignore bot reactions
    if (user.bot) return;

    // Get the full message
    const message = await reaction.message.fetch();
    
    // Get guild configuration
    const config = skullboardDb.getConfig.get(message.guild.id);
    if (!config || !config.enabled) return;

    // Check if it's the skull emoji
    if (reaction.emoji.name !== config.skull_emoji) return;

    // Check if message is in skullboard
    const existing = skullboardDb.getSkullboardEntry.get(message.id);
    if (!existing) return;

    // Update skull count
    await this.updateSkullboardEntry(message, reaction.count, config);

    // If skull count drops below threshold, remove from skullboard
    if (reaction.count < config.skull_threshold) {
      await this.removeSkullboardEntry(message, config);
    }
  }

  /**
   * Create a new skullboard entry
   */
  async createSkullboardEntry(message, skullCount, config) {
    try {
      // Get the skullboard channel
      const skullboardChannel = await this.client.channels.fetch(config.skullboard_channel_id);
      if (!skullboardChannel) {
        console.error('❌ Skullboard channel not found');
        return;
      }

      // Create the content and embeds
      const { content, embeds } = await this.createSkullboardContent(message, skullCount);

      // Send to skullboard channel
      const skullboardMessage = await skullboardChannel.send({ 
        content: content,
        embeds: embeds 
      });

      // Store in database
      skullboardDb.addSkullboardEntry.run(
        message.id,
        message.channel.id,
        message.guild.id,
        message.author.id,
        message.content,
        message.attachments.first()?.url || null,
        skullCount,
        skullboardMessage.id
      );

      console.log(`💀 Added message to skullboard: ${message.id}`);
    } catch (error) {
      console.error('❌ Error creating skullboard entry:', error);
    }
  }

  /**
   * Update an existing skullboard entry
   */
  async updateSkullboardEntry(message, skullCount, config) {
    try {
      const existing = skullboardDb.getSkullboardEntry.get(message.id);
      if (!existing) return;

      // Update database
      skullboardDb.updateSkullCount.run(skullCount, message.id);

      // Update the skullboard message
      if (existing.skullboard_message_id) {
        const skullboardChannel = await this.client.channels.fetch(config.skullboard_channel_id);
        if (skullboardChannel) {
          const skullboardMessage = await skullboardChannel.messages.fetch(existing.skullboard_message_id);
          const { content, embeds } = await this.createSkullboardContent(message, skullCount);
          await skullboardMessage.edit({ 
            content: content,
            embeds: embeds 
          });
        }
      }

      console.log(`💀 Updated skullboard entry: ${message.id} (${skullCount} skulls)`);
    } catch (error) {
      console.error('❌ Error updating skullboard entry:', error);
    }
  }

  /**
   * Remove a message from the skullboard
   */
  async removeSkullboardEntry(message, config) {
    try {
      const existing = skullboardDb.getSkullboardEntry.get(message.id);
      if (!existing) return;

      // Delete the skullboard message
      if (existing.skullboard_message_id) {
        const skullboardChannel = await this.client.channels.fetch(config.skullboard_channel_id);
        if (skullboardChannel) {
          const skullboardMessage = await skullboardChannel.messages.fetch(existing.skullboard_message_id);
          await skullboardMessage.delete();
        }
      }

      // Remove from database
      skullboardDb.removeSkullboardEntry.run(message.id);

      console.log(`💀 Removed message from skullboard: ${message.id}`);
    } catch (error) {
      console.error('❌ Error removing skullboard entry:', error);
    }
  }

  /**
   * Create the skullboard content and embeds
   */
  async createSkullboardContent(message, skullCount) {
    const { EmbedBuilder } = require('discord.js');
    
    // Create the regular message content
    const content = `💀 ${skullCount} | ${message.url}`;
    
    const embeds = [];

    // Check if this message is a reply
    if (message.reference && message.reference.messageId) {
      try {
        let repliedMessage = message.channel.messages.cache.get(message.reference.messageId);
        
        // If not in cache, try to fetch from Discord API
        if (!repliedMessage) {
          try {
            repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
          } catch (fetchError) {
            console.log(`⚠️ Could not fetch replied message ${message.reference.messageId}:`, fetchError.message);
          }
        }
        
        if (repliedMessage) {
          // First embed: The message being replied to
          const repliedEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({
              name: repliedMessage.author.displayName || repliedMessage.author.username,
              iconURL: repliedMessage.author.displayAvatarURL()
            })
            .setDescription(repliedMessage.content || '*No content*')
            .setTimestamp(repliedMessage.createdAt);

          // Add image if present in replied message
          if (repliedMessage.attachments.size > 0) {
            const attachment = repliedMessage.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
              repliedEmbed.setImage(attachment.url);
            }
          }

          embeds.push(repliedEmbed);

          // Second embed: The reply message
          const replyEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({
              name: `Reply to ${repliedMessage.author.displayName || repliedMessage.author.username}`,
              iconURL: message.author.displayAvatarURL()
            })
            .setDescription(message.content || '*No content*')
            .setTimestamp(message.createdAt);

          // Add image if present in reply message
          if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
              replyEmbed.setImage(attachment.url);
            }
          }

          embeds.push(replyEmbed);
        } else {
          // Fallback if we can't get the replied message
          const embed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({
              name: message.author.displayName || message.author.username,
              iconURL: message.author.displayAvatarURL()
            })
            .setDescription(message.content || '*No content*')
            .setTimestamp(message.createdAt);

          if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
              embed.setImage(attachment.url);
            }
          }

          embeds.push(embed);
        }
      } catch (error) {
        // Fallback if there's an error
        const embed = new EmbedBuilder()
          .setColor('#2f3136')
          .setAuthor({
            name: message.author.displayName || message.author.username,
            iconURL: message.author.displayAvatarURL()
          })
          .setDescription(message.content || '*No content*')
          .setTimestamp(message.createdAt);

        if (message.attachments.size > 0) {
          const attachment = message.attachments.first();
          if (attachment.contentType?.startsWith('image/')) {
            embed.setImage(attachment.url);
          }
        }

        embeds.push(embed);
      }
    } else {
      // Single embed for non-reply messages
      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setAuthor({
          name: message.author.displayName || message.author.username,
          iconURL: message.author.displayAvatarURL()
        })
        .setDescription(message.content || '*No content*')
        .setTimestamp(message.createdAt);

      // Add image if present
      if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        if (attachment.contentType?.startsWith('image/')) {
          embed.setImage(attachment.url);
        }
      }

      embeds.push(embed);
    }

    return { content, embeds };
  }

  /**
   * Setup skullboard for a guild
   */
  async setupSkullboard(guildId, skullboardChannelId, skullEmoji = '💀', skullThreshold = 5) {
    try {
      skullboardDb.setConfig.run(guildId, skullboardChannelId, skullEmoji, skullThreshold, 1);
      console.log(`💀 Skullboard setup for guild ${guildId}`);
      return true;
    } catch (error) {
      console.error('❌ Error setting up skullboard:', error);
      return false;
    }
  }

  /**
   * Get skullboard configuration
   */
  getConfig(guildId) {
    return skullboardDb.getConfig.get(guildId);
  }
}

module.exports = SkullboardManager;
