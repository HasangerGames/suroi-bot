import { type ChatInputCommandInteraction, Colors, EmbedBuilder, type Message, MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { createMessageLink, getModLogChannel } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("Make the bot say something.")
        .addStringOption(option => option
            .setName("message")
            .setDescription("What to say")
            .setMaxLength(2000)
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName("reply_to")
            .setDescription("The ID of the message to reply to (optional)")
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
    cooldown: 1000,
    async execute(interaction: ChatInputCommandInteraction) {
        const channel = interaction.channel;
        if (!channel?.isSendable()) return;

        const content = interaction.options.getString("message", true);
        let message: Message;

        const replyToId = interaction.options.getString("reply_to");
        if (replyToId) {
            const replyTo = await channel.messages.fetch(replyToId);
            message = await replyTo.reply({ content });
        } else {
            message = await channel.send({ content });
        }

        await interaction.reply({ content: "Message sent.", flags: [MessageFlags.Ephemeral] });
        await interaction.deleteReply();

        const embed = new EmbedBuilder()
            .setAuthor({ iconURL: interaction.user.displayAvatarURL(), name: interaction.user.username })
            .setDescription(`### 🗣️ \`/say\` command used in <#${interaction.channelId}> by <@${interaction.user.id}>\n${createMessageLink(message)}\n${content}`)
            .setColor(Colors.DarkVividPink)
            .setTimestamp();
        const logChannel = await getModLogChannel(interaction.guild);
        logChannel.send({ embeds: [embed] });
    }
});
