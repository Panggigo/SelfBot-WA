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
const { 
    kickMember, addMember, promoteMember, demoteMember, tagAll, hideTag, setDesc, setSubject, deleteMessage,
    blockUser, unblockUser, setProfilePicture, setBio, setName, getProfilePicture,
    TextReply, sendImageMessage, 
    getMediaBuffer, getGroupAdmins, sleep, isUrl, makeSticker, stickerToImage, setBotPrefix, setBotMode, setBotName
} = require("./Lib");

//const { TextReply, ImgReply, isUrl, sleep, getGroupAdmins } = require('./Lib/function');

//=========== Database ==============\\
let settings = JSON.parse(fs.readFileSync("./Database/settings.json", "utf-8"));
let prefix = settings.prefix || "!";
let publicMode = settings.public || true;
let ownerNumber = settings.noOwner;
let botName = settings.bot;

//=================== Start Bot ===================\\
async function StartBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");

    const client = makeWASocket({
        // logger: pino({ level: "silent" }),
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
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            console.log(`📌 Scan QR Code di browser: ${qrUrl}`);
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
            // 🔄 Hapus file session setiap 5 menit, kecuali creds.json
            setInterval(() => {
                fs.readdir(path, (err, files) => {
                    if (err) return console.error("❌ Error membaca folder session:", err);

                    let deletedFiles = []; // 📌 Array untuk menyimpan nama file yang berhasil dihapus

                    files.forEach(file => {
                        if (file !== "creds.json") { // Jangan hapus creds.json
                            fs.unlink(`${path}/${file}`, (err) => {
                                if (!err) deletedFiles.push(file);
                            });
                        }
                    });

                    // 🗑️ Cetak hanya satu log jika ada file yang berhasil dihapus
                    setTimeout(() => {
                        if (deletedFiles.length > 0) {
                            console.log(`🗑️ Menghapus ${deletedFiles.length} file session`);
                            //console.log(`🗑️ Menghapus ${deletedFiles.length} file session: ${deletedFiles.join(", ")}`);
                        }
                    }, 1000); // 🔄 Beri sedikit delay agar fs.unlink() selesai
                });
            }, 5 * 60 * 1000); // ✅ Setiap 5 menit (5 * 60 * 1000 ms)
            console.log(`✅ Bot aktif dengan prefix: \x1b[32m${prefix}\x1b[0m Mode bot: \x1b[32m${publicMode ? "Public" : "Private"}\x1b[0m`);
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
        const pushname = info.pushName ? info.pushName: `${botName}`
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

        //Function Message
        const reply = (text) => { TextReply(client, from, text, info); }
        const ImgMessage = (text, image) => { sendImageMessage(client, from, text, image, info); }
        //Public Mode
        if (!publicMode && !isCreator) { 
            return; // Jika mode privat dan bukan owner, bot tidak akan merespons
        }
        //Log Console
        if (isCmd) { console.log(`📩 Command: ${command} | Dari: ${pushname}`); }

        try {
            switch(command) {
// ========================= 📌 FITUR PRIBADI ========================= \\
                case 'pmenu':
                case 'phelp':
                    try {
                        const pMenuText = `📜 *Private Menu Bot - ${botName}*\n
🔧 *Pengaturan Bot:*
🔹 *${prefix}setprefix [prefix_baru]* - Mengubah prefix bot
🔹 *${prefix}setmode [public/private]* - Mengubah mode bot
🔹 *${prefix}setbotname [nama_baru]* - Mengubah nama bot

📝 *Profil Bot:*
🔹 *${prefix}setname [nama_baru]* - Mengubah nama Profil bot
🔹 *${prefix}setpp* - Mengubah foto profil bot (balas dengan gambar)
🔹 *${prefix}setbio [teks]* - Mengubah bio bot
🔹 *${prefix}getpp* - Melihat foto profil pengguna lain (balas pesan)

🔐 *Perintah Blokir:*
🔹 *${prefix}block* - Memblokir nomor WhatsApp (balas pesan)
🔹 *${prefix}unblock* - Membuka blokir nomor WhatsApp (balas pesan)

🛠️ *Perintah Lainnya:*
🔹 *${prefix}ping* - Mengecek respons bot
🔹 *${prefix}source* - Menampilkan source code bot`;
                        const pMenuImage = "./Media/Foto/menu.jpeg";
                    
                        await ImgMessage(pMenuText, pMenuImage);
                    } catch (error) {
                        console.error("❌ Error dalam menu command:", error);
                        reply("❌ Terjadi kesalahan saat menampilkan menu.");
                    }
                break;
                case 'setprefix':
                    try {
                        if (!isCreator) return reply('⚠️ Hanya pemilik bot yang bisa mengubah prefix!');
                        if (!args[0]) return reply(`❌ Gunakan: ${prefix}setprefix [prefix_baru]`);

                        let newPrefix = await setBotPrefix(client, from, args[0]);
                        if (newPrefix) prefix = newPrefix; // ✅ Perbarui prefix langsung!
                    } catch (error) {
                        console.error("❌ Error saat mengubah prefix:", error); // ✅ Log error di console
                        reply("❌ Terjadi kesalahan saat mengubah prefix. Coba lagi nanti.");
                    }
                break;
                case 'setmode':
                    try {
                        if (!isCreator) return reply('⚠️ Hanya pemilik bot yang bisa mengubah mode bot!');
                        if (!args || args.length === 0) return reply(`❌ Gunakan: ${prefix}setmode [public/private]`);

                        let newMode = await setBotMode(client, from, args[0]);
                        if (newMode !== null) publicMode = newMode; // ✅ Perbarui mode langsung!
                    } catch (error) {
                        console.error("❌ Error saat mengubah mode:", error);
                        reply("❌ Terjadi kesalahan saat mengubah mode bot. Coba lagi nanti.");
                    }
                break;
                case 'setbotname':
                    try {
                        if (!isCreator) return reply("⚠️ Hanya pemilik bot yang bisa mengubah nama!");
                        if (!args.length) return reply("❌ Gunakan: *!setname [nama baru]*");

                        let newBot = await setBotName(client, from, args.join(" "));
                        if (newBot) botName = newBot; // ✅ Perbarui prefix langsung!
                    } catch (error) {
                        console.error("❌ Error saat mengubah nama:", error);
                        reply("❌ Gagal mengubah nama bot.");
                    }
                break;
                case 'setname':
                    try {
                        if (!isCreator) return reply("⚠️ Hanya pemilik bot yang bisa mengubah nama!");
                        if (!args.length) return reply("❌ Gunakan: *!setname [nama baru]*");

                        await setName(client, args.join(" "));
                    } catch (error) {
                        console.error("❌ Error saat mengubah nama:", error);
                        reply("❌ Gagal mengubah nama bot.");
                    }
                break;
                case 'setpp': 
                    try {
                        if (!isCreator) return reply("⚠️ Hanya pemilik bot yang bisa mengganti foto profil!");
                        if (!info.message.imageMessage) return reply("❌ Kirim gambar dengan caption *!setpp* untuk mengubah foto profil!");

                        await setProfilePicture(client, from, info);
                    } catch (error) {
                        console.error("❌ Error saat mengganti foto profil:", error);
                        reply("❌ Gagal mengubah foto profil.");
                    }
                break;
                case 'setbio': 
                    try {
                        if (!isCreator) return reply("⚠️ Hanya pemilik bot yang bisa mengubah bio!");
                        if (!args.length) return reply("❌ Gunakan: *!setbio [teks_baru]*");

                        const newBio = args.join(" ");
                        await setBio(client, newBio, from);
                    } catch (error) {
                        console.error("❌ Error saat mengganti bio:", error);
                        reply("❌ Gagal mengubah bio.");
                    }
                break;
                case 'block': 
                    try {
                        if (!isCreator) return reply("⚠️ Hanya pemilik bot yang bisa memblokir nomor!");
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan caption *!block* untuk memblokirnya!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await blockUser(client, from, target);
                    } catch (error) {
                        console.error("❌ Error saat memblokir:", error);
                        reply("❌ Gagal memblokir nomor.");
                    }
                break;
                case 'unblock': 
                    try {
                        if (!isCreator) return reply("⚠️ Hanya pemilik bot yang bisa membuka blokir!");
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan caption *!unblock* untuk membuka blokir!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await unblockUser(client, from, target);
                    } catch (error) {
                        console.error("❌ Error saat membuka blokir:", error);
                        reply("❌ Gagal membuka blokir.");
                    }
                break;
                case 'getpp':
                    try {
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan *!getpp* untuk melihat foto profilnya!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await getProfilePicture(client, target);
                    } catch (error) {
                        console.error("❌ Error saat mengambil foto profil:", error);
                        reply("❌ Gagal mengambil foto profil.");
                    }
                break;
// ========================= 📌 FITUR GRUP ========================= \\
                case 'gmenu':
                case 'ghelp':
                    try {
                        const gMenuText = `📜 *Group Menu - ${botName}*\n
👥 *Perintah Grup:*
🔹 *${prefix}kick* - Mengeluarkan anggota (balas pesan)
🔹 *${prefix}add 628xxx* - Menambahkan anggota ke grup
🔹 *${prefix}promote* - Menjadikan anggota sebagai admin (balas pesan)
🔹 *${prefix}demote* - Menurunkan admin menjadi anggota biasa (balas pesan)
🔹 *${prefix}getadmin* - Melihat daftar admin grup

📢 *Pengumuman Grup:*
🔹 *${prefix}tagall* - Menandai semua anggota grup
🔹 *${prefix}hidetag [pesan]* - Mengirim pesan tersembunyi ke semua anggota
🔹 *${prefix}setdesc [teks]* - Mengubah deskripsi grup
🔹 *${prefix}setsubject [nama]* - Mengubah nama grup

🗑️ *Administrasi Grup:*
🔹 *${prefix}delete* - Menghapus pesan bot (balas pesan)`;

        const gMenuImage = "./Media/Foto/menu.jpeg"; // Pastikan gambar tersedia
        
        await ImgMessage(gMenuText, gMenuImage);
    } catch (error) {
        console.error("❌ Error dalam menu command:", error);
        reply("❌ Terjadi kesalahan saat menampilkan menu.");
    }
break;

                case 'kick': 
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa mengeluarkan anggota!");
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan caption *!kick* untuk mengeluarkan!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await kickMember(client, from, target);
                    } catch (error) {
                        console.error("❌ Error saat mengeluarkan anggota:", error);
                        reply("❌ Gagal mengeluarkan anggota.");
                    }
                break;
                case 'add': 
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa menambahkan anggota!");
                        if (!args[0]) return reply("❌ Gunakan: *!add 628xxx*");

                        await addMember(client, from, args[0]);
                    } catch (error) {
                        console.error("❌ Error saat menambahkan anggota:", error);
                        reply("❌ Gagal menambahkan anggota.");
                    }
                break;
                case 'promote': 
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa mempromosikan anggota!");
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan caption *!promote* untuk menjadikannya admin!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await promoteMember(client, from, target);
                    } catch (error) {
                        console.error("❌ Error saat mempromosikan:", error);
                        reply("❌ Gagal mempromosikan anggota.");
                    }
                break;
                case 'demote': 
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa menurunkan jabatan!");
                        if (!info.message.extendedTextMessage) return reply("❌ Balas pesan seseorang dengan caption *!demote* untuk menurunkannya dari admin!");

                        const target = info.message.extendedTextMessage.contextInfo.participant;
                        await demoteMember(client, from, target);
                    } catch (error) {
                        console.error("❌ Error saat menurunkan:", error);
                        reply("❌ Gagal menurunkan admin.");
                    }
                break;
                case 'tagall':
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa menandai semua anggota!");

                        await tagAll(client, from);
                    } catch (error) {
                        console.error("❌ Error saat menandai semua anggota:", error);
                        reply("❌ Gagal menandai semua anggota.");
                    }
                break;
                case 'hidetag':
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa mengirim pesan tersembunyi!");

                        await hideTag(client, from, args.join(" ") || "Pesan tersembunyi!");
                    } catch (error) {
                        console.error("❌ Error saat mengirim pesan tersembunyi:", error);
                        reply("❌ Gagal mengirim pesan tersembunyi.");
                    }
                break;
                case 'setdesc':
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa mengubah deskripsi grup!");
                        if (!args.length) return reply("❌ Gunakan: *!setdesc [deskripsi baru]*");

                        await setDesc(client, from, args.join(" "));
                    } catch (error) {
                        console.error("❌ Error saat mengubah deskripsi:", error);
                        reply("❌ Gagal mengubah deskripsi grup.");
                    }
                break;
                case 'setsubject':
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");
                        if (!isCreator) return reply("⚠️ Hanya admin yang bisa mengubah nama grup!");
                        if (!args.length) return reply("❌ Gunakan: *!setsubject [nama baru]*");

                        await setSubject(client, from, args.join(" "));
                    } catch (error) {
                        console.error("❌ Error saat mengubah nama grup:", error);
                        reply("❌ Gagal mengubah nama grup.");
                    }
                break;
                case 'delete':
                    try {
                        if (!info.message.extendedTextMessage || !info.message.extendedTextMessage.contextInfo) {
                            return reply("❌ Balas pesan bot dengan *!delete* untuk menghapusnya!");
                        }

                        const targetMessage = info.message.extendedTextMessage.contextInfo;
        
                        // Pastikan hanya menghapus pesan bot sendiri
                        if (!targetMessage.stanzaId || !targetMessage.participant) {
                            return reply("❌ Pesan tidak bisa dihapus!");
                        }

                        await deleteMessage(client, from, targetMessage);
                    } catch (error) {
                        console.error("❌ Error saat menghapus pesan:", error);
                        reply("❌ Gagal menghapus pesan.");
                    }
                break;
                case 'getadmin':
                    try {
                        if (!isGroup) return reply("⚠️ Perintah ini hanya bisa digunakan di dalam grup!");

                        const groupMetadata = await client.groupMetadata(from);
                        const admins = getGroupAdmins(groupMetadata.participants);
                        const adminList = admins.map(admin => `👑 @${admin.split("@")[0]}`).join("\n");

                        reply(`📜 *Daftar Admin Grup:*\n${adminList}`);
                    } catch (error) {
                        console.error("❌ Error saat mengambil daftar admin:", error);
                        reply("❌ Gagal mengambil daftar admin.");
                    }
                break;
// ========================= 📌 FITUR PUBLIC ========================= \\
                case 'menu':
                case 'help':
                    try {
                        const MenuText = `📜 *Menu Bot - ${botName}*\n
📝 *${prefix}pmenu* - Menampilkan daftar perintah pribadi
👥 *${prefix}gmenu* - Menampilkan daftar perintah grup

🛠️ *Perintah Lainnya:*
🔹 *${prefix}sticker* - Membuat sticker
🔹 *${prefix}toimg* - Mengubah sticker menjadi Foto
🔹 *${prefix}ping* - Mengecek respons bot
🔹 *${prefix}source* - Menampilkan source code bot`;
                        const MenuImage = "./Media/Foto/menu.jpeg";
                    
                        await ImgMessage(MenuText, MenuImage);
                    } catch (error) {
                        console.error("❌ Error dalam menu command:", error);
                        reply("❌ Terjadi kesalahan saat menampilkan menu.");
                    }
                break;
                case 'sticker':
                    try {
                        if (!info.message.imageMessage && !info.message.videoMessage) 
                        return reply("❌ Kirim gambar atau video dengan caption *!sticker*");

                        const media = await getMediaBuffer(info.message);
                        if (!media) return reply("❌ Gagal mengunduh media.");

                        await makeSticker(client, from, media);

                    } catch (error) {
                        console.error("❌ Error saat membuat stiker:", error);
                        reply("❌ Terjadi kesalahan saat membuat stiker.");
                    }
                break;
                case 'toimg':
                    try {
                        if (!info.message.extendedTextMessage || !info.message.extendedTextMessage.contextInfo.quotedMessage) {
                            return reply("❌ Balas pesan stiker dengan *!toimg* untuk mengubahnya menjadi gambar!");
                        }

                        // Ambil pesan yang dibalas (quoted)
                        const quotedMsg = info.message.extendedTextMessage.contextInfo.quotedMessage;

                        // Periksa apakah pesan yang dibalas adalah stiker
                        if (!quotedMsg.stickerMessage) {
                            return reply("❌ Pesan yang dibalas bukan stiker! Gunakan perintah ini hanya untuk stiker.");
                        }

                        // Unduh media dari pesan yang dibalas
                        const buffer = await getMediaBuffer(quotedMsg);

                        if (!buffer) {
                            return reply("❌ Gagal mengunduh stiker. Coba lagi.");
                        }

                        // Konversi stiker ke gambar
                        await stickerToImage(client, from, buffer);

                    } catch (error) {
                        console.error("❌ Error saat mengubah stiker ke gambar:", error);
                        reply("❌ Terjadi kesalahan saat mengubah stiker ke gambar.");
                    }
                break;
                case 'ping':
                    try {
                        const start = Date.now();
                        await reply("🏓 *Pinging...*");
                        const end = Date.now();
                        const pingTime = end - start;
                        await sleep(1000); // 🔹 Tunggu 1 detik sebelum mengirim "Pong!"
                        await reply(`🏓 Pong!\n⏳ *Speed*: ${pingTime} ms`);
                    } catch (error) {
                        console.error("❌ Error dalam command ping:", error);
                        await reply("❌ Terjadi kesalahan saat mengecek ping.");
                    }
                break;
                case 'source':
                    try {
                        const sourceText = `📜 *Source Code Bot*\n\n🔗 GitHub: https://github.com/Panggigo/SelfBot-WA\n\nJangan lupa kasih ⭐ di GitHub!`;
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
