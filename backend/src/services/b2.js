'use strict';
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../config/env');

const b2 = new S3Client({
  endpoint: `https://${env.b2.endpoint}`,
  region: 'us-east-005',
  credentials: {
    accessKeyId: env.b2.keyId,
    secretAccessKey: env.b2.appKey,
  },
  forcePathStyle: true,
});

async function uploadApkToB2(buffer, fileName) {
  const key = `tradegrid/apk/${fileName}`;

  await b2.send(new PutObjectCommand({
    Bucket: env.b2.bucketId,
    Key: key,
    Body: buffer,
    ContentType: 'application/vnd.android.package-archive',
    ACL: 'public-read',
  }));

  // Public URL format for B2 S3-compatible endpoint
  const publicUrl = `https://${env.b2.bucketId}.${env.b2.endpoint}/${key}`;
  return { url: publicUrl, key };
}

module.exports = { uploadApkToB2 };
