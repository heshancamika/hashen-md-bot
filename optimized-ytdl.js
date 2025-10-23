const config = require('../config');
const { cmd } = require('../command');
const DY_SCRAP = require('@dark-yasiya/scrap');
const yts = require('yt-search');

// Initialize scraper with timeout
const dy_scrap = new DY_SCRAP();

// Cache for search results to avoid repeated API calls
const searchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function replaceYouTubeID(url) {
    const regex = /(?:youtube\.com\/(?:.*v=|.*\/)|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Optimized search function with caching
async function searchVideo(query) {
    const cacheKey = `search_${query}`;
    const cached = searchCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return cached.data;
    }
    
    try {
        const searchResults = await dy_scrap.ytsearch(query);
        if (searchResults?.results?.length) {
            searchCache.set(cacheKey, {
                data: searchResults,
                timestamp: Date.now()
            });
            return searchResults;
        }
    } catch (error) {
        console.log('Search error:', error.message);
    }
    
    return null;
}

// Clean up old cache entries
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of searchCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            searchCache.delete(key);
        }
    }
}, 60000); // Clean every minute

cmd({
    pattern: "song",
    alias: ["mp3", "ytmp3"],
    react: "🎵",
    desc: "Download Ytmp3",
    category: "download",
    use: ".song <Text or YT URL>",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply("❌ Please provide a Query or Youtube URL!");

        let id = q.startsWith("https://") ? replaceYouTubeID(q) : null;
        let videoData = null;

        if (!id) {
            // Use cached search
            const searchResults = await searchVideo(q);
            if (!searchResults?.results?.length) {
                return await reply("❌ No results found!");
            }
            id = searchResults.results[0].videoId;
            videoData = searchResults.results[0];
        } else {
            // Get video data for URL
            try {
                const data = await dy_scrap.ytsearch(`https://youtube.com/watch?v=${id}`);
                if (data?.results?.length) {
                    videoData = data.results[0];
                }
            } catch (error) {
                console.log('Video data fetch error:', error.message);
            }
        }

        if (!videoData) {
            return await reply("❌ Failed to fetch video information!");
        }

        const { url, title, image, timestamp, ago, views, author } = videoData;

        let info = `🍄 *ᴍᴀᴅᴜꜱᴀɴᴋᴀ ᴍᴅ 𝚂𝙾𝙽𝙶 𝙳ʟ* 🍄\n\n` +
            `🎵 *Title:* ${title || "Unknown"}\n` +
            `⏳ *Duration:* ${timestamp || "Unknown"}\n` +
            `👀 *Views:* ${views || "Unknown"}\n` +
            `🌏 *Release Ago:* ${ago || "Unknown"}\n` +
            `👤 *Author:* ${author?.name || "Unknown"}\n` +
            `🖇 *Url:* ${url || "Unknown"}\n\n` +
            `🔽 *Reply with your choice:*\n` +
            `1.1 *Audio Type* 🎵\n` +
            `1.2 *Document Type* 📁\n\n` +
            `${config.FOOTER || "https://files.catbox.moe/x54ibb.jpg"}`;

        const sentMsg = await conn.sendMessage(from, { image: { url: image }, caption: info }, { quoted: mek });
        const messageID = sentMsg.key.id;
        await conn.sendMessage(from, { react: { text: '🎶', key: sentMsg.key } });

        // Optimized reply handler with timeout
        let handlerActive = true;
        const handler = async (messageUpdate) => { 
            if (!handlerActive) return;
            
            try {
                const mekInfo = messageUpdate?.messages[0];
                if (!mekInfo?.message) return;

                const messageType = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
                const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (!isReplyToSentMsg) return;

                let userReply = messageType.trim();
                let msg;
                let type;
                let response;
                
                if (userReply === "1.1") {
                    msg = await conn.sendMessage(from, { text: "⏳ Processing audio..." }, { quoted: mek });
                    
                    try {
                        response = await dy_scrap.ytmp3(`https://youtube.com/watch?v=${id}`);
                        let downloadUrl = response?.result?.download?.url;
                        if (!downloadUrl) {
                            await reply("❌ Download link not found!");
                            return;
                        }
                        type = { audio: { url: downloadUrl }, mimetype: "audio/mpeg" };
                    } catch (error) {
                        await reply("❌ Audio processing failed!");
                        return;
                    }
                    
                } else if (userReply === "1.2") {
                    msg = await conn.sendMessage(from, { text: "⏳ Processing document..." }, { quoted: mek });
                    
                    try {
                        const response = await dy_scrap.ytmp3(`https://youtube.com/watch?v=${id}`);
                        let downloadUrl = response?.result?.download?.url;
                        if (!downloadUrl) {
                            await reply("❌ Download link not found!");
                            return;
                        }
                        type = { document: { url: downloadUrl }, fileName: `${title}.mp3`, mimetype: "audio/mpeg", caption: title };
                    } catch (error) {
                        await reply("❌ Document processing failed!");
                        return;
                    }
                    
                } else { 
                    return await reply("❌ Invalid choice! Reply with 1.1 or 1.2.");
                }

                await conn.sendMessage(from, type, { quoted: mek });
                await conn.sendMessage(from, { text: '✅ Media Upload Successful ✅', edit: msg.key });

                // Deactivate handler after successful processing
                handlerActive = false;
                conn.ev.off('messages.upsert', handler);

            } catch (error) {
                console.error('Handler error:', error);
                await reply(`❌ *An error occurred while processing:* ${error.message || "Error!"}`);
                handlerActive = false;
                conn.ev.off('messages.upsert', handler);
            }
        };

        // Add listener with automatic cleanup
        conn.ev.on('messages.upsert', handler);

        // Cleanup after 2 minutes
        setTimeout(() => {
            handlerActive = false;
            conn.ev.off('messages.upsert', handler);
        }, 120000);

    } catch (error) {
        console.error('Song command error:', error);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply(`❌ *An error occurred:* ${error.message || "Error!"}`);
    }
});