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
    /**
     * Dapatkan Unmasked GPU Chipset murni fisik tanpa wrapper browser
     * Menyamakan output antara Chrome, Edge, Firefox, Brave, & Opera pada PC yang sama.
     */
    getNormalizedGPU() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return { model: 'GENERIC_PC_GPU', raw: 'Standard Display' };

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const rawVendor = debugInfo ? (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '') : '';
            const rawRenderer = debugInfo ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '') : '';

            // Ekstrak nama GPU dan hapus semua noise spesifik browser (PCIe ID, ANGLE, D3D11, dll)
            let cleaned = (rawVendor + ' ' + rawRenderer).toUpperCase()
                .replace(/ANGLE\s*\(/g, '')
                .replace(/\(0X[0-9A-F]+\)/gi, '') // Hapus Device ID hex (0x00002504)
                .replace(/DIRECT3D\d*/gi, '')
                .replace(/OPENGL\s*ENGINE/gi, '')
                .replace(/VS_\d+_\d+/gi, '')
                .replace(/PS_\d+_\d+/gi, '')
                .replace(/\/PCIE\/SSE\d*/gi, '')
                .replace(/D3D\d*/gi, '')
                .replace(/VULKAN/gi, '')
                .replace(/MESA/gi, '')
                .replace(/BASIC RENDER DRIVER/gi, '')
                .replace(/[^A-Z0-9]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            return {
                model: cleaned || 'PC_GRAPHICS_CARD',
                raw: rawRenderer || rawVendor || 'Graphics Card'
            };
        } catch (e) {
            return { model: 'PC_GRAPHICS_CARD', raw: 'Standard GPU' };
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
     * Dapatkan detail lengkap hardware murni fisik PC (Cross-Browser Universal HWID)
     * Parameter yang dipakai: GPU Model + Resolusi Monitor + CPU Cores + Timezone + OS Platform
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
            colorDepth: window.screen.colorDepth || 24
        };

        const systemInfo = {
            cores: navigator.hardwareConcurrency || 4,
            platform: (navigator.platform || 'Win32').replace(/[^a-zA-Z0-9]/g, ''),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
            timezoneOffset: new Date().getTimezoneOffset()
        };

        // Signature murni fisik komputer (Identik di Chrome, Edge, Firefox, Brave pada PC yang sama):
        const signature = [
            'PC_UNIVERSAL_HWID_V3',
            gpu.model,
            `${screenInfo.width}x${screenInfo.height}@${screenInfo.colorDepth}`,
            `${systemInfo.cores}cores`,
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

        const readableName = `${systemInfo.platform} (${screenInfo.width}x${screenInfo.height}, ${systemInfo.cores} Cores, ${gpu.raw.substring(0, 30)})`;

        this.cachedHWID = formattedHWID;
        this.deviceDetails = {
            hwid: formattedHWID,
            rawHash: rawHash,
            gpuModel: gpu.model,
            gpuRaw: gpu.raw,
            resolution: `${screenInfo.width}x${screenInfo.height}`,
            cpuCores: systemInfo.cores,
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
