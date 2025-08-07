import { MessageFlags, SharedSlashCommand, type ChatInputCommandInteraction, type RESTPostAPIApplicationCommandsJSONBody, type SlashCommandOptionsOnlyBuilder } from "discord.js";

export class Command {
    readonly data: RESTPostAPIApplicationCommandsJSONBody;
    readonly cooldown: number;
    private _execute: (interaction: ChatInputCommandInteraction) => void;
    lastRun = 0;

    constructor(
        { data, cooldown, execute }: {
            data: SharedSlashCommand,
            cooldown?: number,
            execute: (interaction: ChatInputCommandInteraction) => void
        }
    ) {
        this.data = data.toJSON();
        this.cooldown = cooldown ?? 5000;
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

        await this._execute(interaction);
    }
}
