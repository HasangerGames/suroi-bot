import { Events } from "discord.js";
import { getRandomEmoji } from "../../utils/emoji";
import { EventHandler } from "../../utils/eventHandler";

let reactionSpam = false;
export function toggleReactionSpam(): boolean {
    reactionSpam = !reactionSpam;
    return reactionSpam;
}

export default new EventHandler(Events.MessageCreate, async message => {
    if (reactionSpam) message.react(getRandomEmoji());
});
