// deploy-commands.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // from .env
// Optionally, a test Guild ID if you want faster updates (see below).
// const GUILD_ID = process.env.GUILD_ID;

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'));

// Loop through all command files and push the JSON data
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

// Create a new REST instance
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands...');

    // ---- Register Global Commands ----
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    // ---- OR Register Guild Commands for faster iteration ----
    // await rest.put(
    //   Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    //   { body: commands }
    // );

    console.log('Successfully reloaded (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
