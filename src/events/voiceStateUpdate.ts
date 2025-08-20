import { Events } from "discord.js";
import { SongManager } from "../commands/fun/song";
import { Config } from "../utils/config";
import { EventHandler } from "../utils/eventHandler";

export default new EventHandler(Events.VoiceStateUpdate, async oldState => {
    const members = oldState.channel?.members;
    if (members?.size === 1 && members?.at(0)?.id === Config.clientId) {
        SongManager.disconnect();
    }
});
