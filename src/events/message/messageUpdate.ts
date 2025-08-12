import { Colors, EmbedBuilder, Events, PermissionFlagsBits } from "discord.js";
import { EventHandler } from "../../utils/eventHandler";
import { getModLogChannel, linkRegex, logRemovedAttachments, truncateString } from "../../utils/misc";

export default new EventHandler(Events.MessageUpdate, async(oldMessage, newMessage) => {
    const author = newMessage.author;
    if (author.bot) return;

    const guild = newMessage.guild;
    const logChannel = await getModLogChannel(guild);
    const messageLink = `[Jump to message](https://discord.com/channels/${newMessage.guildId}/${newMessage.channelId}/${newMessage.id})\n`;

    const oldAttachments = oldMessage.attachments;
    const newAttachments = newMessage.attachments;
    if (newAttachments.size < oldAttachments.size) {
        const removedAttachments = oldAttachments.entries()
            .filter(([id]) => !newAttachments.has(id))
            .map(([, attachment]) => attachment)
            .toArray();

        await logRemovedAttachments(removedAttachments, newMessage, logChannel, messageLink);
    }

    const oldContent = oldMessage.content ?? "";
    const newContent = newMessage.content;
    if (!newContent || oldContent === newContent) return;

    // Block editing links for users that don't have the Manage Messages permission
    const member = await guild?.members.fetch(author);
    if (/https?:\/\//.test(newContent) && !member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await newMessage.delete();
        return;
    }

    const oldContentFormatted = `\\- ${oldContent.replaceAll("\n", "\n\\- ")}`;
    const newContentFormatted = `+ ${newContent.replaceAll("\n", "\n+ ")}`;
    // For messages with links, we avoid using the diff view because it prevents them from resolving
    const useDiff =
        (!linkRegex.test(oldContent) && !linkRegex.test(newContent))
        // Discord embed field values are limited to 1024 characters
        || oldContentFormatted.length > 1024
        || newContentFormatted.length > 1024;

    const embed = new EmbedBuilder()
        .setAuthor({
            name: author.username,
            iconURL: author.displayAvatarURL()
        })
        .setDescription(
            `### ✏️ Message by <@${newMessage.author.id}> edited in <#${newMessage.channelId}>\n${messageLink}` +
            (!useDiff ? "" : (
                `\`\`\`diff\n` +
                truncateString(
                    (oldContent.length ? `- ${oldContent.replaceAll("\n", "\n- ")}\n` : "") +
                    `+ ${newContent.replaceAll("\n", "\n+ ")}\n`,
                    3896 // embed descriptions have a maximum length of 4096 chars, so we truncate it here to leave room for the rest of the description
                ) +
                `\`\`\``
            ))
        )
        .setFields(
            useDiff ? [] : [
                ...(oldContent.length ? [{ name: "Old Message", value: oldContentFormatted }] : []),
                { name: "New Message", value: newContentFormatted }
            ]
        )
        .setColor(Colors.Blurple)
        .setFooter({ text: `User ID: ${author.id}` })
        .setTimestamp();
    await logChannel.send({ embeds: [embed] });
});
