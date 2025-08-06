import { Glob } from "bun";
import { Player } from "discord-player";
import { YoutubeiExtractor } from "discord-player-youtubei";
import { ApplicationCommandType, Client, Events, GatewayIntentBits, InteractionType, REST, Routes } from "discord.js";
import type { Command } from "./utils/command";
import { getRandomEmoji } from "./utils/emoji";
import { Config } from "./utils/config";

console.log("Registering commands...");
const commands: Map<string, Command> = new Map();
const glob = new Glob("commands/**/*.ts");
for await (const file of glob.scan("src")) {
    const command: Command = (await import(`./${file}`)).default;
    commands.set(command.data.name, command);
}

const rest = new REST().setToken(Config.token);
await rest.put(
    Routes.applicationGuildCommands(Config.clientId, Config.guildId),
    { body: Array.from(commands.values()).map(({ data }) => data) }
);

console.log("Initializing client...");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const player = new Player(client);
await player.extractors.register(YoutubeiExtractor, {});

client.once(Events.ClientReady, async readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.type !== InteractionType.ApplicationCommand) return;
    if (interaction.commandType !== ApplicationCommandType.ChatInput) return;

    await commands.get(interaction.commandName)?.execute(interaction);
});

let reactionSpam = false;
export function toggleReactionSpam(): boolean {
    reactionSpam = !reactionSpam;
    return reactionSpam;
}

client.on(Events.MessageCreate, async message => {
    if (reactionSpam) message.react(getRandomEmoji());
});

client.login(Config.token);
