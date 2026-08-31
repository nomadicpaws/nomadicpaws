import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function settings() {
  return {
    endpoint: String(process.env.R2_ENDPOINT || '').replace(/\/$/, ''),
    bucket: String(process.env.R2_BUCKET || ''),
    accessKeyId: String(process.env.R2_ACCESS_KEY_ID || ''),
    secretAccessKey: String(process.env.R2_SECRET_ACCESS_KEY || ''),
  }
}

export function r2Configured() {
  return Object.values(settings()).every(Boolean)
}

function client() {
  const config = settings()
  if (!r2Configured()) throw new Error('R2 media storage is not configured.')
  return {
    bucket: config.bucket,
    s3: new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  }
}

export async function signedR2Upload(key, contentType) {
  const { s3, bucket } = client()
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: 15 * 60 })
}

export async function signedR2Download(key) {
  const { s3, bucket } = client()
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 15 * 60 })
}

export async function inspectR2Object(key) {
  const { s3, bucket } = client()
  return s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
}
