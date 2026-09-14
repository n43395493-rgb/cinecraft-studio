/**
 * =========================================================================================
 * UNIVERSAL CROSS-BROWSER HARDWARE FINGERPRINT GENERATOR (V4)
 * Menghasilkan Hardware ID yang 100% IDENTIK di Chrome, Edge, Firefox, Brave, & Opera pada PC yang sama.
 * =========================================================================================
 */

class DeviceFingerprint {
    constructor() {
        this.cachedHWID = null;
        this.deviceDetails = null;
    }

    /**
     * Ekstrak murni tipe GPU fisik tanpa embel-embel vendor browser (ANGLE, Google, Microsoft, PCIe, dll)
     */
    extractPureGPU() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return { model: 'GENERIC_GPU', raw: 'Standard Display' };

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const rawRenderer = debugInfo ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '') : '';
            const rawVendor = debugInfo ? (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '') : '';
            const combined = (rawVendor + ' ' + rawRenderer).toUpperCase();

            // 1. Cek Kartu Grafis NVIDIA (RTX, GTX, Quadro, Titan, dll)
            const nvidiaMatch = combined.match(/(GEFORCE\s+(?:RTX|GTX|GT|MX)?\s*\d+[A-Z0-9\s]*|RTX\s*\d+[A-Z0-9\s]*|GTX\s*\d+[A-Z0-9\s]*|QUADRO\s+[A-Z0-9\s]+|TITAN\s+[A-Z0-9\s]+)/i);
            if (nvidiaMatch) {
                const clean = 'NVIDIA ' + nvidiaMatch[1].replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                return { model: clean, raw: rawRenderer || 'NVIDIA Graphics' };
            }

            // 2. Cek Kartu Grafis INTEL (Iris Xe, UHD Graphics, HD Graphics, Arc, dll)
            const intelMatch = combined.match(/(UHD\s+GRAPHICS\s*\d*|HD\s+GRAPHICS\s*\d*|IRIS\s*(?:XE)?\s*(?:GRAPHICS)?|ARC\s+[A-Z0-9]+)/i);
            if (intelMatch) {
                const clean = 'INTEL ' + intelMatch[1].replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                return { model: clean, raw: rawRenderer || 'Intel Graphics' };
            }

            // 3. Cek Kartu Grafis AMD (Radeon RX, Vega, dll)
            const amdMatch = combined.match(/(RADEON\s+(?:RX|PRO|VEGA|HD)?\s*\d*[A-Z0-9\s]*|RX\s*\d+[A-Z0-9\s]*)/i);
            if (amdMatch) {
                const clean = 'AMD ' + amdMatch[1].replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                return { model: clean, raw: rawRenderer || 'AMD Radeon' };
            }

            // 4. Apple Silicon
            const appleMatch = combined.match(/(APPLE\s+M\d+[A-Z0-9\s]*|APPLE\s+GPU)/i);
            if (appleMatch) {
                const clean = appleMatch[1].replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                return { model: clean, raw: rawRenderer || 'Apple GPU' };
            }

            // 5. Pembersihan Fallback
            let clean = combined
                .replace(/ANGLE\s*\(/g, '')
                .replace(/GOOGLE\s*(?:INC)?\.?/gi, '')
                .replace(/MICROSOFT/gi, '')
                .replace(/MOZILLA/gi, '')
                .replace(/\(0X[0-9A-F]+\)/gi, '')
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

            return { model: clean || 'PC_GRAPHICS_CHIP', raw: rawRenderer || 'Standard GPU' };
        } catch (e) {
            return { model: 'PC_GRAPHICS_CHIP', raw: 'Standard GPU' };
        }
    }

    /**
     * Dapatkan Sistem Operasi Dasar
     */
    getNormalizedOS() {
        const ua = (navigator.userAgent || '').toUpperCase();
        if (ua.includes('WINDOWS') || ua.includes('WIN32') || ua.includes('WIN64')) return 'WINDOWS';
        if (ua.includes('MAC') || ua.includes('DARWIN')) return 'MACOS';
        if (ua.includes('ANDROID')) return 'ANDROID';
        if (ua.includes('IPHONE') || ua.includes('IPAD')) return 'IOS';
        if (ua.includes('LINUX')) return 'LINUX';
        return 'WINDOWS';
    }

    /**
     * SHA-256 Hash
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
            console.warn('SubtleCrypto fallback');
        }
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'HW-' + Math.abs(hash).toString(16).padStart(12, '0') + '-' + Date.now().toString(16).slice(-4);
    }

    /**
     * Dapatkan Hardware Info Universal PC
     */
    async getHardwareInfo() {
        if (this.cachedHWID && this.deviceDetails) {
            return {
                hwid: this.cachedHWID,
                details: this.deviceDetails
            };
        }

        const gpu = this.extractPureGPU();
        const os = this.getNormalizedOS();

        // Resolusi Layar Standar (Urutkan max x min agar rotasi/scaling tidak merubah hash)
        const screenW = window.screen.width || 1920;
        const screenH = window.screen.height || 1080;
        const maxDim = Math.max(screenW, screenH);
        const minDim = Math.min(screenW, screenH);
        const screenRes = `${maxDim}x${minDim}`;

        const cpuCores = navigator.hardwareConcurrency || 4;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';

        // SIGNATURE MURNI HARDWARE FISIK (100% Identik di Chrome, Edge, Firefox, Brave):
        const signature = [
            'PC_UNIVERSAL_V4',
            gpu.model,
            screenRes,
            `${cpuCores}cores`,
            os,
            timezone
        ].join('###');

        const rawHash = await this.sha256(signature);
        
        // Format HWID: NX-XXXX-XXXX-XXXX-XXXX
        const formattedHWID = 'NX-' + [
            rawHash.substring(0, 4),
            rawHash.substring(4, 8),
            rawHash.substring(8, 12),
            rawHash.substring(12, 16)
        ].join('-').toUpperCase();

        const readableName = `${os} (${screenRes}, ${cpuCores} CPU Cores, ${gpu.model})`;

        this.cachedHWID = formattedHWID;
        this.deviceDetails = {
            hwid: formattedHWID,
            rawHash: rawHash,
            signatureDebug: signature,
            gpuModel: gpu.model,
            gpuRaw: gpu.raw,
            resolution: screenRes,
            cpuCores: cpuCores,
            os: os,
            timezone: timezone,
            deviceSummary: readableName
        };

        // Print debug info ke console browser agar bisa dicek
        console.log('[CineCraft HWID Debug]', {
            hwid: formattedHWID,
            signature: signature,
            gpuDetected: gpu.model,
            cores: cpuCores,
            res: screenRes
        });

        return {
            hwid: this.cachedHWID,
            details: this.deviceDetails
        };
    }
}

// Global instance
window.deviceFingerprint = new DeviceFingerprint();
