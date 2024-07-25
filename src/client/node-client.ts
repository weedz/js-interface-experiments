import { createWriteStream } from "node:fs";
import { Stream } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";

const response = await fetch("http://localhost:8080/data.json");

console.log("ok:", response.ok);
const totalSize = Number.parseInt(response.headers.get("content-length")!, 10) || 0;
console.log("Size:", totalSize);

if (response.body) {
    const writableFile = createWriteStream("./downloaded-data.json");

    console.log("Memory usage: %d KiB", process.memoryUsage.rss() / 1024);

    // NOTE: Due to typescript using "DOM" lib we need to cast `response.body` to a "node web stream"
    const readableStream = Stream.Readable.fromWeb(response.body as unknown as ReadableStream);

    let reportTime = 0;
    let bytesRead = 0;
    let transferRate = 0;
    readableStream.addListener("data", (data: Buffer) => {
        bytesRead += data.byteLength;
        transferRate += data.byteLength;
        if (performance.now() - reportTime >= 1000) {
            console.log("Progress %d/%d KiB (%d MiB/s)", (bytesRead / 1024).toFixed(2), (totalSize / 1024).toFixed(2), (transferRate / 1024 / 1024).toFixed(3));
            reportTime = performance.now();
            transferRate = 0;
        }
    });

    await pipeline(
        readableStream,
        writableFile,
    );
    console.log("Memory usage: %d KiB", process.memoryUsage.rss() / 1024);
}
