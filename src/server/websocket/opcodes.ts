export const OPCODES = {
    CONTIUATION: 0x0,
    TEXT: 0x1,
    BINARY: 0x2, // 0100 (LSb), 0010 (MSb) LSb/MSb?
    PING: 0x9,   // 1001
    PONG: 0xA,   // 1010, 0101
} as const;
