import { type ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags } from "discord.js";

export function simpleEmbed(title: string, description: string | null, color: number = Colors.Blue) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);
}

export async function simpleEmbedFollowUp(
    interaction: ChatInputCommandInteraction,
    title: string,
    description: string | null,
    color: number = Colors.Blue,
    ephemeral = false
) {
    const embed = simpleEmbed(title, description, color);
    await interaction.followUp({
        embeds: [embed],
        flags: ephemeral ? [MessageFlags.Ephemeral] : undefined
    });
}

