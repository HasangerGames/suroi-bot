import { Events } from "discord.js";
import { EventHandler } from "../../utils/eventHandler";
import { getModLogChannel, logDeletedMessage } from "../../utils/misc";
import { Config } from "../../utils/config";

export default new EventHandler(Events.MessageDelete, async message => {
    const author = message.author;
    if (
        !author
        || author.bot
        || message.partial
        // don't log messages deleted in the counting channel that are just numbers, this prevents it from clogging logs
        || message.channelId === Config.countingChannelId && !Number.isNaN(Number(message.content.replaceAll(".", "")))
    ) return;

    const logChannel = await getModLogChannel(message.guild);

    await logDeletedMessage(message, logChannel);
});
