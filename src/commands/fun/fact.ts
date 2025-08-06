import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import factsStr from "../../facts.txt";
import { Command } from "../../utils/command";
import { pickRandomInArray } from "../../utils/pickRandomInArray";

const facts = factsStr.split("\n").filter(line => !line.startsWith("#"));

export default new Command({
    data: new SlashCommandBuilder()
        .setName("fact")
        .setDescription("Sends a random fun fact."),
    async execute(interaction: ChatInputCommandInteraction) {
        interaction.reply({ content: pickRandomInArray(facts) });
    }
});
