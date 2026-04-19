const encoder = new TextEncoder();

export type R2ObjectUpload = {
  key: string;
  contentType: string;
  body: Uint8Array;
};

function hex(bytes: Uint8Array) {
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += bytes[i].toString(16).padStart(2, "0");
  }
  return result;
}

function encodeUriPathSegment(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

async function sha256(data: ArrayBuffer | Uint8Array | string) {
  const bytes =
    typeof data === "string"
      ? encoder.encode(data)
      : data instanceof Uint8Array
        ? data
        : new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

async function hmac(key: Uint8Array, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return new Uint8Array(signature);
}

async function deriveSigningKey(secretAccessKey: string, dateStamp: string) {
  const kDate = await hmac(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmac(kDate, "auto");
  const kService = await hmac(kRegion, "s3");
  return hmac(kService, "aws4_request");
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { accountId, bucketName, accessKeyId, secretAccessKey };
}

function buildAuthorizationHeader(params: {
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  accountId: string;
  key: string;
  method: "GET" | "PUT";
  contentType?: string;
  bodyHash: string;
  amzDate: string;
  dateStamp: string;
}) {
  const host = `${params.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeUriPathSegment(params.bucketName)}/${encodeUriPathSegment(params.key)}`;
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${params.bodyHash}`,
    `x-amz-date:${params.amzDate}`,
  ];

  if (params.contentType) {
    canonicalHeaders.splice(1, 0, `content-type:${params.contentType}`);
  }

  const signedHeaders = params.contentType
    ? "content-type;host;x-amz-content-sha256;x-amz-date"
    : "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    params.method,
    canonicalUri,
    "",
    canonicalHeaders.join("\n") + "\n",
    signedHeaders,
    params.bodyHash,
  ].join("\n");

  return { canonicalRequest, signedHeaders, host, canonicalUri };
}

async function signRequest(params: {
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  accountId: string;
  key: string;
  method: "GET" | "PUT";
  contentType?: string;
  bodyHash: string;
  amzDate: string;
  dateStamp: string;
}) {
  const { canonicalRequest, signedHeaders, host, canonicalUri } = buildAuthorizationHeader(params);
  const canonicalRequestHash = hex(await sha256(canonicalRequest));
  const scope = `${params.dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    params.amzDate,
    scope,
    canonicalRequestHash,
  ].join("\n");

  const signingKey = await deriveSigningKey(params.secretAccessKey, params.dateStamp);
  const signature = hex(await hmac(signingKey, stringToSign));

  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${params.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    host,
    canonicalUri,
  };
}

function formatAmzDate(now = new Date()) {
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const amzDate = now
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, "");
  return { dateStamp, amzDate };
}

export async function uploadR2Object(upload: R2ObjectUpload) {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 storage is not configured");
  }

  const { dateStamp, amzDate } = formatAmzDate();
  const bodyHash = hex(await sha256(upload.body));
  const signed = await signRequest({
    ...config,
    method: "PUT",
    key: upload.key,
    contentType: upload.contentType,
    bodyHash,
    amzDate,
    dateStamp,
  });

  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${encodeUriPathSegment(config.bucketName)}/${encodeUriPathSegment(upload.key)}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: signed.authorization,
      Host: signed.host,
      "Content-Type": upload.contentType,
      "x-amz-content-sha256": bodyHash,
      "x-amz-date": amzDate,
    },
    body: upload.body,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed (${response.status})`);
  }

  return { key: upload.key };
}

export async function downloadR2Object(key: string) {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 storage is not configured");
  }

  const { dateStamp, amzDate } = formatAmzDate();
  const bodyHash = hex(await sha256(new Uint8Array()));
  const signed = await signRequest({
    ...config,
    method: "GET",
    key,
    bodyHash,
    amzDate,
    dateStamp,
  });

  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${encodeUriPathSegment(config.bucketName)}/${encodeUriPathSegment(key)}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: signed.authorization,
      Host: signed.host,
      "x-amz-content-sha256": bodyHash,
      "x-amz-date": amzDate,
    },
  });

  if (!response.ok) {
    throw new Error(`R2 download failed (${response.status})`);
  }

  return response;
}

export function randomObjectKey(extension = ".jpg") {
  const normalizedExt = extension.startsWith(".") ? extension : `.${extension}`;
  return `upload-${Date.now()}-${crypto.randomUUID().replace(/-/g, "")}${normalizedExt}`;
}
