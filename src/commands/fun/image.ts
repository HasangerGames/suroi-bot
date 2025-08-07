import { AttachmentBuilder, ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { readdir } from "node:fs/promises";
import { pickRandomInArray } from "../../utils/misc";
import { Command } from "../../utils/command";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("image")
        .setDescription("Fun with out of context images!")
        .addSubcommand(subcommand => subcommand
            .setName("random")
            .setDescription("Sends a random out of context image.")
        )
        .addSubcommand(subcommand => subcommand
            .setName("search")
            .setDescription("Searches for an out of context image.")
            .addStringOption(option => option
                .setName("query")
                .setDescription("The text to search for")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("upload")
            .setDescription("Uploads an out of context image.")
            .addAttachmentOption(option => option
                .setName("file")
                .setDescription("The image file to upload")
                .setRequired(true)
            )
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const images = await readdir("./data/images");
        let name: string | undefined;
        switch (interaction.options.getSubcommand()) {
            case "random": {
                name = pickRandomInArray(images);
                break;
            }
            case "search": {
                const query = interaction.options.getString("query", true);
                name = pickRandomInArray(images.filter(name => name.toLowerCase().includes(query)));
                break;
            }
            case "upload": {
                await interaction.reply({ content: "Not implemented yet.", flags: [MessageFlags.Ephemeral] });
                return;
            }
        }
        if (name) {
            const file = new AttachmentBuilder(`./data/images/${name}`, { name });
            await interaction.reply({ files: [file] });
        }
    }
});
