const fs = require("fs");
const { TextReply } = require("./messageFunctions");

/**
 * Mengeluarkan anggota dari grup
 */
exports.kickMember = async (client, jid, target) => { 
    try {
        await client.groupParticipantsUpdate(jid, [target], "remove");
        TextReply(client, jid, `✅ @${target.split("@")[0]} telah dikeluarkan dari grup.`);
    } catch (error) {
        console.error("❌ Error saat mengeluarkan anggota:", error);
        TextReply(client, jid, "❌ Gagal mengeluarkan anggota.");
    }
};

/**
 * Menambahkan anggota ke dalam grup
 */
exports.addMember = async (client, jid, number) => { 
    try {
        const userJid = number.replace(/\D/g, "") + "@s.whatsapp.net";
        await client.groupParticipantsUpdate(jid, [userJid], "add");
        TextReply(client, jid, `✅ @${number} berhasil ditambahkan.`);
    } catch (error) {
        console.error("❌ Error saat menambahkan anggota:", error);
        TextReply(client, jid, "❌ Gagal menambahkan anggota.");
    }
};

/**
 * Mempromosikan anggota menjadi admin
 */
exports.promoteMember = async (client, jid, target) => {
    try {
        await client.groupParticipantsUpdate(jid, [target], "promote");
        TextReply(client, jid, `✅ @${target.split("@")[0]} sekarang menjadi admin!`);
    } catch (error) {
        console.error("❌ Error saat mempromosikan:", error);
        TextReply(client, jid, "❌ Gagal mempromosikan anggota.");
    }
};

/**
 * Menurunkan admin menjadi anggota biasa
 */
exports.demoteMember = async (client, jid, target) => {
    try {
        await client.groupParticipantsUpdate(jid, [target], "demote");
        TextReply(client, jid, `✅ @${target.split("@")[0]} telah diturunkan dari admin.`);
    } catch (error) {
        console.error("❌ Error saat menurunkan admin:", error);
        TextReply(client, jid, "❌ Gagal menurunkan admin.");
    }
};

/**
 * Mention semua anggota grup
 */
exports.tagAll = async (client, jid) => {
    try {
        const groupMetadata = await client.groupMetadata(jid);
        if (!groupMetadata || !groupMetadata.participants) {
            throw new Error("Gagal mengambil data grup.");
        }

        const mentions = groupMetadata.participants.map(member => member.id);
        const mentionText = mentions.map(member => `@${member.split("@")[0]}`).join("\n");

        await client.sendMessage(jid, { 
            text: `📢 *Tag All*\n\n${mentionText}`, 
            mentions 
        });
    } catch (error) {
        console.error("❌ Error dalam tagAll:", error);
    }
};

/**
 * Mengirim pesan tersembunyi ke semua anggota grup
 */
exports.hideTag = async (client, jid, text) => {
    try {
        const groupMetadata = await client.groupMetadata(jid);
        if (!groupMetadata || !groupMetadata.participants) {
            throw new Error("Gagal mengambil data grup.");
        }

        let mentions = groupMetadata.participants.map(member => member.id);
        await client.sendMessage(jid, { text: text, mentions: mentions });

        console.log("✅ Pesan tersembunyi berhasil dikirim!");
    } catch (error) {
        console.error("❌ Error dalam hideTag:", error);
    }
};

/**
 * Mengubah deskripsi grup
 */
exports.setDesc = async (client, jid, text) => {
    try {
        await client.groupUpdateDescription(jid, text);
        TextReply(client, jid, "✅ Deskripsi grup berhasil diperbarui!");
    } catch (error) {
        console.error("❌ Error dalam setdesc:", error);
        TextReply(client, jid, "❌ Gagal mengubah deskripsi grup.");
    }
};

/**
 * Mengubah nama grup
 */
exports.setSubject = async (client, jid, text) => {
    try {
        await client.groupUpdateSubject(jid, text);
        TextReply(client, jid, "✅ Nama grup berhasil diperbarui!");
    } catch (error) {
        console.error("❌ Error dalam setsubject:", error);
        TextReply(client, jid, "❌ Gagal mengubah nama grup.");
    }
};

/**
 * Menghapus pesan di grup
 */
exports.deleteMessage = async (client, jid, message) => {
    try {
        if (!message || !message.stanzaId) {
            throw new Error("Pesan tidak valid atau tidak memiliki stanzaId.");
        }

        const messageKey = {
            remoteJid: jid,
            id: message.stanzaId,
            fromMe: message.participant ? false : true // Pastikan `fromMe` benar
        };

        await client.sendMessage(jid, { delete: messageKey });
        console.log(`✅ Pesan berhasil dihapus di ${jid}`);
    } catch (error) {
        console.error("❌ Error dalam deleteMessage:", error);
    }
};
