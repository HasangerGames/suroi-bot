import { Events } from "discord.js";
import { EventHandler } from "../../utils/eventHandler";
import { getModLogChannel, logDeletedMessage } from "../../utils/misc";

export default new EventHandler(Events.MessageDelete, async message => {
    const author = message.author;
    if (!author || author.bot || message.partial) return;

    const logChannel = await getModLogChannel(message.guild);

    await logDeletedMessage(message, logChannel);
});
