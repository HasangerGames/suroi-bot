import { type ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "..";

export default {
    data: new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Creates an embed.")
        .addUserOption(option => option
            .setName("author")
            .setDescription("The user to show at the top of the embed")
        )
        .addStringOption(option => option
            .setName("title")
            .setDescription("The title of the embed")
        )
        .addStringOption(option => option
            .setName("description")
            .setDescription("The main body of the embed")
        )
        .addBooleanOption(option => option
            .setName("timestamp")
            .setDescription("Whether to add a timestamp to the embed")
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const author = interaction.options.getUser("author");
        const embed = new EmbedBuilder()
            .setAuthor(author ? { name: author.displayName, iconURL: author.displayAvatarURL() } : null)
            .setTitle(interaction.options.getString("title"))
            .setDescription(interaction.options.getString("description"))
            .setTimestamp(interaction.options.getBoolean("timestamp") ? new Date() : null);
        interaction.reply({ embeds: [embed] });
    }
} satisfies Command;
