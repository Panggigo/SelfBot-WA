const fs = require("fs");
const sharp = require("sharp");
const { TextReply } = require("./messageFunctions");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const MAX_SIZE_MB = 6; // 🔹 Batas ukuran file 6MB

/**
 * Menyesuaikan ukuran gambar menjadi kotak (1:1) dengan background transparan
 */
async function convertToSquare(media) {
    const { width, height } = await sharp(media).metadata();

    if (width !== height) {
        const size = Math.max(width, height);
        return await sharp(media)
            .resize(size, size, {
                fit: "contain",
                background: { r: 0, g: 0, b: 0, alpha: 0 } // 🔹 Transparan
            })
            .toBuffer();
    }
    return media;
}

/**
 * Mengubah media menjadi format WebP untuk stiker
 */
async function convertToWebp(media) {
    return await sharp(media)
        .resize(512, 512, { fit: "cover", position: "center" })
        .toFormat("webp")
        .toBuffer();
}

/**
 * Mengunduh media dari pesan WhatsApp
 */
exports.getMediaBuffer = async (message) => {
    try {
        if (!message) throw new Error("Pesan tidak mengandung media.");

        // 🔹 Dapatkan tipe pesan (imageMessage, videoMessage, dll.)
        const messageType = Object.keys(message).find((key) =>
            ["imageMessage", "videoMessage", "stickerMessage"].includes(key)
        );

        if (!messageType) {
            console.error("❌ Media tidak ditemukan dalam pesan:", message);
            throw new Error("Media tidak valid.");
        }

        console.log(`📥 Mengunduh media dengan tipe: ${messageType}`);

        const stream = await downloadContentFromMessage(
            message[messageType], 
            messageType.replace("Message", "")
        );

        if (!stream) {
            throw new Error("Stream media kosong.");
        }

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        if (buffer.length === 0) {
            throw new Error("Buffer media kosong.");
        }

        return buffer;
    } catch (error) {
        console.error("❌ Gagal mengunduh media:", error);
        return null;
    }
};

/**
 * Fungsi untuk mendapatkan daftar admin grup
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
 */
exports.sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Cek apakah string adalah URL
 */
exports.isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
};

/**
 * Membuat stiker dari gambar atau video
 */
exports.makeSticker = async (client, jid, media) => {
    try {
        // 🔹 Periksa ukuran file
        if (media.length > MAX_SIZE_MB * 1024 * 1024) {
            console.error("❌ Ukuran media terlalu besar untuk dijadikan stiker.");
            return await TextReply(client, jid, "❌ Ukuran file terlalu besar. Gunakan gambar/video di bawah 6MB.");
        }

        // 🔹 Konversi ke ukuran yang sesuai
        const squareImage = await convertToSquare(media);
        const webpBuffer = await convertToWebp(squareImage);

        // 🔹 Simpan untuk debugging (opsional)
        const stickerpath = "./Media/Sticker/debug-sticker.webp";
        fs.writeFileSync(stickerpath, webpBuffer);

        let attempts = 0;
        let success = false;

        // 🔹 Coba kirim hingga 3 kali jika gagal
        while (attempts < 3 && !success) {
            try {
                await client.sendMessage(jid, { 
                    sticker: webpBuffer, 
                    mimetype: "image/webp",
                    stickerAuthor: "SelfBot",  // 🔹 Nama pembuat stiker
                    stickerPack: "Panggigo Stickers" // 🔹 Nama pack stiker
                });
                success = true;
                console.log(`✅ Stiker berhasil dikirim ke ${jid}`);
                await TextReply(client, jid, "✅ Stiker berhasil dibuat!");
            } catch (uploadError) {
                attempts++;
                console.error(`❌ Gagal mengunggah stiker (Percobaan ${attempts}/3):`, uploadError);
                if (attempts === 3) throw uploadError;
            }
        }
    } catch (error) {
        console.error("❌ Error dalam makeSticker:", error);
        await TextReply(client, jid, "❌ Terjadi kesalahan saat membuat stiker.");
    }
};

/**
 * Mengubah stiker (webp) menjadi gambar (png) dan mengirim ke pengguna
 */
exports.stickerToImage = async (client, jid, media) => { 
    try {
        // Konversi WebP ke PNG
        const pngImage = await sharp(media)
            .toFormat("png")
            .toBuffer();

        // Kirim gambar hasil konversi
        await client.sendMessage(jid, { image: pngImage, caption: "✅ Stiker berhasil dikonversi ke gambar!" });
        console.log("✅ Stiker berhasil dikonversi ke gambar.");
    } catch (error) {
        console.error("❌ Error dalam stickerToImage:", error);
        TextReply(client, jid, "❌ Gagal mengonversi stiker.");
    }
};

/**
 * Mengubah prefix bot dan menyimpannya ke dalam settings.json
 */
exports.setBotPrefix = async (client, jid, newPrefix) => {
    try {
        let settings = JSON.parse(fs.readFileSync("./Database/settings.json", "utf-8"));
        settings.prefix = newPrefix;
        fs.writeFileSync("./Database/settings.json", JSON.stringify(settings, null, 2));
        console.log(`✅ Prefix berhasil diubah menjadi: ${newPrefix}`);
        TextReply(client, jid, `✅ Prefix berhasil diubah menjadi *${newPrefix}*`);
        return newPrefix; // ✅ Kembalikan prefix baru
    } catch (error) {
        console.error("❌ Error saat mengubah prefix:", error);
        TextReply(client, jid, "❌ Terjadi kesalahan saat mengubah prefix. Coba lagi nanti.");
        return null;
    }
};

/**
 * Mengubah mode bot (public/private) dan menyimpannya ke dalam settings.json
 */
exports.setBotMode = async (client, jid, mode) => {
    try {
        let settings = JSON.parse(fs.readFileSync("./Database/settings.json", "utf-8"));
        if (mode.toLowerCase() !== "public" && mode.toLowerCase() !== "private") {
            throw new Error("Mode tidak valid! Gunakan: public atau private.");
        }
        settings.public = mode.toLowerCase() === "public";
        fs.writeFileSync("./Database/settings.json", JSON.stringify(settings, null, 2));
        console.log(`✅ Mode bot berhasil diubah menjadi: ${mode.toUpperCase()}`);
        TextReply(client, jid, `✅ Mode bot berhasil diubah menjadi *${mode.toUpperCase()}*`);
        return settings.public; // ✅ Kembalikan mode bot baru
    } catch (error) {
        console.error("❌ Error saat mengubah mode:", error);
        TextReply(client, jid, "❌ Terjadi kesalahan saat mengubah mode bot. Coba lagi nanti.");
        return null;
    }
};

/**
 * Mengubah nama bot dan menyimpannya ke dalam settings.json
 */
exports.setBotName = async (client, jid, newBot) => {
    try {
        let settings = JSON.parse(fs.readFileSync("./Database/settings.json", "utf-8"));
        settings.bot = newBot;
        fs.writeFileSync("./Database/settings.json", JSON.stringify(settings, null, 2));
        console.log(`✅ Nama bot berhasil diubah menjadi: ${newBot}`);
        TextReply(client, jid, `✅ Nama bot berhasil diubah menjadi *${newBot}*`);
        return newBot; // ✅ Kembalikan nama bot baru
    } catch (error) {
        console.error("❌ Error saat mengubah nama bot:", error);
        await client.sendMessage(jid, { text: "❌ Gagal mengubah nama bot." });
    }
};