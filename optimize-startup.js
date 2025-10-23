// MADUSANKA-MD Startup Optimization Script
// මෙම script එක startup delays අඩු කරන්න උදව් කරයි

const fs = require('fs');
const path = require('path');

// 1. Plugin Loading Optimization
function optimizePluginLoading() {
    console.log('🔧 Optimizing plugin loading...');
    
    // Create plugin loader with lazy loading
    const pluginLoader = {
        loadPlugins: async function() {
            const pluginDir = './plugins/';
            const plugins = fs.readdirSync(pluginDir);
            
            // Load essential plugins first
            const essentialPlugins = ['ping.js', 'system.js', 'main-alive.js'];
            const otherPlugins = plugins.filter(p => !essentialPlugins.includes(p) && p.endsWith('.js'));
            
            // Load essential plugins immediately
            for (const plugin of essentialPlugins) {
                if (fs.existsSync(path.join(pluginDir, plugin))) {
                    try {
                        require(path.join(pluginDir, plugin));
                        console.log(`✅ Loaded essential plugin: ${plugin}`);
                    } catch (error) {
                        console.error(`❌ Error loading ${plugin}:`, error.message);
                    }
                }
            }
            
            // Load other plugins with delay
            setTimeout(() => {
                otherPlugins.forEach(plugin => {
                    try {
                        require(path.join(pluginDir, plugin));
                        console.log(`✅ Loaded plugin: ${plugin}`);
                    } catch (error) {
                        console.error(`❌ Error loading ${plugin}:`, error.message);
                    }
                });
                console.log('🎉 All plugins loaded successfully!');
            }, 2000);
        }
    };
    
    return pluginLoader;
}

// 2. Session Management Optimization
function optimizeSessionManagement() {
    console.log('🔧 Optimizing session management...');
    
    return {
        checkSession: function() {
            const sessionPath = path.join(__dirname, 'sessions', 'creds.json');
            
            if (fs.existsSync(sessionPath)) {
                console.log('✅ Session file exists, skipping download');
                return true;
            }
            
            console.log('⏳ Session file not found, will download...');
            return false;
        },
        
        downloadWithRetry: async function(sessionId, maxRetries = 3) {
            const { File } = require('megajs');
            
            for (let i = 0; i < maxRetries; i++) {
                try {
                    console.log(`🔄 Attempting session download (${i + 1}/${maxRetries})...`);
                    
                    const sessdata = sessionId.replace("MADUSANKA-MD=", '');
                    const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
                    
                    return new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Download timeout'));
                        }, 30000); // 30 second timeout
                        
                        filer.download((err, data) => {
                            clearTimeout(timeout);
                            if (err) {
                                reject(err);
                            } else {
                                fs.writeFileSync(path.join(__dirname, 'sessions', 'creds.json'), data);
                                console.log("✅ Session downloaded successfully");
                                resolve(true);
                            }
                        });
                    });
                } catch (error) {
                    console.log(`❌ Download attempt ${i + 1} failed:`, error.message);
                    if (i === maxRetries - 1) throw error;
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
                }
            }
        }
    };
}

// 3. Database Connection Optimization
function optimizeDatabaseConnection() {
    console.log('🔧 Optimizing database connections...');
    
    return {
        initializeWithTimeout: async function() {
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database connection timeout')), 10000)
            );
            
            const dbInit = new Promise(async (resolve) => {
                try {
                    // Initialize your database here
                    console.log('✅ Database initialized');
                    resolve(true);
                } catch (error) {
                    console.error('❌ Database initialization failed:', error.message);
                    resolve(false);
                }
            });
            
            return Promise.race([dbInit, timeout]);
        }
    };
}

// 4. Memory Management
function optimizeMemoryUsage() {
    console.log('🔧 Optimizing memory usage...');
    
    // Clear temp directory more frequently
    const tempDir = path.join(require('os').tmpdir(), 'cache-temp');
    
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const clearTempDir = () => {
        try {
            const files = fs.readdirSync(tempDir);
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                fs.unlinkSync(filePath);
            });
            console.log('🧹 Temp directory cleared');
        } catch (error) {
            console.error('❌ Error clearing temp directory:', error.message);
        }
    };
    
    // Clear every 2 minutes instead of 5
    setInterval(clearTempDir, 2 * 60 * 1000);
    
    return { clearTempDir };
}

// 5. Connection Retry Logic
function optimizeConnectionRetry() {
    console.log('🔧 Optimizing connection retry logic...');
    
    return {
        connectWithRetry: async function(connectFunction, maxRetries = 5) {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    console.log(`🔄 Connection attempt ${i + 1}/${maxRetries}...`);
                    await connectFunction();
                    console.log('✅ Connected successfully!');
                    return true;
                } catch (error) {
                    console.log(`❌ Connection attempt ${i + 1} failed:`, error.message);
                    
                    if (i < maxRetries - 1) {
                        const delay = Math.min(1000 * Math.pow(2, i), 10000); // Exponential backoff
                        console.log(`⏳ Retrying in ${delay/1000} seconds...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            throw new Error('Max connection retries exceeded');
        }
    };
}

// Export optimization functions
module.exports = {
    optimizePluginLoading,
    optimizeSessionManagement,
    optimizeDatabaseConnection,
    optimizeMemoryUsage,
    optimizeConnectionRetry
};

console.log('🚀 Startup optimization script loaded!');
console.log('💡 Use these functions in your main index.js file to improve startup speed');