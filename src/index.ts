import { Glob } from "bun";
import { Client, Events, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import type { Command } from "./utils/command";
import { Config } from "./utils/config";
import type { EventHandler } from "./utils/eventHandler";

const errorHandler = (e: unknown) => {
    console.error("An unhandled error occurred. Details:");
    console.error(e);
    process.exit(1);
};
process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);

console.log("Registering commands...");
export const commands: Map<string, Command> = new Map();
const commandGlob = new Glob("commands/**/*.ts");
for await (const file of commandGlob.scan("src")) {
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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Message]
});

console.log("Registering events...");
const eventGlob = new Glob("events/**/*.ts");
for await (const file of eventGlob.scan("src")) {
    const { event, listener }: EventHandler<never> = (await import(`./${file}`)).default;
    client.on(event, async(...args) => {
        try {
            await listener(...args);
        } catch (e) {
            console.error(`An error occurred when trying to execute event handler '${event}'. Details:`);
            console.error(e);
        }
    });
}

client.once(Events.ClientReady, async readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(Config.token);
