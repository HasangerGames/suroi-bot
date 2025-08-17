import { type ChatInputCommandInteraction, Colors, EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("restart")
        .setDescription("Restarts the bot")
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    cooldown: 10000,
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle("🔄 Restarting bot...")
            .setColor(Colors.DarkGreen);
        await interaction.reply({ embeds: [embed] });
        process.exit();
    }
});
