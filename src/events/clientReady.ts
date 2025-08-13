import { Events } from "discord.js";
import { EventHandler } from "../utils/eventHandler";

export default new EventHandler(Events.ClientReady, async readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
