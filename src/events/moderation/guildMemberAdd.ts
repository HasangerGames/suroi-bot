import { Colors, EmbedBuilder, Events } from "discord.js";
import { EventHandler } from "../../utils/eventHandler";
import { formatDate, getModLogChannel } from "../../utils/misc";

export default new EventHandler(Events.GuildMemberAdd, async member => {
    const embed = new EmbedBuilder()
        .setAuthor({ name: member.user.username })
        .setThumbnail(member.displayAvatarURL())
        .setTitle("👋 New Member")
        .setDescription(`${member.nickname ?? member.displayName} (<@${member.id}>) joined the server`)
        .addFields({ name: "Account Created", value: `${formatDate(member.user.createdAt)} (${formatDate(member.user.createdAt, "R")})` })
        .setFooter({ text: `User ID: ${member.id}` })
        .setColor(Colors.Green)
        .setTimestamp();

    const logChannel = await getModLogChannel(member.guild);
    await logChannel.send({ embeds: [embed] });
});
