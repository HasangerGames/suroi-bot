import { type ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("Make the bot say something.")
        .addStringOption(option => option
            .setName("message")
            .setDescription("What to say")
            .setRequired(true)
        )
        .addAttachmentOption(option => option
            .setName("attachment")
            .setDescription("Add an attachment to the message")
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    cooldown: 1000,
    async execute(interaction: ChatInputCommandInteraction) {
        const channel = interaction.channel;
        if (!channel?.isSendable()) return;

        await channel.send({ content: interaction.options.getString("message", true) });

        await interaction.reply({ content: "Message sent." });
        await interaction.deleteReply();
    }
});
