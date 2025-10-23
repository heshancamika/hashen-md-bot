const os = require('os');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
    constructor() {
        this.startTime = Date.now();
        this.memoryThreshold = 100; // MB
        this.cpuThreshold = 80; // Percentage
        this.interval = null;
        this.logFile = path.join(__dirname, 'performance.log');
    }

    start() {
        console.log('🔍 Performance Monitor Started');
        
        this.interval = setInterval(() => {
            this.checkPerformance();
        }, 30000); // Check every 30 seconds
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        console.log('🛑 Performance Monitor Stopped');
    }

    checkPerformance() {
        const memoryUsage = this.getMemoryUsage();
        const cpuUsage = this.getCpuUsage();
        const uptime = this.getUptime();

        // Log performance data
        const logData = {
            timestamp: new Date().toISOString(),
            memory: memoryUsage,
            cpu: cpuUsage,
            uptime: uptime
        };

        this.logPerformance(logData);

        // Check for performance issues
        if (memoryUsage.heapUsed > this.memoryThreshold) {
            console.warn(`⚠️ High memory usage: ${memoryUsage.heapUsed}MB`);
            this.triggerGarbageCollection();
        }

        if (cpuUsage > this.cpuThreshold) {
            console.warn(`⚠️ High CPU usage: ${cpuUsage}%`);
        }
    }

    getMemoryUsage() {
        const used = process.memoryUsage();
        return {
            rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
            heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
            heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
            external: Math.round(used.external / 1024 / 1024 * 100) / 100
        };
    }

    getCpuUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        for (let i = 0; i < cpus.length; i++) {
            const cpu = cpus[i];
            for (let type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }

        return Math.round(100 - (100 * totalIdle / totalTick));
    }

    getUptime() {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    logPerformance(data) {
        try {
            const logEntry = JSON.stringify(data) + '\n';
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to log performance data:', error);
        }
    }

    triggerGarbageCollection() {
        if (global.gc) {
            console.log('🗑️ Triggering garbage collection...');
            global.gc();
        } else {
            console.log('⚠️ Garbage collection not available. Start with --expose-gc flag');
        }
    }

    getPerformanceReport() {
        const memoryUsage = this.getMemoryUsage();
        const cpuUsage = this.getCpuUsage();
        const uptime = this.getUptime();

        return {
            uptime: uptime,
            memory: memoryUsage,
            cpu: cpuUsage,
            platform: os.platform(),
            arch: os.arch(),
            totalMemory: Math.round(os.totalmem() / 1024 / 1024),
            freeMemory: Math.round(os.freemem() / 1024 / 1024)
        };
    }

    cleanup() {
        this.stop();
        
        // Clean up old log files (keep last 7 days)
        try {
            if (fs.existsSync(this.logFile)) {
                const stats = fs.statSync(this.logFile);
                const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                
                if (daysSinceModified > 7) {
                    fs.unlinkSync(this.logFile);
                    console.log('📁 Cleaned up old performance logs');
                }
            }
        } catch (error) {
            console.error('Failed to cleanup logs:', error);
        }
    }
}

module.exports = PerformanceMonitor;