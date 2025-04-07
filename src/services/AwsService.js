// services/awsService.js
const AWS = require('aws-sdk');

class AwsService {
  constructor() {
    this.ses = null;
    this.s3 = null;
  }

  getSES() {
    if (!this.ses) {
      this.ses = new AWS.SES({ region: 'eu-central-1' });
    }
    return this.ses;
  }

  getS3() {
    if (!this.s3) {
      this.s3 = new AWS.S3({ region: 'eu-central-1' });
    }
    return this.s3;
  }
}
module.exports = AwsService;