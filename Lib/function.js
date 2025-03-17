const fs = require("fs");

/**
 * Fungsi untuk mendapatkan daftar admin grup
 * @param {Array} participants - Daftar peserta grup
 * @returns {Array} - Daftar ID admin
 */
exports.getGroupAdmins = (participants) => {
    let admins = [];
    for (let i of participants) {
        if (i.admin === "superadmin" || i.admin === "admin") {
            admins.push(i.id);
        }
    }
    return admins || [];
};

/**
 * Fungsi delay (sleep)
 * @param {Number} ms - Waktu delay dalam milidetik
 * @returns {Promise}
 */
exports.sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Cek apakah string adalah URL
 * @param {String} url - URL yang dicek
 * @returns {Boolean} - True jika URL valid, false jika tidak
 */
exports.isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
};

/**
 * Fungsi untuk mengirim pesan teks
 * @param {Object} client - Instance dari Baileys (WhatsApp bot)
 * @param {String} jid - ID penerima pesan
 * @param {String} text - Isi pesan
 * @param {Object} [quoted=null] - Pesan yang dikutip (jika ada)
 */
exports.TextReply = async (client, jid, text, quoted = null) => {
    await client.sendMessage(jid, { text: text }, { quoted: quoted });
};

/**
 * Fungsi untuk mengirim gambar dengan teks
 * @param {Object} client - Instance dari Baileys
 * @param {String} jid - ID penerima pesan
 * @param {String} Text - Teks yang akan muncul di bawah gambar
 * @param {String} Image - Path lokasi gambar
 * @param {Object} [quoted=null] - Pesan yang dikutip (jika ada)
 */
exports.ImgReply = async (client, jid, Text, Image, quoted = null) => {
    try {
        // ✅ Pastikan path gambar ada sebelum dikirim
        if (!Image || !fs.existsSync(Image)) {
            return this.reply(client, jid, "❌ Gambar tidak ditemukan!", quoted);
        }

        const message = {
            image: fs.readFileSync(Image),
            caption: Text || "📜 Tidak ada teks disertakan.",
            footer: "🤖 SelfBot by Panggigo"
        };

        await client.sendMessage(jid, message, { quoted: quoted });

    } catch (error) {
        console.error("❌ Error dalam ImgMessage:", error);
        this.reply(client, jid, "❌ Terjadi kesalahan saat mengirim gambar.", quoted);
    }
};