import { type ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
// https://github.com/xsalazar/emoji-kitchen-backend/raw/refs/heads/main/app/metadata.json
import rawEmojiMetadata from "../../../data/emoji/metadata.json";
import { Command } from "../../utils/command";
import { pickRandomInArray } from "../../utils/misc";

interface EmojiMetadata {
    knownSupportedEmoji: string[]
    data: Record<string, Emoji>
}

interface Emoji {
    alt: string
    emoji: string
    emojiCodepoint: string
    gBoardOrder: number
    keywords: string[]
    category: string
    subcategory: string
    combinations: Record<string, EmojiCombination[]>
}

interface EmojiCombination {
    gStaticUrl: string
    alt: string
    leftEmoji: string
    leftEmojiCodepoint: string
    rightEmoji: string
    rightEmojiCodepoint: string
    date: string
    isLatest: boolean
    gBoardOrder: number
}

const emojiMetadata = rawEmojiMetadata as EmojiMetadata;
const emojiList = Object.values(emojiMetadata.data);
const supportedEmoji = emojiList.map(({ emoji }) => emoji); // yes knownSupportedEmoji exists but this is cleaner

export default new Command({
    data: new SlashCommandBuilder()
        .setName("emoji")
        .setDescription("Interface for Google's Emoji Kitchen")
        .addSubcommand(subcommand => subcommand
            .setName("random")
            .setDescription("Get a random emoji")
        )
        .addSubcommand(subcommand => subcommand
            .setName("list")
            .setDescription("Return a list of supported emoji")
        )
        .addSubcommand(subcommand => subcommand
            .setName("combine")
            .setDescription("Combine two emoji")
            .addStringOption(option => option
                .setName("first")
                .setDescription("The first emoji")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("second")
                .setDescription("The second emoji")
            )
        ),
    cooldown: 5000,
    deferred: true,
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        if (interaction.options.getSubcommand() === "list") {
            await interaction.followUp({ content: `### **${supportedEmoji.length}** emojis are supported!` });
            if (!interaction.channel?.isSendable()) return; // never happens but acts as a type guard
            for (let i = 0; (i + 1) * 200 < supportedEmoji.length; i++) {
                await interaction.channel.send({ content: supportedEmoji.slice(i * 200, (i + 1) * 200).join("") });
            }
            return;
        }

        const getEmoji = async(emojiVal: string): Promise<Emoji | undefined> => {
            const emoji = emojiList.find(({ emoji }) => emoji === emojiVal);
            if (!emoji) {
                const embed = new EmbedBuilder()
                    .setTitle("❌ Invalid emoji")
                    .setDescription(`${emojiVal} is not supported!\n-# Use the \`/emoji list\` command to show a list of supported emoji.`)
                    .setColor(Colors.Red);
                await interaction.followUp({ embeds: [embed] });
            }
            return emoji;
        };

        let firstEmoji: Emoji | undefined;
        const first = interaction.options.getString("first");
        if (first) {
            firstEmoji = await getEmoji(first);
            if (!firstEmoji) return;
        }
        firstEmoji ??= pickRandomInArray(emojiList);

        let secondEmoji: Emoji | undefined;
        const second = interaction.options.getString("second");
        if (second) {
            secondEmoji = await getEmoji(second);
            if (!secondEmoji) return;
        }

        let combination: EmojiCombination | undefined;
        const firstCombinations = Object.values(firstEmoji.combinations).flat();
        if (secondEmoji) {
            combination = firstCombinations.find(({ leftEmoji, rightEmoji }) => leftEmoji === first && rightEmoji === second || rightEmoji === first && leftEmoji === second);

            if (!combination) {
                const embed = new EmbedBuilder()
                    .setTitle("❌ Invalid combination")
                    .setDescription(`${first}➕${second} is not supported!`)
                    .setColor(Colors.Red);
                await interaction.followUp({ embeds: [embed] });
                return;
            }
        } else {
            combination = pickRandomInArray(firstCombinations);
        }

        await interaction.followUp({
            content: `# ${combination.leftEmoji}➕${combination.rightEmoji}`,
            files: [{ attachment: combination.gStaticUrl, name: `${combination.alt}.png` }]
        });
    }
});
