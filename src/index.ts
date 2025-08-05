import { Glob } from "bun";
import { ApplicationCommandType, type ChatInputCommandInteraction, Client, Events, GatewayIntentBits, InteractionType, REST, type RESTPostAPIApplicationCommandsJSONBody, Routes, type SlashCommandOptionsOnlyBuilder } from "discord.js";

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN not specified");
}
if (!CLIENT_ID) {
    throw new Error("CLIENT_ID not specified");
}
if (!GUILD_ID) {
    throw new Error("GUILD_ID not specified");
}

export interface Command {
    data: SlashCommandOptionsOnlyBuilder
    execute: (interaction: ChatInputCommandInteraction) => void
}

console.log("Registering commands...");
const commands: Map<string, Command["execute"]> = new Map();
const commandsJSON: RESTPostAPIApplicationCommandsJSONBody[] = [];
const glob = new Glob("commands/**/*.ts");
for await (const file of glob.scan("src")) {
    const command: Command = (await import(`./${file}`)).default;
    commandsJSON.push(command.data.toJSON());
    commands.set(command.data.name, command.execute);
}

const rest = new REST().setToken(DISCORD_TOKEN);
await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commandsJSON }
);

console.log("Initializing client...");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.type !== InteractionType.ApplicationCommand) return;
    if (interaction.commandType !== ApplicationCommandType.ChatInput) return;

    await commands.get(interaction.commandName)?.(interaction);
});

client.login(DISCORD_TOKEN);
