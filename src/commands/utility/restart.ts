import { ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { EmbedColors, simpleEmbed } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("restart")
        .setDescription("Restarts the bot")
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    cooldown: 10000,
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = simpleEmbed(
            "🔄 Restarting bot...",
            null,
            EmbedColors.success
        );
        await interaction.reply({ embeds: [embed] });
        process.exit();
    }
});
