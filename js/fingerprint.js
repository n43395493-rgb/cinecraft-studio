/**
 * Hardware & Device Fingerprint Generator
 * Mengkombinasikan parameter hardware PC/Browser untuk membuat Hardware ID (HWID) unik.
 * Komponen: Canvas 2D, WebGL GPU Renderer, Screen Specs, CPU Cores, Audio Context, Timezone, Device UUID.
 */

class DeviceFingerprint {
    constructor() {
        this.cachedHWID = null;
        this.deviceDetails = null;
    }

    /**
     * Dapatkan UUID unik yang tersimpan persisten di LocalStorage untuk memperkuat integritas device
     */
    getPersistentUUID() {
        const STORAGE_KEY = 'nexus_device_guid';
        let uuid = localStorage.getItem(STORAGE_KEY);
        if (!uuid) {
            uuid = 'DEV-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16).toUpperCase();
            });
            localStorage.setItem(STORAGE_KEY, uuid);
        }
        return uuid;
    }

    /**
     * Canvas Fingerprint Hash
     */
    getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 280;
            canvas.height = 60;
            const ctx = canvas.getContext('2d');
            if (!ctx) return 'canvas_unsupported';

            // Text with different fonts and styling
            ctx.textBaseline = 'top';
            ctx.font = "14px 'Arial', sans-serif";
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);

            ctx.fillStyle = '#069';
            ctx.fillText('NexusHWID,🔒#@1.0', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('NexusHWID,🔒#@1.0', 4, 17);

            // Canvas blending & arcs
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgb(255,0,255)';
            ctx.beginPath();
            ctx.arc(50, 30, 20, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();

            return canvas.toDataURL();
        } catch (e) {
            return 'canvas_error_' + e.message;
        }
    }

    /**
     * WebGL GPU & Renderer Fingerprint
     */
    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return { vendor: 'no_webgl', renderer: 'no_webgl' };

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return { vendor: 'generic', renderer: 'generic' };

            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown_vendor';
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown_renderer';
            return { vendor, renderer };
        } catch (e) {
            return { vendor: 'error', renderer: 'error' };
        }
    }

    /**
     * AudioContext Fingerprint
     */
    async getAudioFingerprint() {
        try {
            const AudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            if (!AudioContext) return 'no_audio_ctx';

            const context = new AudioContext(1, 44100, 44100);
            const oscillator = context.createOscillator();
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(10000, context.currentTime);

            const compressor = context.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-50, context.currentTime);
            compressor.knee.setValueAtTime(40, context.currentTime);
            compressor.ratio.setValueAtTime(12, context.currentTime);
            compressor.reduction.setValueAtTime(-20, context.currentTime);
            compressor.attack.setValueAtTime(0, context.currentTime);
            compressor.release.setValueAtTime(0.25, context.currentTime);

            oscillator.connect(compressor);
            compressor.connect(context.destination);
            oscillator.start(0);

            const renderedBuffer = await context.startRendering();
            const output = renderedBuffer.getChannelData(0);
            let sum = 0;
            for (let i = 4500; i < 5000; i++) {
                sum += Math.abs(output[i] || 0);
            }
            return sum.toString();
        } catch (e) {
            return 'audio_fallback_val';
        }
    }

    /**
     * Generate SHA-256 Hash string
     */
    async sha256(message) {
        try {
            if (window.crypto && window.crypto.subtle) {
                const msgBuffer = new TextEncoder().encode(message);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) {
            console.warn('SubtleCrypto unavailable, using fallback hash');
        }
        // Fallback simple hash
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'HW-' + Math.abs(hash).toString(16).padStart(12, '0') + '-' + Date.now().toString(16).slice(-4);
    }

    /**
     * Dapatkan detail lengkap hardware dan Hardware ID ter-hash
     */
    async getHardwareInfo() {
        if (this.cachedHWID && this.deviceDetails) {
            return {
                hwid: this.cachedHWID,
                details: this.deviceDetails
            };
        }

        const persistentUUID = this.getPersistentUUID();
        const canvasData = this.getCanvasFingerprint();
        const webgl = this.getWebGLFingerprint();
        const audioHash = await this.getAudioFingerprint();

        const screenInfo = {
            width: window.screen.width || 0,
            height: window.screen.height || 0,
            availWidth: window.screen.availWidth || 0,
            availHeight: window.screen.availHeight || 0,
            colorDepth: window.screen.colorDepth || 0,
            pixelRatio: window.devicePixelRatio || 1
        };

        const systemInfo = {
            cores: navigator.hardwareConcurrency || 4,
            memory: navigator.deviceMemory || 8,
            platform: navigator.platform || 'Unknown',
            language: navigator.language || 'en-US',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0
        };

        // Combine into signature string
        const signature = [
            persistentUUID,
            webgl.vendor,
            webgl.renderer,
            screenInfo.width + 'x' + screenInfo.height + '@' + screenInfo.colorDepth,
            systemInfo.cores + 'cores',
            systemInfo.platform,
            systemInfo.timezone,
            audioHash,
            canvasData.substring(0, 100)
        ].join('|||');

        const rawHash = await this.sha256(signature);
        
        // Format HWID yang rapi: NX-XXXX-XXXX-XXXX-XXXX
        const formattedHWID = 'NX-' + [
            rawHash.substring(0, 4),
            rawHash.substring(4, 8),
            rawHash.substring(8, 12),
            rawHash.substring(12, 16)
        ].join('-').toUpperCase();

        const readableName = `${systemInfo.platform} (${screenInfo.width}x${screenInfo.height}, ${systemInfo.cores} Cores, ${webgl.renderer.substring(0, 25)})`;

        this.cachedHWID = formattedHWID;
        this.deviceDetails = {
            hwid: formattedHWID,
            rawHash: rawHash,
            uuid: persistentUUID,
            gpuRenderer: webgl.renderer,
            gpuVendor: webgl.vendor,
            resolution: `${screenInfo.width}x${screenInfo.height}`,
            cpuCores: systemInfo.cores,
            ramGb: systemInfo.memory,
            platform: systemInfo.platform,
            timezone: systemInfo.timezone,
            deviceSummary: readableName
        };

        return {
            hwid: this.cachedHWID,
            details: this.deviceDetails
        };
    }
}

// Global instance
window.deviceFingerprint = new DeviceFingerprint();
