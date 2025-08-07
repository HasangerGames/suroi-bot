import { Events } from "discord.js";
import { EventHandler } from "../utils/eventHandler";

export default new EventHandler(Events.MessageUpdate, (_, newMessage) => {
    const content = newMessage.content;
    if (!content) return;
    if (content.includes("http://") || content.includes("https://")) {
        newMessage.delete();
    }
});
