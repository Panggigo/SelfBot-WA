const { 
    default: makeWASocket, 
    downloadContentFromMessage, 
    DisconnectReason, 
    useMultiFileAuthState, 
    getContentType 
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = "./session/";
const pino = require('pino');
const qrcode = require("qrcode-terminal");

//=========== Function ==============\\
const { TextReply, ImgReply, isUrl, sleep, getGroupAdmins } = require('./Lib/function');

//=========== Database ==============\\
const setting = JSON.parse(fs.readFileSync('./Database/settings.json'));

let prefix = setting.prefix;
let publicMode = setting.public; // Ubah nama variabel agar lebih jelas
let ownerNumber = setting.noOwner; // Nomor pemilik bot
let bot = setting.bot;

//=================== Start Bot ===================\\
async function StartBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");

    const client = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: true,
        auth: state
    });

    // ✅ Pastikan `saveCreds` adalah fungsi sebelum digunakan
    if (typeof saveCreds === "function") {
        client.ev.on("creds.update", saveCreds);
    } else {
        console.error("❌ ERROR: saveCreds bukan fungsi yang valid.");
    }

    // ✅ Event untuk menangani koneksi
    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("📌 Scan QR Code ini untuk login:");
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                console.log("❌ Sesi kadaluarsa! Silakan scan ulang QR Code.");
                process.exit();
            } else {
                console.log("🔄 Bot terputus, mencoba menyambung ulang...");
                StartBot();
            }
        } else if (connection === "open") {
            // 🔄 Hapus file lama sebelum bot mulai
            fs.readdir(path, (err, files) => {
                if (err) console.log("❌ Error membaca folder session:", err);
                files.forEach(file => {
                    if (!file.includes("creds.json")) { // Jangan hapus file utama
                        fs.unlinkSync(`${path}/${file}`);
                    }
                });
                console.log("🗑️ File session lama dihapus, kecuali creds.json");
            });
            console.log(`\x1b[32m✅ Bot WhatsApp Terhubung!\x1b[0m`);
        }
    });

    // ✅ Event untuk menangani pesan masuk
    client.ev.on('messages.upsert', async ({ messages }) => {
        const info = messages[0];
        if (!info.message) return;

        const from = info.key.remoteJid;
        const type = getContentType(info.message);
        const fromMe = info.key.fromMe;
        const isGroup = from.endsWith("@g.us");
        const pushname = info.pushName ? info.pushName: `${bot}`
        const isCreator = (info.key.fromMe || from === ownerNumber); // Perbaiki cek kepemilikan bot

        // ✅ Ambil isi pesan
        var body = (type === 'conversation') ? info.message.conversation :
            (type == 'imageMessage') ? info.message.imageMessage.caption :
            (type == 'videoMessage') ? info.message.videoMessage.caption :
            (type == 'extendedTextMessage') ? info.message.extendedTextMessage.text :
            (type == 'buttonsResponseMessage') ? info.message.buttonsResponseMessage.selectedButtonId :
            (type == 'listResponseMessage') ? info.message.listResponseMessage.singleSelectReply.selectedRowId :
            (type == 'templateButtonReplyMessage') ? info.message.templateButtonReplyMessage.selectedId :
            (type === 'messageContextInfo') ? (info.message.buttonsResponseMessage?.selectedButtonId || info.message.listResponseMessage?.singleSelectReply.selectedRowId || info.text) : '';

        const args = body.trim().split(/ +/).slice(1);
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(1).trim().split(/ +/).shift().toLowerCase() : null;

        //Function Reply
        const reply = (text) => { TextReply(client, from, text, info); }
        const ImgMessage = (text, image) => { ImgReply(client, from, text, image, info); }
        //Log Console
        if (isCmd) { console.log(`📩 Command: ${command} | Dari: ${pushname}`); }

        if (!publicMode) { // ✅ Gunakan `publicMode` yang benar
            if (!isCreator) return; // Jika bukan owner, bot tidak akan merespon
        }
        try {
            switch(command) {
                case 'setprefix':
                    try {
                        if (!isCreator) return reply('⚠️ Hanya pemilik bot yang bisa mengubah prefix!');
                        if (!args[0]) return reply(`❌ Gunakan: ${prefix}setprefix [prefix_baru]`);

                        // ✅ Ubah prefix dalam settings.json
                        setting.prefix = args[0];
                        fs.writeFileSync('./Database/settings.json', JSON.stringify(setting, null, '\t'));

                        // ✅ Perbarui variabel prefix yang sedang digunakan
                        prefix = setting.prefix;
                        reply(`✅ Prefix berhasil diubah menjadi *${args[0]}*`);
                    } catch (error) {
                        console.error("❌ Error saat mengubah prefix:", error); // ✅ Log error di console
                        reply("❌ Terjadi kesalahan saat mengubah prefix. Coba lagi nanti.");
                    }
                break;
                case 'setmode':
                    try {
                        if (!isCreator) return reply('⚠️ Hanya pemilik bot yang bisa mengubah mode bot!');
                        if (!args || args.length === 0) return reply(`❌ Gunakan: ${prefix}setmode [public/private]`);
                        const mode = args[0].toLowerCase();
                        if (mode !== "public" && mode !== "private") {
                            return reply(`❌ Pilihan tidak valid! Gunakan: \n• ${prefix}setmode public\n• ${prefix}setmode private`);
                        }

                        // ✅ Ubah mode dalam settings.json
                        setting.public = mode === "public";
                        fs.writeFileSync('./Database/settings.json', JSON.stringify(setting, null, '\t'));

                        // ✅ Perbarui mode bot secara langsung
                        publicMode = setting.public;

                        reply(`✅ Mode bot berhasil diubah menjadi *${mode.toUpperCase()}*`);
                    } catch (error) {
                        console.error("❌ Error saat mengubah mode:", error);
                        reply("❌ Terjadi kesalahan saat mengubah mode bot. Coba lagi nanti.");
                    }
                break;
                case 'menu':
                case 'help':
                    try {
                        const menuText = `📜 *Menu Bot*\n
🔹 *${prefix}menu* - Menampilkan daftar perintah
🔹 *${prefix}setmode [public/private]* - Mengubah mode bot
🔹 *${prefix}setprefix [prefix_baru]* - Mengubah prefix bot
🔹 *${prefix}ping* - Mengecek respons bot
🔹 *${prefix}source* - Menampilkan source code bot`;
                        const MenuImage = "./Media/Foto/menu.jpeg";
                    
                        await ImgMessage(menuText, MenuImage);
                    } catch (error) {
                        console.error("❌ Error dalam menu command:", error);
                        reply("❌ Terjadi kesalahan saat menampilkan menu.");
                    }
                break;
                case 'ping':
                    try {
                        const start = Date.now();
                        const pong = await reply("🏓 *Pinging...*");
                        const end = Date.now();
                        const pingTime = end - start;
                        reply(`🏓 Pong!\n⏳ *Speed*: ${pingTime} ms`);
                    } catch (error) {
                        console.error("❌ Error dalam command ping:", error);
                        reply("❌ Terjadi kesalahan saat mengecek ping.");
                    }
                break;
                case 'source':
                    try {
                        const sourceText = `📜 *Source Code Bot*\n\n🔗 GitHub: https://github.com/Panggigo/Selfbot)\n\nKode ini dibuat oleh *Panggigo*. Jangan lupa kasih ⭐ di GitHub!`;
                        reply(sourceText);
                    } catch (error) {
                        console.error("❌ Error dalam command source:", error);
                        reply("❌ Terjadi kesalahan saat menampilkan source.");
                    }
                break;


                default:
                    if (isCmd) reply(`⚠️ Perintah *${command}* tidak ditemukan.`);
                    break;
            }
        } catch (error) {
            console.error("❌ Error di command:", error);
        }
    });
}
StartBot()