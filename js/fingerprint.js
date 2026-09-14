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
    /**
     * Dapatkan Unmasked GPU Chipset murni fisik
     */
    getNormalizedGPU() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return { vendor: 'GenericGPU', renderer: 'GenericRenderer' };

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return { vendor: 'GenericGPU', renderer: 'GenericRenderer' };

            const rawVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
            let rawRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';

            // Bersihkan wrapper browser seperti "ANGLE (...)" agar identik di Chrome, Edge, Firefox, Brave
            // Contoh: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs OpenGL)" -> "NVIDIA GeForce RTX 3060"
            let cleanRenderer = rawRenderer;
            const match = rawRenderer.match(/ANGLE\s*\(([^,]+),\s*([^,]+?)(?:Direct3D|OpenGL|Vulkan|vs_|\))/i);
            if (match && match[2]) {
                cleanRenderer = match[2].trim();
            }

            return {
                vendor: rawVendor.replace(/\s+/g, ' ').trim(),
                renderer: cleanRenderer.replace(/\s+/g, ' ').trim(),
                rawRenderer: rawRenderer
            };
        } catch (e) {
            return { vendor: 'UnknownVendor', renderer: 'UnknownRenderer', rawRenderer: '' };
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
     * Dapatkan detail lengkap hardware murni PC (Cross-Browser Physical PC ID)
     * Tidak menggunakan random UUID localStorage agar konsisten di semua browser pada PC yang sama.
     */
    async getHardwareInfo() {
        if (this.cachedHWID && this.deviceDetails) {
            return {
                hwid: this.cachedHWID,
                details: this.deviceDetails
            };
        }

        const gpu = this.getNormalizedGPU();

        const screenInfo = {
            width: window.screen.width || 0,
            height: window.screen.height || 0,
            colorDepth: window.screen.colorDepth || 24,
            pixelRatio: Math.round((window.devicePixelRatio || 1) * 100) / 100
        };

        const systemInfo = {
            cores: navigator.hardwareConcurrency || 4,
            memory: navigator.deviceMemory || 8,
            platform: (navigator.userAgentData?.platform || navigator.platform || 'Win32').replace(/[^a-zA-Z0-9]/g, ''),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            timezoneOffset: new Date().getTimezoneOffset()
        };

        // Signature murni spesifikasi fisik perangkat PC:
        // GPU Chipset + Resolusi Layar + Kedalaman Warna + Jumlah CPU Core + RAM + OS Platform + Timezone
        const signature = [
            'PC_HARDWARE_V2',
            gpu.vendor,
            gpu.renderer,
            `${screenInfo.width}x${screenInfo.height}@${screenInfo.colorDepth}`,
            `${systemInfo.cores}cores`,
            `${systemInfo.memory}gb`,
            systemInfo.platform,
            systemInfo.timezone,
            `${systemInfo.timezoneOffset}min`
        ].join('###');

        const rawHash = await this.sha256(signature);
        
        // Format HWID yang rapi & konsisten: NX-XXXX-XXXX-XXXX-XXXX
        const formattedHWID = 'NX-' + [
            rawHash.substring(0, 4),
            rawHash.substring(4, 8),
            rawHash.substring(8, 12),
            rawHash.substring(12, 16)
        ].join('-').toUpperCase();

        const readableName = `${systemInfo.platform} (${screenInfo.width}x${screenInfo.height}, ${systemInfo.cores} CPU Cores, ${gpu.renderer})`;

        this.cachedHWID = formattedHWID;
        this.deviceDetails = {
            hwid: formattedHWID,
            rawHash: rawHash,
            gpuRenderer: gpu.renderer,
            gpuVendor: gpu.vendor,
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
