import { Colors, EmbedBuilder, Events } from "discord.js";
import { EventHandler } from "../utils/eventHandler";
import { getModLogChannel, logRemovedAttachments } from "../utils/misc";

export default new EventHandler(Events.MessageDelete, async message => {
    const author = message.author;
    if (!author || author.bot) return;

    const logChannel = await getModLogChannel(message.guild);

    if (message.content) {
        const embed = new EmbedBuilder()
            .setAuthor({
                name: author.username,
                iconURL: author.displayAvatarURL()
            })
            .setDescription(
                `### **🗑️ Message by <@${author.id}> deleted in <#${message.channelId}>**\n` +
                `\`\`\`diff\n` +
                `- ${message.content?.replaceAll("\n", "\n- ") ?? ""}\n` +
                `\`\`\``
            )
            .setColor(Colors.Red)
            .setFooter({ text: `User ID: ${author.id}` })
            .setTimestamp();
        await logChannel.send({ embeds: [embed] });

        const gifMatches = message.content?.matchAll(/https:\/\/(tenor.com\/view\/[^\s]*|[^\s]*\.gif)/g) ?? [];
        for (const [content] of gifMatches) {
            await logChannel.send({ content });
        }
    }

    const attachments = message.attachments.values().toArray();
    if (attachments.length) {
        await logRemovedAttachments(attachments, message, logChannel);
    }
});
