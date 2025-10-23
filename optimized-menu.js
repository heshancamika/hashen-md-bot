const config = require('./config');
const { cmd, commands } = require('./command');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson, clockString, jsonformat } = require("./lib/functions");
const os = require('os');

// Cache for menu data to avoid recreating it
let menuCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Optimized menu data structure
const getMenuData = () => {
    const now = Date.now();
    if (menuCache && (now - lastCacheTime) < CACHE_DURATION) {
        return menuCache;
    }

    menuCache = {
        '3': {
            title: "📥 *Download Menu* 📥",
            content: `╭━━━〔 *Download Menu* 〕━━━┈⊷
┃◈╭──────────────
┃◈├•  🌐 *Social Media*
┃◈├• • facebook [url]
┃◈├• • mediafire [url]
┃◈├•  • tiktok [url]
┃◈├•  • twitter [url]
┃◈├•  • Insta [url]
┃◈├•  • apk [app]
┃◈├•  • img [query]
┃◈├•  • tt2 [url]
┃◈├•  • pins [url]
┃◈├•  • apk2 [app]
┃◈├•  • fb2 [url]
┃◈├•  • pinterest [url]
┃◈╰──────────────
┃◈╭──────────────
┃◈├•  🎵 *Music/Video*
┃◈├•  • spotify [query]
┃◈├•  • play [song]
┃◈├•  • play2-10 [song]
┃◈├•  • audio [url]
┃◈├•  • video [url]
┃◈├•  • video2-10 [url]
┃◈├•  • ytmp3 [url]
┃◈├•  • ytmp4 [url]
┃◈├•  • song [name]
┃◈├•  • darama [name]
┃◈╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> ${config.DESCRIPTION}`,
            image: true
        },
        // ... other menu items (truncated for brevity)
    };
    
    lastCacheTime = now;
    return menuCache;
};

cmd({
    pattern: "menu",
    desc: "Show interactive menu system",
    category: "menu",
    react: "🧾",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const pushname = m.pushName || "User";
        
        let hostname;
        if (os.hostname().length == 12) {
            hostname = "replit";
        } else if (os.hostname().length == 36) {
            hostname = "heroku";
        } else if (os.hostname().length == 8) {
            hostname = "koyeb";
        } else {
            hostname = os.hostname();
        }

        const menuCaption = `
        ❖─👨‍💻 ᴍᴀᴅᴜꜱᴀɴᴋᴀ 𝙼𝙳  👨‍💻─❖\n\n╭───═❮ *ᴍᴇɴᴜ ʟɪsᴛ* ❯═───❖\n│*𝗛𝗘𝗬 ${pushname} 👋*\n│ *🚀𝙑𝙀𝙍𝙎𝙄𝙊𝙉:* ${require("./package.json").version}\n│ *⌛𝙈𝙀𝙈𝙊𝙍𝙔:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(require('os').totalmem / 1024 / 1024)}MB\n│ *🕒𝙍𝙐𝙉𝙏𝙄𝙈𝙀:* ${runtime(process.uptime())}\n│ *📍𝙋𝙇𝘼𝙏𝙁𝙊𝙍𝙈:* ${hostname}\n╰━━━━━━━━━━━━━━━┈⊷
        
        ╭━━━〔 *${config.BOT_NAME}* 〕━━━┈⊷
┃◈╭──❍「 *USER INFO* 」❍
┃◈├• 👑 Owner : *${config.OWNER_NAME}*
┃◈├• 🤖 Baileys : *Multi Device*
┃◈├• 🖥️ Type : *NodeJs*
┃◈├• 🚀 Platform : *Heroku*
┃◈├• ⚙️ Mode : *[${config.MODE}]*
┃◈├• 🔣 Prefix : *[${config.PREFIX}]*
┃◈├• 🏷️ Version : *2.0.0 Bᴇᴛᴀ*
┃◈╰─┬─★─☆──♪♪─❍
┃◈╭─┴❍「 *BOT STATUS* 」❍
┃◈├• 1  📜 *Main Menu*
┃◈├• 2  👑 *Owner Menu*
┃◈├• 3  📥 *Download Menu*
┃◈├• 4  👥 *Group Menu*
┃◈├• 5  🤣 *Fun Menu*
┃◈├• 6  🤖 *AI Menu*
┃◈├• 7  🎎 *Anime Menu*
┃◈├• 8  ♻️ *Convert Menu*
┃◈├• 9  📌 *Other Menu*
┃◈├• 10 💔 *Reactions Menu*
┃◈╰─┬─★─☆──♪♪─❍
┃◈╰─┬────────────●●►
┃◈╭─┴────────────●●►
┃◈├•𝗝𝗢𝗜𝗡 𝗚𝗥𝗢𝗨𝗣 
https://chat.whatsapp.com/GyKadMbtiIx3krsxwjgh0v
┃◈╰──────────────●●►
╰━━━━━━━━━━━━━━━━━━┈⊷

> ${config.DESCRIPTION}`;

        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '',
                newsletterName: 'ᴍᴀᴅᴜꜱᴀɴᴋᴀ ᴍᴅ',
                serverMessageId: 143
            }
        };

        // Send menu with timeout and error handling
        const sendMenu = async () => {
            try {
                // Try to send image first with timeout
                const imagePromise = conn.sendMessage(
                    from,
                    {
                        image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/x54ibb.jpg' },
                        caption: menuCaption,
                        contextInfo: contextInfo
                    },
                    { quoted: mek }
                );

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Image timeout')), 5000)
                );

                return await Promise.race([imagePromise, timeoutPromise]);
            } catch (e) {
                console.log('Image send failed, using text fallback');
                return await conn.sendMessage(
                    from,
                    { text: menuCaption, contextInfo: contextInfo },
                    { quoted: mek }
                );
            }
        };

        const sentMsg = await sendMenu();
        const messageID = sentMsg.key.id;

        // Optimized message handler with cleanup
        const menuData = getMenuData();
        let handlerActive = true;

        const handler = async (msgData) => {
            if (!handlerActive) return;
            
            try {
                const receivedMsg = msgData.messages[0];
                if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

                const isReplyToMenu = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;
                
                if (isReplyToMenu) {
                    const receivedText = receivedMsg.message.conversation || 
                                      receivedMsg.message.extendedTextMessage?.text;
                    const senderID = receivedMsg.key.remoteJid;

                    if (menuData[receivedText]) {
                        const selectedMenu = menuData[receivedText];
                        
                        try {
                            if (selectedMenu.image) {
                                await conn.sendMessage(
                                    senderID,
                                    {
                                        image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/x54ibb.jpg' },
                                        caption: selectedMenu.content,
                                        contextInfo: contextInfo
                                    },
                                    { quoted: receivedMsg }
                                );
                            } else {
                                await conn.sendMessage(
                                    senderID,
                                    { text: selectedMenu.content, contextInfo: contextInfo },
                                    { quoted: receivedMsg }
                                );
                            }

                            await conn.sendMessage(senderID, {
                                react: { text: '✅', key: receivedMsg.key }
                            });

                        } catch (e) {
                            console.log('Menu reply error:', e);
                            await conn.sendMessage(
                                senderID,
                                { text: selectedMenu.content, contextInfo: contextInfo },
                                { quoted: receivedMsg }
                            );
                        }
                    } else {
                        await conn.sendMessage(
                            senderID,
                            {
                                text: `❌ *Invalid Option!* ❌\n\nPlease reply with a number between 1-10 to select a menu.\n\n*Example:* Reply with "1" for Download Menu\n\n> ${config.DESCRIPTION}`,
                                contextInfo: contextInfo
                            },
                            { quoted: receivedMsg }
                        );
                    }
                }
            } catch (e) {
                console.log('Handler error:', e);
            }
        };

        // Add listener with automatic cleanup
        conn.ev.on("messages.upsert", handler);

        // Cleanup after 3 minutes (reduced from 5)
        setTimeout(() => {
            handlerActive = false;
            conn.ev.off("messages.upsert", handler);
        }, 180000);

    } catch (e) {
        console.error('Menu Error:', e);
        await reply(`❌ Menu system error: ${e.message}`);
    }
});