import { Colors, EmbedBuilder, Events } from "discord.js";
import { EventHandler } from "../../utils/eventHandler";
import { getModLogChannel } from "../../utils/misc";

export default new EventHandler(Events.GuildMemberUpdate, async(oldMember, newMember) => {
    if (oldMember.avatarURL() !== newMember.avatarURL()) {
        const initialEmbed = new EmbedBuilder()
            .setAuthor({ name: newMember.user.username })
            .setThumbnail(newMember.displayAvatarURL())
            .setTitle("🖼️ Server Profile Picture Changed")
            .setDescription(`${newMember.nickname ?? newMember.displayName} (<@${newMember.id}>) changed their profile picture on the server`)
            .setFooter({ text: `User ID: ${newMember.id}` })
            .setColor(Colors.Blurple)
            .setTimestamp();
        const oldProfileEmbed = new EmbedBuilder()
            .setTitle("Old Profile Picture")
            .setThumbnail(oldMember.displayAvatarURL())
            .setColor(Colors.Blurple);

        const logChannel = await getModLogChannel(newMember.guild);
        await logChannel.send({ embeds: [initialEmbed, oldProfileEmbed] });
    }
});
