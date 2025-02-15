require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const db = require('./utils/database'); // SQLite database module
const userReactionsMap = require('./data/userReactionsMap'); // Map of userId -> array of emojis

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
      await channel.send('.');
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

  // KEYWORD REACTIONS
  const content = message.content.toLowerCase();
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

  // RANDOM 1/100 REACTION
  // -> for a true 1% chance, use Math.random() < 0.01
  // Currently 0.01 means a 1% chance
  if (Math.random() < 0.01) {
    db.incrementTrigger.run(message.author.id);
    console.log(`🎯 1/100 Triggered for: ${message.author.id}`);

    // Ensure userReactions is always an array, even if the userId doesn’t exist in userReactionsMap
    const userReactions = userReactionsMap[message.author.id] || [];

    // React with each emoji in the user's reaction array
    for (const emoji of userReactions) {
      try {
        await message.react(emoji);
        console.log(`✅ Reacted with ${emoji} for ${message.author.id}`);
      } catch (err) {
        console.error(`❌ Failed to react with ${emoji}:`, err);
      }
    }
  }
});

// --- LOG THE BOT IN ---
client.login(TOKEN);
