import { type ChatInputCommandInteraction, Collection, type Message, SlashCommandBuilder, type Snowflake } from "discord.js";
import { Command } from "../../utils/command";
import { createMessageLink } from "../../utils/misc";

let lastId: Snowflake | undefined;

export default new Command({
    data: new SlashCommandBuilder()
        .setName("randommessage")
        .setDescription("Sends a random message from the last 100 in the current channel"),
    cooldown: 2000,
    deferred: true,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        if (!interaction.channel) throw new Error("Unknown channel");

        const getMessages = async (iterations: number, existing = new Collection<string, Message<boolean>>(), before?: Snowflake): Promise<Collection<string, Message<boolean>>> => {
            if (!iterations || !interaction.channel) return existing;
            const messages = await interaction.channel.messages.fetch({ limit: 100, before });
            return messages.concat(await getMessages(--iterations, existing, messages.at(0)?.id));
        };

        const message = (await getMessages(10, undefined, lastId)).random();
        if (message) {
            await interaction.followUp({ content: message.content || "_ _", files: message.attachments.values().toArray(), embeds: message.embeds });
        } else {
            await interaction.followUp({ content: "Unable to fetch message" });
        }
    }
});
