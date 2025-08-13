import { Glob } from "bun";
import { ActivityType, Client, GatewayIntentBits, REST, Routes } from "discord.js";
import type { Command } from "./utils/command";
import { Config } from "./utils/config";
import type { EventHandler } from "./utils/eventHandler";

console.log("SuroiBot v4.0.0");
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
    presence: {
        activities: [{
            type: ActivityType.Playing,
            name: "Suroi",
            url: "https://suroi.io"
        }]
    }
});

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

client.login(Config.token);
