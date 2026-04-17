declare module 'next-pwa' {
    import type { NextConfig } from 'next';

    interface PWAConfig {
        dest?: string;
        register?: boolean;
        skipWaiting?: boolean;
        disable?: boolean;
        [key: string]: unknown;
    }

    function withPWA(pwaConfig: PWAConfig): (nextConfig: NextConfig) => NextConfig;
    export default withPWA;
}
