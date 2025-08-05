import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { Command } from "..";

export default {
    data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("Makes the bot say something.")
        .addStringOption(option => option
            .setName("message")
            .setDescription("What to say")
            .setRequired(true)
        )
        .addAttachmentOption(option => option
            .setName("attachment")
            .setDescription("Add an attachment to the message")
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        interaction.reply({ content: "u smel" });
    }
} satisfies Command;
