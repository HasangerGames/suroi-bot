import { Glob } from "bun";
import { ActivityType, Client, Events, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import { type Command, Servers } from "./utils/command";
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
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Reaction],
    presence: {
        activities: [{
            type: ActivityType.Playing,
            name: "Suroi",
            url: "https://suroi.io"
        }]
    }
});

console.log("Loading commands...");
export const commands: Map<string, Command> = new Map();
const commandsList: Command[] = [];
const commandGlob = new Glob("commands/**/*.ts");
for await (const file of commandGlob.scan("src")) {
    try {
        const command: Command = (await import(`./${file}`)).default;
        commands.set(command.data.name, command);
        commandsList.push(command);
    } catch (e) {
        console.error(`Error loading command ${file}. Details:`);
        console.error(e);
    }
}

console.log("Registering commands...");
const rest = new REST().setToken(Config.token);
await rest.put(
    Routes.applicationGuildCommands(Config.clientId, Config.mainGuildId),
    { body: commandsList.filter(({ servers }) => servers.includes(Servers.Main)).map(({ data }) => data) }
);
await rest.put(
    Routes.applicationGuildCommands(Config.clientId, Config.policeGuildId),
    { body: commandsList.filter(({ servers }) => servers.includes(Servers.Police)).map(({ data }) => data) }
);

console.log("Loading events...");
const eventGlob = new Glob("events/**/*.ts");
for await (const file of eventGlob.scan("src")) {
    try {
        const { event, listener }: EventHandler<never> = (await import(`./${file}`)).default;
        client.on(event, async(...args) => {
            try {
                await listener(...args);
            } catch (e) {
                console.error(`An error occurred when trying to execute event handler '${event}'. Details:`);
                console.error(e);
            }
        });
    } catch (e) {
        console.error(`Error loading event handler ${file}. Details:`);
        console.error(e);
    }
}

console.log("Logging in...");
client.login(Config.token);
