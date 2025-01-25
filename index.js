// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // IMPORTANT: to receive reaction events
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  // Partials let your bot handle events for uncached messages/reactions
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// 1) Updated user ID to emoji map (using real Unicode emoji)
const userReactionsMap = {
  '590304012457214064': ['🇭', '🇦', '🇹', '🇪', '🇷'],   // HATER
  '142778699324981248': ['🇱', '🇺', '🇬', '🇴', '🇳', '🇪'], // LUGONE
  '76151670303625216':  ['🇫', '🇱', '🇴', '🇷', '🇮', '🇩', '🇦'], // FLORIDA
  '133489640974843904': ['🇹', '🇱', '🇸', '🇺', '🇨', '🇰'], // TLSUCK
  '158264851758579713': ['🇾', '🇦', '🇵'],             // YAP
  '99601123731607552':  ['🇭', '🇵', '🇫', '🇮', '🇨'],   // HPFIC
  '102167874818314240': ['🇫', '🇦', '🇰', '🇪', '🪭'],   // FAKE🪭
  '213755220063158283': ['🇫', '🇱', '🇴', '🇵', '🇶', '🇺', '🇪', '🇸', '🇹'], // FLOPQUEST
  '711953160008368168': ['🇲', '🇦', '🇷', '🇸', '🇭', '🇯', '🇴', '🇳'], // MARSHJON
  '291670749041786880': ['🇩', '🇴', '🇼', '🇳', '🇧', '🇦', '🇩'], // DOWNBAD
  '179125717370535937': ['🇫', '🇪', '🇦', '🇷'],       // FEAR
  '194961715560054784': ['🇫', '🇱', '🇴', '🇵', '🇶', '🇺', '🇪', '🇸', '🇹'], // FLOPQUEST
  '784019976381005844': ['🐀', '🇷', '🇦', '🇹'],       // RAT + RAT
  '772464118724165662': ['🇱', '🇦', '🇼', '🇾', '🇪', '🇷', '🇸', '🇮', '🇳', '🇨'], // LAWYERSINC
};

// 2) Read command files (but do NOT register them here)
const commandFiles = fs
  .readdirSync(path.join(__dirname, 'commands'))
  .filter(file => file.endsWith('.js'));

// 3) Bot ready event
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// 4) Slash command interaction handling
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

// 5) messageCreate event for reacting to keywords and random user reactions
client.on('messageCreate', async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  // --- KEYWORD REACTIONS ---
  const content = message.content.toLowerCase();

  if (content.includes('french')) {
    await message.react('🤮');
  }
  if (content.includes('british')) {
    await message.react('💪');
    await message.react('🇬🇧');
  }
  if (content.includes('american')) {
    await message.react('🫃');
  }
  if (content.includes('9dots')) {
    await message.react('🐀');
  }
  if (content.includes('squidposting')) {
    await message.react('🦑');
  }
  if (content.includes('frfr')) {
    await message.react('🇫');
    await message.react('🇷');
  }

  // --- RANDOM 1/100 REACTION PER USER (if in userReactionsMap) ---
  const reactions = userReactionsMap[message.author.id];
  if (reactions) {
    // 1% chance => 1/100
    if (Math.random() < 0.01) {
      for (const emoji of reactions) {
        try {
          await message.react(emoji);
        } catch (err) {
          console.error(`Failed to react with ${emoji}:`, err);
        }
      }
    }
  }
});

// Finally, log in
client.login(TOKEN);
