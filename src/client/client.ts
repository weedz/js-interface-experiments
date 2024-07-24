const socket = new WebSocket("ws://localhost:6969");
socket.binaryType = "arraybuffer";

socket.onopen = event => {
    console.log("Socket open", event);
};

socket.onclose = event => {
    console.log("Socket closed", event);
};

socket.onerror = event => {
    console.error("Socket error:", event);
};

socket.onmessage = event => {
    console.log("Recieved data:", event);
};
