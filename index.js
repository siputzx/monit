const express = require('express');
const https = require('https');
const net = require('net');

const app = express();
const PORT = process.env.PORT || 3000;
let serverStartTime = Date.now();

const urls = [
    "https://botz3-b6800012c50c.herokuapp.com/",
    "https://botz2-8c1ec52c1c71.herokuapp.com/",
    "https://botz1-779fbd995093.herokuapp.com/"
];

async function checkURL(url, timeout = 5000) {
    const { hostname, port, path } = new URL(url);
    const startTime = Date.now();

    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);

        socket.on('connect', () => {
            const endTime = Date.now();
            resolve({ url, status: 'Alive', ping: endTime - startTime });
            socket.destroy();
        });

        socket.on('error', () => resolve({ url, status: 'Dead', ping: null }));
        socket.on('timeout', () => {
            resolve({ url, status: 'Dead', ping: null });
            socket.destroy();
        });

        socket.connect(port || 443, hostname, () => {
            const request = https.request({ hostname, port: port || 443, path, method: 'GET' }, (res) => {
                const endTime = Date.now();
                resolve({ url, status: res.statusCode === 200 ? 'Alive' : 'Dead', ping: endTime - startTime });
                socket.destroy();
            });

            request.on('error', () => {
                resolve({ url, status: 'Dead', ping: null });
                socket.destroy();
            });

            request.end();
        });
    }).catch(error => {
        console.error(`Error checking URL: ${error.message}`);
        return { url, status: 'Dead', ping: null };
    });
}

async function performRequestsAndPings() {
    const results = await Promise.all(urls.map(url => checkURL(url)));
    results.forEach(result => {
        console.log(`URL: ${result.url}, Status: ${result.status}, Ping: ${result.ping}ms`);
    });
}

setInterval(performRequestsAndPings, 60 * 1000);
performRequestsAndPings();

app.get('/', async (req, res) => {
    try {
        const uptime = Date.now() - serverStartTime;
        res.json({ uptime: uptime });
    } catch (error) {
        console.error(`Error performing requests and pings: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
