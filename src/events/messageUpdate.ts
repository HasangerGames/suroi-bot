import { Events } from "discord.js";
import { EventHandler } from "../utils/eventHandler";

export default new EventHandler(Events.MessageUpdate, (oldMessage, newMessage) => {
    if (newMessage.author.bot) return;

    const oldContent = oldMessage.content;
    const newContent = newMessage.content;
    if (!newContent || oldContent === newContent) return;

    if (newContent.includes("http://") || newContent.includes("https://")) {
        newMessage.delete();
    }
});
