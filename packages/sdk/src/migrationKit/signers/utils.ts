export const hexArrayStr = (array: ArrayBuffer): string =>
    new Uint8Array(array).reduce(
        (acc, v) => acc + v.toString(16).padStart(2, "0"),
        "0x"
    );

export const parseHex = (str: string): Uint8Array => {
    const matches = str.match(/[\da-f]{2}/gi);
    if (matches === null) {
        return new Uint8Array();
    }
    return new Uint8Array(matches.map((h: string) => parseInt(h, 16)));
};

export const derToRS = (der: Uint8Array): Uint8Array[] => {
    let offset = 3;
    let dataOffset: number;

    if (der[offset] === 0x21) {
        dataOffset = offset + 2;
    } else {
        dataOffset = offset + 1;
    }
    const r = der.slice(dataOffset, dataOffset + 32);
    offset = offset + der[offset] + 1 + 1;
    if (der[offset] === 0x21) {
        dataOffset = offset + 2;
    } else {
        dataOffset = offset + 1;
    }

    const s = der.slice(dataOffset, dataOffset + 32);
    return [r, s];
};

export const findSequence = (arr: Uint8Array, seq: Uint8Array): number => {
    for (let i = 0; i < arr.length; ++i) {
        for (let j = 0; j < seq.length; j++) {
            if (arr[i + j] !== seq[j]) {
                break;
            }
            if (j === seq.length - 1) {
                return i;
            }
        }
    }
    return -1;
};

export const getChallengeOffset = (
    clientData: ArrayBuffer,
    challengePrefix: string
): bigint => {
    return BigInt(
        findSequence(new Uint8Array(clientData), parseHex(challengePrefix)) +
            12 +
            1
    );
};

export const decodeUTF8 = (b: ArrayBuffer): string => {
    return new TextDecoder().decode(b);
};

export const encodeUTF8 = (s: string): ArrayBuffer => {
    return new TextEncoder().encode(s);
};

// biome-ignore lint/suspicious/noExplicitAny: TODO
export const bufferToArrayBuffer = (bufferObject: any): ArrayBuffer => {
    const buffer = Buffer.from(bufferObject.data);
    return Uint8Array.from(buffer).buffer;
};

export const bufferToHex = (s: ArrayBuffer): string => {
    return Buffer.from(s).toString("hex");
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export const base64toUint8Array = (base64: string): Uint8Array => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
};

export const decodeSafeTxGas = (encodedSafeTxGas: string): string => {
    return Number(`0x${encodedSafeTxGas.slice(184).slice(0, 10)}`).toString();
};
