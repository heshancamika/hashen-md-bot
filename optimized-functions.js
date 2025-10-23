const axios = require('axios');

// Add timeout and retry configuration
const axiosConfig = {
    timeout: 10000, // 10 seconds timeout
    retry: 3,
    retryDelay: 1000
};

const getBuffer = async(url, options = {}) => {
    try {
        const config = {
            method: 'get',
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            responseType: 'arraybuffer',
            timeout: axiosConfig.timeout,
            ...options
        };

        const res = await axios(config);
        return res.data;
    } catch (e) {
        console.log('getBuffer error:', e.message);
        throw new Error(`Failed to fetch buffer: ${e.message}`);
    }
};

const getGroupAdmins = (participants) => {
    return participants.filter(p => p.admin !== null).map(p => p.id);
};

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

const h2k = (eco) => {
    const lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E'];
    const ma = Math.log10(Math.abs(eco)) / 3 | 0;
    if (ma == 0) return eco;
    const ppo = lyrik[ma];
    const scale = Math.pow(10, ma * 3);
    const scaled = eco / scale;
    const formatt = scaled.toFixed(1);
    if (/\.0$/.test(formatt))
        formatt = formatt.substr(0, formatt.length - 2);
    return formatt + ppo;
};

const isUrl = (url) => {
    return url.match(
        new RegExp(
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/,
            'gi'
        )
    );
};

const Json = (string) => {
    return JSON.stringify(string, null, 2);
};

const runtime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : '';
    const hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : '';
    const mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : '';
    const sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : '';
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

const sleep = async(ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Optimized fetchJson with retry mechanism
const fetchJson = async (url, options = {}) => {
    let lastError;
    
    for (let attempt = 1; attempt <= axiosConfig.retry; attempt++) {
        try {
            const config = {
                method: 'GET',
                url: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
                },
                timeout: axiosConfig.timeout,
                ...options
            };
            
            const res = await axios(config);
            return res.data;
        } catch (err) {
            lastError = err;
            if (attempt < axiosConfig.retry) {
                await sleep(axiosConfig.retryDelay * attempt);
            }
        }
    }
    
    console.log('fetchJson failed after retries:', lastError.message);
    return { error: lastError.message };
};

// Add utility functions for better performance
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Memory usage monitoring
const getMemoryUsage = () => {
    const used = process.memoryUsage();
    return {
        rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(used.external / 1024 / 1024 * 100) / 100
    };
};

module.exports = { 
    getBuffer, 
    getGroupAdmins, 
    getRandom, 
    h2k, 
    isUrl, 
    Json, 
    runtime, 
    sleep, 
    fetchJson,
    debounce,
    throttle,
    getMemoryUsage
};