const { postToken } = require('../app/obtain-access-token');
const assert = require('assert');

const nock = require('nock');

const clientId = 's6BhdRkqt3';
const clientSecret = '7Fjfp0ZBr1KtDRbnfVdmIw';
const credentials = 'Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3';
const samplePayload = {
  scope: 'accounts',
  grant_type: 'client_credentials',
};

describe('POST /token 200 response', () => {
  const response = {
    access_token: 'accessToken',
    expires_in: 3600,
    token_type: 'bearer',
    scope: 'accounts',
  };

  nock(/example\.com/)
    .post('/token')
    .matchHeader('authorization', credentials)
    .reply(200, response);

  it('returns data when 200 OK', async () => {
    const result = await postToken('http://example.com', clientId, clientSecret, samplePayload);
    assert.deepEqual(result, response);
  });
});

describe('POST /token non 200 response', () => {
  nock(/example\.com/)
    .post('/token')
    .matchHeader('authorization', credentials)
    .reply(403);

  it('throws error with response status', async () => {
    try {
      await postToken('http://example.com', clientId, clientSecret, samplePayload);
      assert.ok(false);
    } catch (error) {
      assert.equal(error.name, 'Error');
      assert.equal(error.message, 'Forbidden');
      assert.equal(error.status, 403);
    }
  });
});

describe('POST /token error sending request', () => {
  it('throws error with status set to 500', async () => {
    try {
      await postToken('bad-uri', clientId, clientSecret, samplePayload);
      assert.ok(false);
    } catch (error) {
      assert.equal(error.name, 'Error');
      assert.equal(error.message, 'socket hang up');
      assert.equal(error.status, 500);
    }
  });
});
