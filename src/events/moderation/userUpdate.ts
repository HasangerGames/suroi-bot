import { Colors, EmbedBuilder, Events } from "discord.js";
import { Config } from "../../utils/config";
import { EventHandler } from "../../utils/eventHandler";
import { getModLogChannel } from "../../utils/misc";

export default new EventHandler(Events.UserUpdate, async(oldUser, newUser) => {
    if (oldUser.avatarURL() !== newUser.avatarURL()) {
        const initialEmbed = new EmbedBuilder()
            .setAuthor({ name: newUser.username })
            .setThumbnail(newUser.displayAvatarURL())
            .setTitle("🖼️ Profile Picture Changed")
            .setDescription(`${newUser.displayName} (<@${newUser.id}>) changed their profile picture`)
            .setFooter({ text: `User ID: ${newUser.id}` })
            .setColor(Colors.Blurple)
            .setTimestamp();
        const oldProfileEmbed = new EmbedBuilder()
            .setTitle("Old Profile Picture")
            .setThumbnail(oldUser.displayAvatarURL())
            .setColor(Colors.Blurple);

        const guild = newUser.client.guilds.cache.get(Config.mainGuildId);
        const logChannel = await getModLogChannel(guild);
        await logChannel.send({ embeds: [initialEmbed, oldProfileEmbed] });
    }
});
