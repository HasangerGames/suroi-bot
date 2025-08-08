import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

export function pickRandomInArray<T>(array: T[]): T {
    if (!array.length) throw new RangeError("Empty array");
    return array[Math.floor(Math.random() * array.length)] as T;
}

export const EmbedColors = {
    important: 0x007bff,
    success: 0x28a745,
    info: 0x17a2b8,
    warning: 0xffc107,
    danger: 0xdc3545
};

export function makeSimpleEmbed(title: string, description: string | null, color = EmbedColors.info) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);
}

export function sendSimpleEmbed(interaction: ChatInputCommandInteraction, title: string, description: string | null, color = EmbedColors.info) {
    interaction.followUp({ embeds: [makeSimpleEmbed(title, description, color)] });
}
