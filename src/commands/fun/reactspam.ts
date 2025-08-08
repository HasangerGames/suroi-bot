import { ChatInputCommandInteraction, MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { toggleReactionSpam } from "../../events/messageCreate";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("reactspam")
        .setDescription("Enable/disable reaction spam.")
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    cooldown: 3000,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({
            content: `Reaction spam is now ${toggleReactionSpam() ? "enabled" : "disabled"}.`,
            flags: [MessageFlags.Ephemeral]
        });
    }
});
