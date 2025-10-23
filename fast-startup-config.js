// Fast Startup Configuration for MADUSANKA-MD
// මෙම config එක startup speed වැඩි කරන්න උදව් කරයි

const config = {
    // Connection Settings
    CONNECTION: {
        TIMEOUT: 15000, // 15 seconds instead of default 30
        RETRY_DELAY: 2000, // 2 seconds between retries
        MAX_RETRIES: 3, // Reduce from 5 to 3
        KEEP_ALIVE: true,
    },
    
    // Plugin Loading Settings
    PLUGINS: {
        LAZY_LOAD: true, // Load non-essential plugins after startup
        ESSENTIAL_PLUGINS: [
            'ping.js',
            'system.js', 
            'main-alive.js',
            'menu.js'
        ],
        LOAD_DELAY: 1000, // 1 second delay for non-essential plugins
    },
    
    // Database Settings
    DATABASE: {
        CONNECTION_TIMEOUT: 8000, // 8 seconds
        POOL_SIZE: 5, // Smaller connection pool
        IDLE_TIMEOUT: 30000, // 30 seconds
    },
    
    // Memory Management
    MEMORY: {
        TEMP_CLEAR_INTERVAL: 120000, // 2 minutes
        MAX_CACHE_SIZE: 50, // MB
        AUTO_GC: true, // Enable garbage collection
    },
    
    // Session Management
    SESSION: {
        DOWNLOAD_TIMEOUT: 20000, // 20 seconds
        RETRY_ATTEMPTS: 2,
        CACHE_SESSION: true,
    },
    
    // Performance Settings
    PERFORMANCE: {
        CONCURRENT_OPERATIONS: 3, // Limit concurrent operations
        BATCH_SIZE: 10, // Process messages in batches
        THROTTLE_DELAY: 100, // ms between operations
    }
};

// Fast startup function
async function fastStartup() {
    console.log('🚀 Starting MADUSANKA-MD with optimizations...');
    
    const startTime = Date.now();
    
    try {
        // 1. Quick session check
        console.log('📋 Step 1: Checking session...');
        await checkSessionQuickly();
        
        // 2. Initialize essential components only
        console.log('⚡ Step 2: Loading essential components...');
        await loadEssentialComponents();
        
        // 3. Start WhatsApp connection
        console.log('📱 Step 3: Connecting to WhatsApp...');
        await connectToWhatsApp();
        
        // 4. Load remaining components in background
        console.log('🔄 Step 4: Loading remaining components...');
        loadRemainingComponents();
        
        const endTime = Date.now();
        const startupTime = (endTime - startTime) / 1000;
        
        console.log(`✅ MADUSANKA-MD started successfully in ${startupTime} seconds!`);
        
    } catch (error) {
        console.error('❌ Startup failed:', error.message);
        throw error;
    }
}

async function checkSessionQuickly() {
    const fs = require('fs');
    const path = require('path');
    
    const sessionPath = path.join(__dirname, 'sessions', 'creds.json');
    
    if (fs.existsSync(sessionPath)) {
        console.log('✅ Session found locally');
        return true;
    }
    
    // Quick download with timeout
    const sessionId = process.env.SESSION_ID;
    if (!sessionId) {
        throw new Error('SESSION_ID not provided');
    }
    
    console.log('⏳ Downloading session with timeout...');
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Session download timeout'));
        }, config.SESSION.DOWNLOAD_TIMEOUT);
        
        const { File } = require('megajs');
        const sessdata = sessionId.replace("MADUSANKA-MD=", '');
        const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
        
        filer.download((err, data) => {
            clearTimeout(timeout);
            if (err) {
                reject(err);
            } else {
                fs.writeFileSync(sessionPath, data);
                console.log('✅ Session downloaded');
                resolve(true);
            }
        });
    });
}

async function loadEssentialComponents() {
    // Load only critical modules
    const essentials = [
        './lib/functions',
        './lib/msg',
        './data',
        './command'
    ];
    
    for (const module of essentials) {
        try {
            require(module);
            console.log(`✅ Loaded: ${module}`);
        } catch (error) {
            console.warn(`⚠️ Failed to load ${module}:`, error.message);
        }
    }
}

async function connectToWhatsApp() {
    const { 
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
        Browsers
    } = require('@whiskeysockets/baileys');
    
    const P = require('pino');
    
    console.log("📱 Connecting to WhatsApp...");
    
    const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/sessions/');
    const { version } = await fetchLatestBaileysVersion();
    
    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Firefox"),
        syncFullHistory: false, // Disable for faster startup
        auth: state,
        version,
        connectTimeoutMs: config.CONNECTION.TIMEOUT,
        defaultQueryTimeoutMs: config.CONNECTION.TIMEOUT,
    });
    
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('WhatsApp connection timeout'));
        }, config.CONNECTION.TIMEOUT);
        
        conn.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                clearTimeout(timeout);
                if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    reject(new Error('Connection closed unexpectedly'));
                } else {
                    reject(new Error('Logged out'));
                }
            } else if (connection === 'open') {
                clearTimeout(timeout);
                console.log('✅ WhatsApp connected successfully');
                resolve(conn);
            }
        });
        
        conn.ev.on('creds.update', saveCreds);
    });
}

function loadRemainingComponents() {
    // Load non-essential plugins with delay
    setTimeout(() => {
        console.log('🔄 Loading remaining plugins...');
        
        const fs = require('fs');
        const path = require('path');
        
        const pluginDir = './plugins/';
        const plugins = fs.readdirSync(pluginDir);
        
        plugins.forEach((plugin, index) => {
            if (plugin.endsWith('.js') && !config.PLUGINS.ESSENTIAL_PLUGINS.includes(plugin)) {
                setTimeout(() => {
                    try {
                        require(path.join(pluginDir, plugin));
                        console.log(`✅ Loaded plugin: ${plugin}`);
                    } catch (error) {
                        console.warn(`⚠️ Failed to load ${plugin}:`, error.message);
                    }
                }, index * 200); // Stagger loading
            }
        });
        
    }, config.PLUGINS.LOAD_DELAY);
}

module.exports = {
    config,
    fastStartup,
    checkSessionQuickly,
    loadEssentialComponents,
    connectToWhatsApp,
    loadRemainingComponents
};

console.log('⚡ Fast startup configuration loaded!');