import { getOptionalRequestContext } from "@cloudflare/next-on-pages";
import { AwsClient } from "aws4fetch";

export type R2ObjectUpload = {
  key: string;
  contentType: string;
  body: Uint8Array;
};

type R2Env = {
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
};

type R2Config = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function encodeUriPathSegment(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function pickFirstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === "string" && value.length > 0);
}

function getR2Env() {
  const requestContext = getOptionalRequestContext();
  return requestContext?.env as R2Env | undefined;
}

function getR2Config(): R2Config | null {
  const env = getR2Env();

  const accountId = pickFirstNonEmpty(env?.R2_ACCOUNT_ID, process.env.R2_ACCOUNT_ID);
  const bucketName = pickFirstNonEmpty(env?.R2_BUCKET_NAME, process.env.R2_BUCKET_NAME);
  const accessKeyId = pickFirstNonEmpty(env?.R2_ACCESS_KEY_ID, process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = pickFirstNonEmpty(
    env?.R2_SECRET_ACCESS_KEY,
    process.env.R2_SECRET_ACCESS_KEY,
  );

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { accountId, bucketName, accessKeyId, secretAccessKey };
}

function createR2AwsClient(config: R2Config) {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function maskKeyId(value: string | undefined) {
  if (!value) return null;
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function getR2ConfigState() {
  const env = getR2Env();
  const config = getR2Config();

  return {
    hasRequestContext: Boolean(env),
    hasCloudflareAccountId: Boolean(env?.R2_ACCOUNT_ID),
    hasCloudflareBucketName: Boolean(env?.R2_BUCKET_NAME),
    hasCloudflareAccessKeyId: Boolean(env?.R2_ACCESS_KEY_ID),
    hasCloudflareSecretAccessKey: Boolean(env?.R2_SECRET_ACCESS_KEY),
    hasProcessAccountId: Boolean(process.env.R2_ACCOUNT_ID),
    hasProcessBucketName: Boolean(process.env.R2_BUCKET_NAME),
    hasProcessAccessKeyId: Boolean(process.env.R2_ACCESS_KEY_ID),
    hasProcessSecretAccessKey: Boolean(process.env.R2_SECRET_ACCESS_KEY),
    resolvedAccountId: config?.accountId ?? null,
    resolvedBucketName: config?.bucketName ?? null,
    resolvedAccessKeyId: maskKeyId(config?.accessKeyId),
  };
}

export async function uploadR2Object(upload: R2ObjectUpload) {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 storage is not configured");
  }
  const aws = createR2AwsClient(config);
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${encodeUriPathSegment(config.bucketName)}/${encodeUriPathSegment(upload.key)}`;
  const response = await aws.fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": upload.contentType,
    },
    body: upload.body,
  });

  if (!response.ok) {
    const responseText = await response.text();
    const state = getR2ConfigState();
    throw new Error(
      `R2 upload failed (${response.status}). Diagnostic: ${JSON.stringify({
        ...state,
        responseText: responseText.slice(0, 500),
      })}`,
    );
  }

  return { key: upload.key };
}

export async function downloadR2Object(key: string) {
  const config = getR2Config();
  if (!config) {
    throw new Error("R2 storage is not configured");
  }
  const aws = createR2AwsClient(config);
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${encodeUriPathSegment(config.bucketName)}/${encodeUriPathSegment(key)}`;
  const response = await aws.fetch(endpoint, {
    method: "GET",
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
