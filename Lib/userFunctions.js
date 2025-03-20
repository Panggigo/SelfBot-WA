const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { TextReply } = require("./messageFunctions");

/**
 * Memblokir pengguna
 */
exports.blockUser = async (client, jid, target) => {
    try {
        await client.updateBlockStatus(target, "block");
        TextReply(client, jid, `✅ @${target.split("@")[0]} telah diblokir.`);
    } catch (error) {
        console.error("❌ Error saat memblokir:", error);
        TextReply(client, jid, "❌ Gagal memblokir nomor.");
    }
};

/**
 * Membuka blokir pengguna
 */
exports.unblockUser = async (client, jid, target) => {
    try {
        await client.updateBlockStatus(target, "unblock");
        TextReply(client, jid, `✅ @${target.split("@")[0]} telah dibuka blokirnya.`);
    } catch (error) {
        console.error("❌ Error saat membuka blokir:", error);
        TextReply(client, jid, "❌ Gagal membuka blokir.");
    }
};

/**
 * Mengubah foto profil bot
 */
exports.setProfilePicture = async (client, jid, info) => { 
    try {
        if (!info.message.imageMessage) {
            return TextReply(client, jid, "❌ Kirim gambar dengan caption *!setpp* untuk mengubah foto profil!");
        }

        const buffer = await downloadContentFromMessage(info.message.imageMessage, "image");
        let data = Buffer.from([]);
        for await (const chunk of buffer) {
            data = Buffer.concat([data, chunk]);
        }

        await client.updateProfilePicture(jid, data);
        TextReply(client, jid, "✅ Foto profil berhasil diperbarui!");
    } catch (error) {
        console.error("❌ Error saat mengganti foto profil:", error);
        TextReply(client, jid, "❌ Gagal mengubah foto profil.");
    }
};

/**
 * Mengubah bio bot
 */
exports.setBio = async (client, text, jid) => { 
    try {
        await client.updateProfileStatus(text);
        TextReply(client, jid, `✅ Bio berhasil diperbarui menjadi:\n_${text}_`);
    } catch (error) {
        console.error("❌ Error saat mengganti bio:", error);
        TextReply(client, jid, "❌ Gagal mengubah bio.");
    }
};

/**
 * Mengubah nama profil bot
 */
exports.setName = async (client, text, jid) => { 
    try {
        await client.updateProfileName(text);
        TextReply(client, jid, `✅ Nama berhasil diubah menjadi:\n_${text}_`);
    } catch (error) {
        console.error("❌ Error dalam setname:", error);
        TextReply(client, jid, "❌ Gagal mengubah nama.");
    }
};

/**
 * Mengambil foto profil pengguna
 */
exports.getProfilePicture = async (client, jid) => { 
    try {
        const ppUrl = await client.profilePictureUrl(jid, "image");
        client.sendMessage(jid, { 
            image: { url: ppUrl }, 
            caption: "📸 Foto profil pengguna" 
        });
    } catch (error) {
        console.error("❌ Error dalam getpp:", error);
        TextReply(client, jid, "❌ Gagal mengambil foto profil.");
    }
};
