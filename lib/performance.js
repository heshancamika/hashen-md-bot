class PerformanceMonitor {
    constructor() {
        this.metrics = {
            messageCount: 0,
            averageResponseTime: 0,
            errorCount: 0,
            startTime: Date.now()
        };
        this.responseTimes = [];
    }

    recordMessage() {
        this.metrics.messageCount++;
    }

    recordResponseTime(time) {
        this.responseTimes.push(time);
        if (this.responseTimes.length > 100) {
            this.responseTimes.shift(); // Keep only last 100 measurements
        }
        this.metrics.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    }

    recordError() {
        this.metrics.errorCount++;
    }

    getMetrics() {
        const uptime = Date.now() - this.metrics.startTime;
        return {
            ...this.metrics,
            uptime: uptime,
            messagesPerMinute: (this.metrics.messageCount / (uptime / 60000)).toFixed(2),
            errorRate: (this.metrics.errorCount / this.metrics.messageCount * 100).toFixed(2) + '%'
        };
    }

    logPerformance() {
        const metrics = this.getMetrics();
        console.log('📊 Performance Metrics:', {
            'Messages Processed': metrics.messageCount,
            'Average Response Time': metrics.averageResponseTime.toFixed(2) + 'ms',
            'Messages/Min': metrics.messagesPerMinute,
            'Error Rate': metrics.errorRate,
            'Uptime': Math.floor(metrics.uptime / 1000) + 's'
        });
    }
}

// Global performance monitor
const performanceMonitor = new PerformanceMonitor();

// Log performance every 5 minutes
setInterval(() => {
    performanceMonitor.logPerformance();
}, 300000);

module.exports = { PerformanceMonitor, performanceMonitor };