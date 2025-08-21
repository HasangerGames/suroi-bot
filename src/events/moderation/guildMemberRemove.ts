import { Colors, EmbedBuilder, Events } from "discord.js";
import { EventHandler } from "../../utils/eventHandler";
import { formatDate, getModLogChannel } from "../../utils/misc";

export default new EventHandler(Events.GuildMemberRemove, async member => {
    const embed = new EmbedBuilder()
        .setAuthor({ name: member.user.username })
        .setThumbnail(member.displayAvatarURL())
        .setTitle("🥀 Member Left")
        .setDescription(`${member.nickname ?? member.displayName} (<@${member.id}>) left the server`)
        .addFields(
            ...(member.joinedAt ? [{ name: "Join Date", value: `${formatDate(member.joinedAt)} (${formatDate(member.joinedAt, "R")})` }] : []),
            { name: "Roles", value: member.roles.cache.filter(({ name }) => name !== "@everyone").map(role => `<@&${role.id}>`).join(" ") }
        )
        .setFooter({ text: `User ID: ${member.id}` })
        .setColor(Colors.DarkRed)
        .setTimestamp();

    const logChannel = await getModLogChannel(member.guild);
    await logChannel.send({ embeds: [embed] });
});
