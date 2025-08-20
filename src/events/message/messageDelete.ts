import { Events } from "discord.js";
import { Config } from "../../utils/config";
import { EventHandler } from "../../utils/eventHandler";
import { getModLogChannel, logDeletedMessage, prisma } from "../../utils/misc";

export default new EventHandler(Events.MessageDelete, async message => {
    if (message.guildId !== Config.mainGuildId) return;

    const author = message.author;
    if (
        !author
        || message.partial
        // don't log messages deleted in the counting channel that are just numbers, this prevents it from clogging logs
        || message.channelId === Config.countingChannelId && !Number.isNaN(Number(message.content.replaceAll(".", "")))
    ) return;

    if (author.bot) {
        // throws an exception if the record doesn't exist, so we handle it to prevent error spam
        try {
            await prisma.starboardMessage.delete({ where: { starboardMessageId: message.id } });
        } catch {}
        return;
    }

    // see comment on try/catch above
    try {
        await prisma.starboardMessage.delete({ where: { originalMessageId: message.id } });
    } catch {}

    const logChannel = await getModLogChannel(message.guild);
    await logDeletedMessage(message, logChannel);
});
