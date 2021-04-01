const AWS = require('aws-sdk');
const S3blobs = require('s3-blob-store');
const { Magic, MAGIC_MIME_TYPE } = require('mmmagic');
const config = require('../common/config');

const DOspaces = new AWS.S3({
  endpoint: new AWS.Endpoint(config.DO_ENDPOINT),
  accessKeyId: config.DO_ACCESS_KEY,
  secretAccessKey: config.DO_ACCESS_KEY_SECRET,
});

const blobStore = S3blobs({
  client: DOspaces,
  bucket: config.DO_BUCKET,
});

const magic = new Magic(MAGIC_MIME_TYPE);

const mimeMagic = (data) => new Promise((resolve, reject) => {
  magic.detect(data, (error, result) => {
    if (error) { reject(error); } else { resolve(result); }
  });
});

const storeExists = (key) => new Promise((resolve, reject) => {
  blobStore.exists(key, (error, exists) => {
    if (error) {
      reject(error);
    } else {
      resolve(exists);
    }
  });
});

const storeWrite = (opts, data) => new Promise((resolve, reject) => {
  const stream = blobStore.createWriteStream(opts, (error, metadata) => {
    if (error) { reject(error); } else { resolve(metadata); }
  });
  stream.write(data);
  stream.end();
});

module.exports = {
  blobStore,
  DOspaces,
  mimeMagic,
  storeWrite,
  storeExists,
};
