import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../utils/command";
import { pickRandomInArray } from "../../utils/misc";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("randommessage")
        .setDescription("Sends a random message from the last 100 in the current channel"),
    cooldown: 2000,
    deferred: true,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        if (!interaction.channel) throw new Error("Unknown channel");

        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const message = pickRandomInArray(messages.values().toArray());
        await interaction.followUp({ content: message.content, files: message.attachments.values().toArray(), embeds: message.embeds });
    }
});
