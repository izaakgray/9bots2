require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const db = require('./utils/database');
const userReactionsMap = require('./data/userReactionsMap');
const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageTyping,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Cache for quotes messages
const quotesMessageCache = new Map();

// Read command files
const commandFiles = fs
  .readdirSync(path.join(__dirname, 'commands'))
  .filter(file => file.endsWith('.js'));

// Listen for the bot being ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Listen for slash command interactions
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

// Listen for messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Increment the user's message count
  db.incrementMessage.run(message.author.id);

  const content = message.content.toLowerCase();

  if (content.includes('french')) await message.react('🤮');
  if (content.includes('british')) await message.react('💪').then(() => message.react('🇬🇧'));
  if (content.includes('american')) await message.react('🫃');
  if (content.includes('9dots')) await message.react('🐀');
  if (content.includes('squidposting')) await message.react('🦑');
  if (content.includes('frfr')) await message.react('🇫').then(() => message.react('🇷'));
  if (content.includes('blaber')) await message.react('🐐');
  if (content.includes('inspired')) await message.react('🐶');

  const userReactions = userReactionsMap[message.author.id];
  if (userReactions && Math.random() < 0.01) {
    db.incrementTrigger.run(message.author.id);
    for (const emoji of userReactions) {
      try {
        await message.react(emoji);
      } catch (err) {
        console.error(`Failed to react with ${emoji}:`, err);
      }
    }
  }
});

// Listen for message deletion
client.on('messageDelete', async (message) => {
  const cacheEntry = quotesMessageCache.get(message.id);
  if (!cacheEntry) return;

  const { quote, channel } = cacheEntry;

  try {
    const fetchedLogs = await channel.guild.fetchAuditLogs({
      limit: 1,
      type: 'MESSAGE_DELETE',
    });
    const deletionLog = fetchedLogs.entries.first();

    if (!deletionLog) return; // No log found

    const { executor, target } = deletionLog;
    if (target.id !== message.author.id) return; // Ensure it was the same message
    if (executor.id !== '590304012457214064') return; // Replace with the specific user's ID (e.g., 9dots)

    // Add the quote to the JSON file
    const quotesFilePath = path.join(__dirname, 'data', 'quotes.json');
    const quotesData = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));
    quotesData.quotes.push(quote);
    fs.writeFileSync(quotesFilePath, JSON.stringify(quotesData, null, 2), 'utf-8');

    await channel.send(
      `**"${quote}"** has been added to the 9quotes because 9dots tried to delete it, the 🐀!`
    );
  } catch (err) {
    console.error('Error handling message deletion:', err);
  } finally {
    quotesMessageCache.delete(message.id); // Clean up the cache
  }
});

// Listen for reaction removal
client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  const message = reaction.message;
  const cacheEntry = quotesMessageCache.get(message.id);
  if (!cacheEntry) return;

  const { quote, channel } = cacheEntry;

  if (user.id === '590304012457214064') { // Replace with the specific user ID (e.g., 9dots)
    const quotesFilePath = path.join(__dirname, 'data', 'quotes.json');
    const quotesData = JSON.parse(fs.readFileSync(quotesFilePath, 'utf-8'));
    quotesData.quotes.push(quote);
    fs.writeFileSync(quotesFilePath, JSON.stringify(quotesData, null, 2), 'utf-8');

    await channel.send(
      `**"${quote}"** has been added to the 9quotes because 9dots tried to remove reactions, the 🐀!`
    );

    quotesMessageCache.delete(message.id); // Clean up the cache
  }
});

client.login(TOKEN);
module.exports = { quotesMessageCache };
