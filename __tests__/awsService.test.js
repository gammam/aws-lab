const { AwsService } = require('../src/services/AwsService');
const AWS = require('aws-sdk');

jest.mock('aws-sdk', () => {
  return {
    SES: jest.fn().mockImplementation(() => ({
      sendEmail: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' })
      })
    })),
    S3: jest.fn().mockImplementation(() => ({
      putObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ ETag: 'test-etag' })
      })
    }))
  };
});

describe('AwsService', () => {
  let awsService;

  beforeEach(() => {
    awsService = new AwsService();
  });

  test('getSES dovrebbe restituire un\'istanza di SES', () => {
    const ses = awsService.getSES();
    expect(AWS.SES).toHaveBeenCalledWith({ region: 'eu-central-1' });
    expect(ses).toBeDefined();
  });

  test('getS3 dovrebbe restituire un\'istanza di S3', () => {
    const s3 = awsService.getS3();
    expect(AWS.S3).toHaveBeenCalledWith({ region: 'eu-central-1' });
    expect(s3).toBeDefined();
  });
});