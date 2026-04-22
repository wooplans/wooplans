const edgeFetch = (...args) => globalThis.fetch(...args);

export default edgeFetch;
export const fetch = edgeFetch;
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
