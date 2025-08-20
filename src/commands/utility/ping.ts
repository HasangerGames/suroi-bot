import { type ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),
    cooldown: 1000,
    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle("🏓 Pong!")
            .setDescription(`**Latency**: ${Date.now() - interaction.createdTimestamp}ms\n**API Latency**: ${Math.round(interaction.client.ws.ping)}ms`)
            .setColor(Colors.Greyple);
        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
});
