import { ApplicationCommandType, Events, InteractionType } from "discord.js";
import { commands } from "..";
import { EventHandler } from "../utils/eventHandler";

export default new EventHandler(Events.InteractionCreate, async interaction => {
    if (interaction.type !== InteractionType.ApplicationCommand) return;
    if (interaction.commandType !== ApplicationCommandType.ChatInput) return;

    await commands.get(interaction.commandName)?.execute(interaction);
});
