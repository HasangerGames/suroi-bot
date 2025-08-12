import { Colors, EmbedBuilder, Events } from "discord.js";
import { EventHandler } from "../utils/eventHandler";
import { getModLogChannel, logRemovedAttachments } from "../utils/misc";

export default new EventHandler(Events.MessageUpdate, async(oldMessage, newMessage) => {
    const author = newMessage.author;
    if (author.bot) return;

    const logChannel = await getModLogChannel(newMessage.guild);
    const messageLink = `[↗️ Jump to message](https://discord.com/channels/${newMessage.guildId}/${newMessage.channelId}/${newMessage.id})\n`;

    const oldAttachments = oldMessage.attachments;
    const newAttachments = newMessage.attachments;
    if (newAttachments.size < oldAttachments.size) {
        const removedAttachments = oldAttachments.entries()
            .filter(([id]) => !newAttachments.has(id))
            .map(([, attachment]) => attachment)
            .toArray();

        await logRemovedAttachments(removedAttachments, newMessage, logChannel, messageLink);
    }

    const oldContent = oldMessage.content;
    const newContent = newMessage.content;
    if (!newContent || oldContent === newContent) return;

    // Block editing links
    if (newContent.includes("http://") || newContent.includes("https://")) {
        newMessage.delete();
    }

    // TODO Truncate longer messages
    const embed = new EmbedBuilder()
        .setAuthor({
            name: author.username,
            iconURL: author.displayAvatarURL()
        })
        .setDescription(
            `### **✏️ Message by <@${newMessage.author.id}> edited in <#${newMessage.channelId}>**\n` +
            messageLink +
            `\`\`\`diff\n` +
            `- ${oldContent?.replaceAll("\n", "\n- ") ?? ""}\n` +
            `+ ${newContent?.replaceAll("\n", "\n+ ") ?? ""}\n` +
            `\`\`\``
        )
        .setColor(Colors.Blurple)
        .setFooter({ text: `User ID: ${author.id}` })
        .setTimestamp();
    await logChannel.send({ embeds: [embed] });
});
