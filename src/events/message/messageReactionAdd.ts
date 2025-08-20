import { EmbedBuilder, Events, type Message } from "discord.js";
import { Config } from "../../utils/config";
import { EventHandler } from "../../utils/eventHandler";
import { createMessageLink, getTextChannelById, prisma } from "../../utils/misc";

export default new EventHandler(Events.MessageReactionAdd, async reaction => {
    if (reaction.partial) await reaction.fetch();
    if (!reaction.count) return;

    if (reaction.emoji.name !== "lobotomy" || reaction.count < 5) return;

    const message = reaction.message as Message;
    if (message.partial) await message.fetch();
    const originalMessageId = message.id;

    const author = message.author;
    if (!author || author.bot) return;

    const files = message.attachments.values().toArray();
    const embed = new EmbedBuilder()
        .setAuthor({
            iconURL: author.displayAvatarURL(),
            name: author.username ?? ""
        })
        .setDescription(`### <:lobotomy:1377040017377071215>\`${reaction.count}\`\n${message.content}\n―<@${author.id}>\n${createMessageLink(message)}`)
        // biome-ignore lint/style/noNonNullAssertion: length check ensures existence of files[0]
        .setImage(files.length === 1 ? files[0]!.url : null)
        .setColor(0x00ff00)
        .setTimestamp(message.createdAt);

    const starboardChannel = await getTextChannelById(message.guild, Config.starboardChannelId);

    const starboardMessageData = await prisma.starboardMessage.findUnique({ where: { originalMessageId } });
    if (starboardMessageData) {
        const { starboardMessageId, maxReactionCount } = starboardMessageData;
        if (reaction.count <= maxReactionCount) return;

        await prisma.starboardMessage.update({
            where: { originalMessageId },
            data: { maxReactionCount: reaction.count }
        });

        const starboardMessage = await starboardChannel.messages.fetch(starboardMessageId);
        if (starboardMessage) {
            await starboardMessage.edit({ embeds: [embed] });
            return;
        }
    }

    const starboardMessage = await starboardChannel.send({
        embeds: [embed],
        files: files.length === 1 ? undefined : files
    });
    await prisma.starboardMessage.create({
        data: {
            originalMessageId,
            starboardMessageId: starboardMessage.id,
            maxReactionCount: reaction.count
        }
    });
});
