import * as http from "node:http";
import { createReadStream, readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import { pipeline } from "node:stream/promises";

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const staticFiles: {
    [file: string]: {
        content: Buffer | (() => Promise<Buffer>);
        headers: Record<string, string>;
    }
} = {
    "index.html": {
        content: readFileSync("./public/index.html"),
        headers: { "content-type": "text/html" },
    },
    // "style.css": {
    //     content: readFileSync("./public/style.css"),
    //     headers: { "content-type": "text/css" },
    // },
    "client.js": {
        content: readFileSync("./dist/client/client.js"),
        headers: { "content-type": "application/javascript" },
    },
    "test-download.html": {
        content: async () => readFileSync("./public/test-download.html"),
        headers: { "content-type": "text/html" },
    },
} as const;
async function sendStaticFile(reply: http.ServerResponse, fileName: keyof typeof staticFiles) {
    reply.writeHead(200, undefined, staticFiles[fileName].headers);
    if (typeof staticFiles[fileName].content === "function") {
        reply.write(await staticFiles[fileName].content());
    } else {
        reply.write(staticFiles[fileName].content);
    }
    return reply.end();
}

async function httpHandler(req: http.IncomingMessage, reply: http.ServerResponse) {
    if (!req.url) {
        reply.statusCode = 404;
        return reply.end();
    }

    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/" || url.pathname === "/index.html") {
        return sendStaticFile(reply, "index.html");
    }
    else if (url.pathname === "/client.js") {
        return sendStaticFile(reply, "client.js");
    }
    else if (url.pathname === "/test-download") {
        return sendStaticFile(reply, "test-download.html");
    }
    else if (url.pathname === "/data.json") {
        const fileName = "./public/large-file.json";

        // const transferRate = 512000;
        const transferRate = 3986463;
        const chunkSize = Math.floor(transferRate / 10);
        const reader = createReadStream(fileName, {
            highWaterMark: chunkSize,
        });
        const fileStat = await fs.stat(fileName);
        console.log("Sending data");
        reply.writeHead(200, undefined, { "content-length": fileStat.size });
        await pipeline(
            reader,
            async function* (data) {
                let chunk: Buffer;
                for await (chunk of data) {
                    await timeout(100);
                    yield chunk;
                }
            },
            reply
        ).catch(err => {
            console.log("[ERROR]:", err);
        });
        return reply.end();
    }
    // else if (url.pathname === "/style.css") {
    //     return sendStaticFile(reply, "style.css");
    // }
    else {
        reply.statusCode = 404;
        return reply.end();
    }
}

const httpServer = http.createServer(async (req, reply) => {
    httpHandler(req, reply).catch(err => {
        console.log("Error:", err);
        reply.statusCode = 500;
        return reply.end();
    });
});

httpServer.listen(8080, "localhost", () => {
    console.log(`HTTP server listening on localhost:8080`);
});
