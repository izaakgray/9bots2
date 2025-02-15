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
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Read command files
const commandFiles = fs
  .readdirSync(path.join(__dirname, 'commands'))
  .filter(file => file.endsWith('.js'));

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);

  // Send a startup message in a specific channel
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
  // Ignore messages from bots
  if (message.author.bot) return;

  console.log(`📩 Message received from: ${message.author.id} - ${message.content}`);

  // Increment the user's message count
  db.incrementMessage.run(message.author.id);

  // --- KEYWORD REACTIONS ---
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

  // --- RANDOM 1/100 REACTION PER USER (adjust the probability as needed) ---
  const userReactions = userReactionsMap[message.author.id];
  if (Math.random() < 1) {
    db.incrementTrigger.run(message.author.id);
    console.log(`🎯 1/100 Triggered for: ${message.author.id}`);

    // Normal reaction process
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

// Finally, log in
client.login(TOKEN);
