import { type ChatInputCommandInteraction, Colors, EmbedBuilder, GuildMember, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command, Servers } from "../../utils/command";
import { formatDate, formatTimestamp, getTextChannelById, suroiFetch } from "../../utils/misc";
import { regions } from "./servers";
import { Config } from "../../utils/config";

interface Report {
    id: string
    suspectName?: string
    reporterName?: string
    suspectIP: string
    reporterIP: string
    region?: string
    createdAt?: string
    banned: boolean
    unbanned: boolean
}

type PunishmentType = "warn" | "temp" | "perma";

interface Punishment {
    id: string
    ip?: string
    reportId: string
    reason: string
    reporter?: string
    expires?: string
    punishmentType: PunishmentType
}

const punishmentNames = {
    warn: "warned",
    temp: "temporarily banned",
    perma: "permanently banned"
};

export default new Command({
    data: new SlashCommandBuilder()
        .setName("report")
        .setDescription("Commands for managing in-game reports")
        // .addSubcommand(subcommand => subcommand
        //     .setName("list")
        //     .setDescription("List all reports")
        //     .addIntegerOption(option => option
        //         .setName("page")
        //         .setDescription("The page of reports to view")
        //     )
        // )
        .addSubcommand(subcommand => subcommand
            .setName("info")
            .setDescription("Get information about a specific report")
            .addStringOption(option => option
                .setName("id")
                .setDescription("The report ID")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("warn")
            .setDescription("Warn a player")
            .addStringOption(option => option
                .setName("id")
                .setDescription("The report ID")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("reason")
                .setDescription("The reason for the warn")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("tempban")
            .setDescription("Temporarily ban a player")
            .addStringOption(option => option
                .setName("id")
                .setDescription("The report ID")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("reason")
                .setDescription("The reason for the ban")
                .setRequired(true)
            )
            .addIntegerOption(option => option
                .setName("duration")
                .setDescription("The duration of the ban")
                .addChoices(
                    { name: "30 seconds", value: 30000 },

                    { name: "1 hour",   value: 3600000 },
                    { name: "2 hours",  value: 7200000 },
                    { name: "6 hours",  value: 21600000 },
                    { name: "12 hours", value: 43200000 },
                    { name: "1 day",    value: 86400000 },
                    { name: "2 days",   value: 172800000 },
                    { name: "1 week",   value: 604800000 },
                    { name: "2 weeks",  value: 1209600000 },
                    { name: "1 month",  value: 2419200000 },
                    { name: "2 months", value: 4838400000 },
                )
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("permaban")
            .setDescription("Permanently ban a player")
            .addStringOption(option => option
                .setName("id")
                .setDescription("The report ID")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("reason")
                .setDescription("The reason for the ban")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("unban")
            .setDescription("Unban a player")
            .addStringOption(option => option
                .setName("id")
                .setDescription("The report ID")
                .setRequired(true)
            )
        ),
    cooldown: 5000,
    servers: [Servers.Main, Servers.Police],
    async execute(interaction: ChatInputCommandInteraction) {
        if (!(interaction.member instanceof GuildMember)) throw new Error("Invalid member");

        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand() as "info" | "warn" | "tempban" | "permaban" | "unban";
        const punishmentType = ({
            warn: "warn",
            tempban: "temp",
            permaban: "perma",
            unban: "unban"
        } as Record<string, PunishmentType | "unban">)[subcommand];

        if (
            punishmentType
            && !interaction.member?.roles.cache.some(
                ({ id }) => Config.gameModRoles[id]?.includes(punishmentType)
            )
        ) {
            const embed = new EmbedBuilder()
                .setTitle("❌ Insufficient permissions")
                .setDescription(`You don't have permission to use the \`${punishmentType}\` punishment type.`)
                .setColor(Colors.Red);
            await interaction.followUp({ embeds: [embed] });
            return;
        }

        const reportId = interaction.options.getString("id", true);
        const response = await suroiFetch(`/reports/${reportId}`);
        if (response.status === 404) {
            const embed = new EmbedBuilder()
                .setTitle("❌ Report not found")
                .setDescription(`Could not find a report with ID \`${reportId}\`.`)
                .setColor(Colors.Red);
            await interaction.followUp({ embeds: [embed] });
            return;
        } else if (!response.ok) {
            throw new Error("Report request failed");
        }
        const reportData = await response.json() as Report;

        if (subcommand === "unban") {
            const unbanResponse = await suroiFetch(`/unban/${reportId}`, { method: "POST" });
            const embed = new EmbedBuilder();
            if (unbanResponse.ok) {
                embed
                    .setDescription(`### 👮 \`${reportId}\` successfully unbanned\nAll punishments for the IP associated with this report ID have been removed.`)
                    .setColor(Colors.DarkGreen);
            } else {
                embed
                    .setTitle("❌ Unable to unban player")
                    .setDescription(`API server returned ${response.status} ${response.statusText}`)
                    .setColor(Colors.Red);
            }
            await interaction.followUp({ embeds: [embed] });
            return;
        }

        if (reportData.banned && !reportData.unbanned) {
            const punishment = await suroiFetch(`/punishments/${reportId}`);
            if (punishment.ok) {
                const punishData = await punishment.json() as Punishment;

                const embed = new EmbedBuilder()
                    .setDescription(`### 👮 \`${reportId}\` already punished\nThis player has been ${punishmentNames[punishData.punishmentType]}.`)
                    .addFields(
                        { name: "Player Name", value: `\`${reportData.suspectName}\`` },
                        { name: "Reason", value: `\`${punishData.reason}\`` },
                        ...(punishData.expires ? [{ name: "Expires", value: formatTimestamp(punishData.expires) }] : []),
                        { name: "Responsible Moderator", value: `\`${punishData.reporter}\`` }
                    )
                    .setColor(Colors.DarkRed);
                await interaction.followUp({ embeds: [embed] });
                return;
            }
        }

        if (subcommand === "info") {
            // based on dogshit error code but we're rewriting this system soon anyway so I can't be fucked fixing it

            const allReportsResponse = await suroiFetch("/reports");
            if (!allReportsResponse.ok) throw new Error("Unable to fetch reports");
            const allReports = await allReportsResponse.json() as Report[];

            let importantMessage: string | undefined;
            if (reportData.banned) {
                importantMessage = reportData.unbanned
                    ? "This report is marked as unbanned, meaning the player was previously punished, but the punishment was later removed."
                    : "This report is marked as banned, but no associated punishment could be found. This can happen when a temporary ban expires.";
            }

            const sameIPReports = allReports.filter(({ id, suspectIP }) => suspectIP === reportData.suspectIP && id !== reportId).sort();

            const embed = new EmbedBuilder()
                .setDescription(`### 📃 Data for report ID \`${reportId}\``)
                .addFields(
                    ...(importantMessage ? [{ name: "Important", value: importantMessage }] : []),
                    { name: "Suspect Username", value: `\`${reportData.suspectName}\`` },
                    { name: "Reporter Username", value: `\`${reportData.reporterName}\`` },
                    { name: "Region", value: regions[reportData.region?.toLowerCase() ?? ""]?.name ?? "Unknown" },
                    { name: "Time of Report", value: formatTimestamp(reportData.createdAt) },
                    { name: "Same Name Reports", value: allReports.filter(({ suspectName }) => suspectName === reportData.suspectName).length.toString() },
                    { name: "Same IP Reports", value: sameIPReports.length ? `${sameIPReports.length}\n${sameIPReports.slice(0, 5).map(report => `\`${report.id}\` at <t:${Math.floor(new Date(report.createdAt ?? "").getTime() / 1000)}:F>`).join("\n")}` : "0" }
                )
                .setColor(Colors.DarkBlue);
            await interaction.followUp({ embeds: [embed] });
        } else {
            if (!punishmentType || punishmentType === "unban") return; // never happens but needs to be here as a type guard

            const reason = interaction.options.getString("reason", true);
            const duration = interaction.options.getInteger("duration");
            const expires = duration ? new Date(Date.now() + duration) : undefined;
            const reporter = interaction.user.username;

            const punishmentData: Omit<Punishment, "id"> = {
                reportId,
                punishmentType,
                reason,
                expires: expires?.toISOString(),
                reporter
            };

            const response = await suroiFetch("/punishments", {
                method: "POST",
                body: JSON.stringify(punishmentData),
                headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) {
                const embed = new EmbedBuilder()
                    .setTitle("❌ Unable to create punishment")
                    .setDescription(`API server returned ${response.status} ${response.statusText}`)
                    .setColor(Colors.Red);
                await interaction.followUp({ embeds: [embed] });
                return;
            }

            const punishmentName = punishmentNames[punishmentType];
            const embed = new EmbedBuilder()
                .setDescription(`### 👮 \`${reportId}\` successfully punished\nThis player has been ${punishmentName}.`)
                .setColor(Colors.DarkGreen)
                .addFields(
                    { name: "Player Name", value: `\`${reportData.suspectName}\`` },
                    { name: "Reason", value: `\`${reason}\`` },
                    ...(expires ? [{ name: "Expires", value: formatDate(expires) }] : [])
                )
                .setTimestamp();

            await interaction.followUp({ embeds: [embed] });

            embed.addFields({ name: "Responsible Moderator", value: `<@${interaction.user.id}>` });

            const logChannel = await getTextChannelById(interaction.guild, Config.gameModLogChannelId);
            await logChannel.send({ embeds: [embed] });
        }
    }
});
