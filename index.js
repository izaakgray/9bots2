require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const db = require('./utils/database'); // SQLite database module
const userReactionsMap = require('./data/userReactionsMap'); // Map of userId -> array of emojis
const SkullboardManager = require('./utils/skullboard'); // Skullboard manager


const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Initialize skullboard manager
const skullboardManager = new SkullboardManager(client);

// --- READ COMMAND FILES ---
const commandFiles = fs
  .readdirSync(path.join(__dirname, 'commands'))
  .filter(file => file.endsWith('.js'));

// --- WHEN BOT IS READY ---
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);

  // Send a startup message to a specific channel
  try {
    const channel = await client.channels.fetch('1092290893807108219');
    if (channel && channel.isTextBased()) {
      //await channel.send('Randomly added 1 hater point to <@102167874818314240> for being a loser.');
      console.log('✅ Startup message sent successfully!');
    } else {
      console.error('❌ Could not find a text-based channel with this ID.');
    }
  } catch (err) {
    console.error('❌ Error fetching/sending to channel:', err);
  }
});

// --- SLASH COMMAND INTERACTIONS ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data.name === interaction.commandName) {
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(err);
        await interaction.reply({
          content: 'There was an error executing that command!',
          ephemeral: true,
        });
      }
      break;
    }
  }
});

// --- MESSAGE CREATE LISTENER ---
client.on('messageCreate', async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  console.log(`📩 Message received from: ${message.author.id} - ${message.content}`);

  // Increment the user's message count
  db.incrementMessage.run(message.author.id);

  const content = message.content.toLowerCase();

  // KEYWORD REACTIONS
  if (content.includes('french')) await message.react('🤮');
  if (content.includes('british')) {
    await message.react('💪');
    await message.react('🇬🇧');
  }
  if (content.includes('american')) await message.react('🫃');
  if (content.includes('9dots')) await message.react('🐀');
  if (content.includes('squidposting')) await message.react('🦑');
  if (content.includes('frfr')) {
    await message.react('🇫');
    await message.react('🇷');
  }
  if (content.includes('blaber')) await message.react('🐐');
  if (content.includes('inspired')) await message.react('🐶');
  
  // Jojo reaction - clown emoji
  if (content.includes('jojo')) await message.react('🤡');
  if (content.includes('bwipo')) await message.react('🩸');

  // RANDOM 1/100 REACTION
  // -> for a true 1% chance, use Math.random() < 0.01
  // Currently 0.01 means a 1% chance
  if (Math.random() < 0.01) {
    db.incrementTrigger.run(message.author.id);
    console.log(`🎯 1/100 Triggered for: ${message.author.id}`);

    // Ensure userReactions is always an array, even if the userId doesn't exist in userReactionsMap
    const userReactions = userReactionsMap[message.author.id] || [];

    // React with each emoji in the user's reaction array
    for (const emoji of userReactions) {
      try {
        // Check if it's a custom emoji (starts with <:)
        if (emoji.startsWith('<:')) {
          // Extract the emoji ID from the format <:name:id>
          const emojiId = emoji.split(':')[2].replace('>', '');
          // Get the emoji from the client's cache
          const customEmoji = client.emojis.cache.get(emojiId);
          if (customEmoji) {
            await message.react(customEmoji);
            console.log(`✅ Reacted with custom emoji ${emoji} for ${message.author.id}`);
          } else {
            console.error(`❌ Custom emoji not found: ${emoji}`);
          }
        } else {
          // Standard emoji
          await message.react(emoji);
          console.log(`✅ Reacted with ${emoji} for ${message.author.id}`);
        }
      } catch (err) {
        console.error(`❌ Failed to react with ${emoji}:`, err);
      }
    }
  }
});

// --- SKULLBOARD REACTION LISTENERS ---
client.on('messageReactionAdd', async (reaction, user) => {
  try {
    await skullboardManager.handleReactionAdd(reaction, user);
  } catch (error) {
    console.error('❌ Error handling reaction add:', error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  try {
    await skullboardManager.handleReactionRemove(reaction, user);
  } catch (error) {
    console.error('❌ Error handling reaction remove:', error);
  }
});

// --- LOG THE BOT IN ---
client.login(TOKEN);