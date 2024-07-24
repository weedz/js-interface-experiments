import * as fs from "node:fs";
import { setTimeout } from "node:timers/promises";
import { Cmds } from "@weedzcokie/concurrent-cmd";

if (fs.existsSync("./dist")) {
    fs.rmSync("./dist", { recursive: true });
}

const newProcessEnv = { ...process.env, FORCE_COLOR: "true" };
const ccmds = new Cmds(undefined, newProcessEnv);
ccmds.spawnCommand("./node_modules/.bin/tsc", ["--watch", "--preserveWatchOutput"]);

while (!fs.existsSync("./dist")) {
    await setTimeout(100);
}

ccmds.spawnCommand("node", ["--watch", "dist/server/server.js"]);

process.on("SIGINT", async (code) => {
    console.log("Recieved SIGINT signal.");
    await Promise.allSettled(ccmds.killChildren(code));
    process.exit(0);
});

