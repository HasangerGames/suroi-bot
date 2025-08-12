import { Colors, EmbedBuilder, Events } from "discord.js";
import { Config } from "../utils/config";
import { EventHandler } from "../utils/eventHandler";
import { getTextChannelById } from "../utils/misc";

export default new EventHandler(Events.GuildAuditLogEntryCreate, async(auditLogEntry, guild) => {
    const embed = new EmbedBuilder()
        .setTitle("Audit log entry created")
        .setDescription(`\`\`\`json\n${JSON.stringify(auditLogEntry.toJSON(), null, 4)}\`\`\``)
        .setColor(Colors.DarkBlue);

    const logChannel = await getTextChannelById(guild, Config.auditLogChannelId);
    await logChannel.send({ embeds: [embed] });
});
