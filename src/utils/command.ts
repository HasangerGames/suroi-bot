import { type ChatInputCommandInteraction, Colors, MessageFlags, type RESTPostAPIApplicationCommandsJSONBody, type SharedSlashCommand } from "discord.js";
import { simpleEmbed } from "./embed";

export class Command {
    readonly data: RESTPostAPIApplicationCommandsJSONBody;
    readonly cooldown: number;
    readonly deferred: boolean;
    private _execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    lastRun = 0;

    constructor(
        { data, cooldown, deferred, execute }: {
            data: SharedSlashCommand,
            cooldown: number,
            deferred?: boolean,
            execute: (interaction: ChatInputCommandInteraction) => Promise<void>
        }
    ) {
        this.data = data.toJSON();
        this.cooldown = cooldown;
        this.deferred = deferred ?? false;
        this._execute = execute;
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const now = Date.now();
        const timeSinceLastRun = now - this.lastRun;
        if (timeSinceLastRun < this.cooldown) {
            await interaction.reply({
                content: `Please wait ${Math.round((this.cooldown - timeSinceLastRun) / 1000)} seconds before using this command again.`,
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
            const embed = simpleEmbed(
                "❌ An error occurred when trying to execute this command.",
                "Ping <@753029976474779760> for details.",
                Colors.Red
            );
            await interaction[this.deferred ? "followUp" : "reply"]({ embeds: [embed] });
        }
    }
}
