const fs = require("fs");

/**
 * Mengirim pesan teks
 */
exports.TextReply = async (client, jid, text, quoted = null) => {
    await client.sendMessage(jid, { text: text }, { quoted: quoted });
};

/**
 * Mengirim gambar dengan teks
 */
exports.sendImageMessage = async (client, jid, text, imagePath, quoted = null) => {
    try {
        if (!fs.existsSync(imagePath)) {
            return exports.TextReply(client, jid, "❌ Gambar tidak ditemukan!", quoted);
        }

        await client.sendMessage(jid, {
            image: { stream: fs.createReadStream(imagePath) },
            caption: text,
            footer: "🤖 SelfBot by Panggigo"
        }, { quoted: quoted });

    } catch (error) {
        console.error("❌ Error saat mengirim gambar:", error);
        exports.TextReply(client, jid, "❌ Terjadi kesalahan saat mengirim gambar.", quoted);
    }
};

