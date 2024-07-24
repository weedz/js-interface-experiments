// Websocket spec: <https://www.rfc-editor.org/rfc/rfc6455>
import * as crypto from "node:crypto";
import * as net from "node:net";
import "./http.js";

function acceptWebSocket(socket: net.Socket, data: Buffer) {
    console.log("Switching protocol to websocket...");
    const address = socket.address() as net.SocketAddress;
    const requestString = data.toString("utf8");
    // console.log(`Addr '${address.address}:${address.port}' sent data:`, requestString);

    let websocketKey: string | null = null;

    for (const row of requestString.split("\r\n")) {
        // console.log("Row:", row);

        if (row.slice(0, 17).toLowerCase() === "sec-websocket-key") {
            [, websocketKey] = row.replaceAll(" ", "").split(":");
            console.log("Web socket key:", websocketKey);

            break;
        }
    }

    return websocketKey;
}

function socketHandler(this: net.Socket, data: Buffer) {
    console.log("Recieved data:", data);

    const controlByte = data.readUint8(0);
    console.log("Control byte:", controlByte, controlByte.toString(2));
    const fin = (controlByte >> 7) & 1;
    let opcode = 0;
    opcode |= ((controlByte >> 0) & 1) << 0;
    opcode |= ((controlByte >> 1) & 1) << 1;
    opcode |= ((controlByte >> 2) & 1) << 2;
    opcode |= ((controlByte >> 3) & 1) << 3;
    console.log("opcode:", opcode.toString(16));
    console.log("fin:", fin);
}

const server = net.createServer(socket => {
    const address = socket.address() as net.SocketAddress;
    console.log("Connection from:", address);
    socket.once("data", data => {
        const websocketKey = acceptWebSocket(socket, data)
        if (websocketKey) {
            // <https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#server_handshake_response>
            // Upgrade connection:
            // HTTP/1.1 101 Switching Protocols
            // Upgrade: websocket
            // Connection: Upgrade
            // Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
            const magicWebSocketKey = crypto.createHash("sha1")
                .update(websocketKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
                .digest()
                .toString("base64");
            socket.write("HTTP/1.1 101 Switching Protocols\r\n"
                + "Upgrade: websocket\r\n"
                + "Connection: Upgrade\r\n"
                + `Sec-WebSocket-Accept: ${magicWebSocketKey}\r\n`
                + "\r\n");

            socket.on("data", socketHandler);

            let controlByte = 0;
            // FIN
            controlByte |= (1 << 7);
            // controlByte &= ~(1 << 0);

            // bit 1: RSV1
            // bit 2: RSV2
            // bit 3: RSV3

            // bits 4-7 OPCODE
            controlByte |= (1 << 0);
            controlByte |= (1 << 3);
            // controlByte |= (1 << 4);
            // controlByte |= (1 << 4);


            console.log("Control byte:", controlByte.toString(2));

            const frame = Buffer.alloc(2);
            frame.writeUint8(controlByte, 0);

            // bit 8 MASK
            // controlByte &= ~(1 << 8);
            const maskByte = 0;
            frame.writeUint8(maskByte, 1);

            console.log("Writing:", frame);

            socket.write(frame);

        } else {
            // Invalid websocket handshake
            console.log("Invalid websocket handshade");
            socket.end();
        }
    });
});

server.listen(6969, () => {
    console.log("Server listening on:", server.address());
});

