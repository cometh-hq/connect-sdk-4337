export const getRandomValues = (arr: Uint8Array): Uint8Array => {
    return window.crypto.getRandomValues(arr);
};
