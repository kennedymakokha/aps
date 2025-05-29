import express from 'express';
import ip from 'ip';
import ping from 'ping';
import dns from 'dns/promises';
import pLimit from 'p-limit';
import cors from 'cors'; // <-- Import cors
const app = express();

const limit = pLimit(50); // Limit concurrent pings
app.use(cors());
async function getHostname(ip) {
    try {
        const [hostname] = await dns.reverse(ip);
        return hostname;
    } catch {
        return null;
    }
}

export async function scanNetwork() {
    const localIp = ip.address();
    const baseIp = localIp.substring(0, localIp.lastIndexOf('.') + 1);

    const tasks = Array.from({ length: 254 }, (_, i) => i + 1).map(i => {
        const targetIp = `${baseIp}${i}`;
        return limit(async () => {
            const res = await ping.promise.probe(targetIp, { timeout: 1 });
            if (res.alive) {
                const hostname = await getHostname(res.host);
                console.log(hostname ? `Found device: ${hostname} (${res.host})` : `Found device: ${res.host}`);
                return {
                    ip: res.host,
                    alive: true,
                    hostname: hostname || 'Unknown'
                };
            }
        });
    });

    const results = await Promise.all(tasks);
    return results.filter(Boolean);
}


