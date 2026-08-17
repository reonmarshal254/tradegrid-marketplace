'use strict';
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const env = require('../config/env');

const b2 = new S3Client({
  endpoint: `https://${env.b2.endpoint}`,
  region: 'us-west-004',
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
  }));

  return { url: `b2://${env.b2.bucketName}/${key}`, key };
}

async function getApkDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: env.b2.bucketId,
    Key: key,
  });
  return getSignedUrl(b2, command, { expiresIn });
}

module.exports = { uploadApkToB2, getApkDownloadUrl };
