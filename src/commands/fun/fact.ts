import { type ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import factsStr from "../../../facts.txt";
import { Command } from "../../utils/command";
import { pickRandomInArray } from "../../utils/misc";

const facts = factsStr.split("\n").filter(line => !line.startsWith("#"));

export default new Command({
    data: new SlashCommandBuilder()
        .setName("fact")
        .setDescription("Send a random fun fact"),
    cooldown: 2000,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ content: pickRandomInArray(facts) });
    }
});
