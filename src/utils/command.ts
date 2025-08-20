import { type ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, type RESTPostAPIApplicationCommandsJSONBody, type SharedSlashCommand } from "discord.js";

export enum Servers { Main, Police }

export class Command {
    readonly data: RESTPostAPIApplicationCommandsJSONBody;
    readonly cooldown: number;
    readonly servers: Servers[];
    private _execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    lastRun = 0;

    constructor(
        { data, cooldown, servers = [Servers.Main], execute }: {
            data: SharedSlashCommand,
            cooldown: number,
            deferred?: boolean,
            servers?: Servers[],
            execute: (interaction: ChatInputCommandInteraction) => Promise<void>
        }
    ) {
        this.data = data.toJSON();
        this.cooldown = cooldown;
        this.servers = servers;
        this._execute = execute;
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const now = Date.now();
        const timeSinceLastRun = now - this.lastRun;
        if (timeSinceLastRun < this.cooldown) {
            const secondsToWait = Math.round((this.cooldown - timeSinceLastRun) / 1000);
            await interaction.reply({
                content: `Please wait ${secondsToWait} ${secondsToWait === 1 ? "second" : "seconds"} before using this command again.`,
                flags: [MessageFlags.Ephemeral]
            });
            return;
        }
        this.lastRun = now;

        try {
            await this._execute(interaction);
        } catch (e) {
            console.error(`An error occurred when trying to execute command /${interaction.commandName}. Details:`);
            console.error(e);
            const embed = new EmbedBuilder()
                .setTitle("❌ An error occurred when trying to execute this command.")
                .setDescription("Ping <@753029976474779760> for details.")
                .setColor(Colors.Red);
            await interaction[interaction.deferred ? "followUp" : "reply"]({ embeds: [embed] });
        }
    }
}
