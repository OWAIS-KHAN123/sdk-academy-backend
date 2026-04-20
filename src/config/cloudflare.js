const { S3Client, PutObjectCommand, PutBucketCorsCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Cloudflare R2 is S3-compatible — we use the AWS SDK v3 pointed at R2's endpoint
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

const VIDEO_BUCKET = process.env.CLOUDFLARE_R2_BUCKET;       // sdk-academy-videos
const IMAGE_BUCKET = process.env.CLOUDFLARE_R2_IMAGE_BUCKET; // sdk-academy-images
const CDN_URL      = process.env.CLOUDFLARE_CDN_URL;         // pub-xxx.r2.dev (videos)
const IMAGE_CDN    = process.env.CLOUDFLARE_IMAGE_CDN_URL;   // pub-xxx.r2.dev (images)

/**
 * Upload a file buffer to Cloudflare R2.
 * @param {Object} file  - Multer file object (has .buffer, .mimetype, .originalname)
 * @param {string} folder - e.g. 'thumbnails', 'course-videos', 'payment-screenshots'
 * @param {'video'|'image'} type - which bucket to use
 * @returns {{ url: string, key: string }}
 */
const uploadToR2 = async (file, folder, type = 'image') => {
  const ext = path.extname(file.originalname) || '';
  const key = `${folder}/${uuidv4()}${ext}`;
  const bucket = type === 'video' ? VIDEO_BUCKET : IMAGE_BUCKET;
  const cdnBase = type === 'video' ? CDN_URL : IMAGE_CDN;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await r2Client.send(command);

  const url = `${cdnBase}/${key}`;
  return { url, key };
};

/**
 * Generate a time-limited signed URL for secure video access.
 * @param {string} key        - R2 object key
 * @param {number} expiresIn  - seconds until expiry (default 24h)
 * @param {'video'|'image'} type
 * @returns {string} signed URL
 */
const generateSignedUrl = async (key, expiresIn, type = 'video') => {
  const expiry = expiresIn || parseInt(process.env.CLOUDFLARE_SIGNED_URL_EXPIRY) || 86400;
  const bucket = type === 'video' ? VIDEO_BUCKET : IMAGE_BUCKET;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: expiry });
  return signedUrl;
};

/**
 * Delete an object from Cloudflare R2.
 * @param {string} key
 * @param {'video'|'image'} type
 */
const deleteFromR2 = async (key, type = 'video') => {
  const bucket = type === 'video' ? VIDEO_BUCKET : IMAGE_BUCKET;

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await r2Client.send(command);
};

/**
 * Get storage statistics for a bucket.
 * @param {'video'|'image'} type
 * @returns {{ totalObjects: number, totalSize: number }}
 */
const getStorageStats = async (type = 'video') => {
  const bucket = type === 'video' ? VIDEO_BUCKET : IMAGE_BUCKET;
  let totalObjects = 0;
  let totalSize = 0;
  let continuationToken = undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    });

    const response = await r2Client.send(command);
    totalObjects += response.KeyCount || 0;
    (response.Contents || []).forEach((obj) => {
      totalSize += obj.Size || 0;
    });

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return { totalObjects, totalSize };
};

/**
 * Get metadata about a specific object (size, content-type, etc.)
 * @param {string} key
 * @param {'video'|'image'} type
 */
const getObjectMetadata = async (key, type = 'video') => {
  const bucket = type === 'video' ? VIDEO_BUCKET : IMAGE_BUCKET;

  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await r2Client.send(command);
  return {
    size: response.ContentLength,
    contentType: response.ContentType,
    lastModified: response.LastModified,
  };
};

// Ensure R2 bucket allows browser PUT uploads (CORS).
// Called once per process; idempotent so safe to repeat on serverless cold-starts.
let _r2CorsReady = false;
const ensureR2Cors = async () => {
  if (_r2CorsReady) return;
  try {
    await r2Client.send(new PutBucketCorsCommand({
      Bucket: VIDEO_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'PUT', 'DELETE', 'HEAD'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    }));
    _r2CorsReady = true;
  } catch (err) {
    // Non-fatal — log but don't block the upload attempt
    console.warn('[R2] CORS setup warning:', err.message);
  }
};

/**
 * Generate a presigned PUT URL so the mobile app can upload directly to R2,
 * bypassing Vercel's 4.5 MB body limit entirely.
 * @param {string} folder      - e.g. 'course-videos/courseId'
 * @param {string} filename    - original filename (for extension)
 * @param {string} contentType - MIME type of the video
 * @param {number} expiresIn   - seconds until the URL expires (default 1 hour)
 * @returns {{ presignedUrl: string, key: string }}
 */
const generatePresignedUploadUrl = async (folder, filename, contentType = 'video/mp4', expiresIn = 3600) => {
  // Configure CORS on the bucket so browsers can PUT directly without being blocked
  await ensureR2Cors();

  const ext = path.extname(filename) || '.mp4';
  const key = `${folder}/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: VIDEO_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return { presignedUrl, key };
};

module.exports = {
  r2Client,
  uploadToR2,
  generateSignedUrl,
  generatePresignedUploadUrl,
  ensureR2Cors,
  deleteFromR2,
  getStorageStats,
  getObjectMetadata,
  VIDEO_BUCKET,
  IMAGE_BUCKET,
  CDN_URL,
  IMAGE_CDN,
};
