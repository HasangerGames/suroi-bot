import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { toggleReactionSpam } from "../..";
import { Command } from "../../utils/command";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("reactspam")
        .setDescription("Enable/disable reaction spam."),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({
            content: `Reaction spam is now ${toggleReactionSpam() ? "enabled" : "disabled"}.`,
            flags: [MessageFlags.Ephemeral]
        });
    }
});
