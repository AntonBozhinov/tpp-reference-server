const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('setupAccountRequest called with null authorisationServerId', () => {
  it('throws error with 400 status set', async () => {
    try {
      const {
        setupAccountRequest,
      } = require('../../app/setup-account-request/setup-account-request'); // eslint-disable-line
      await setupAccountRequest(null);
      assert.ok(false);
    } catch (error) {
      assert.equal(error.message, 'authorisationServerId missing from request payload');
      assert.equal(error.name, 'Error');
      assert.equal(error.status, 400);
    }
  });
});

describe('setupAccountRequest called with authorisationServerId', () => {
  const accessToken = 'access-token';
  const authServerHost = 'http://example.com';
  const clientId = 'id';
  const clientSecret = 'secret';
  let setupAccountRequest;
  let postTokenStub;

  before(() => {
    process.env.ASPSP_AUTH_SERVER = authServerHost;
    process.env.ASPSP_AUTH_SERVER_CLIENT_ID = clientId;
    process.env.ASPSP_AUTH_SERVER_CLIENT_SECRET = clientSecret;
    postTokenStub = sinon.stub().returns({ access_token: accessToken });
    setupAccountRequest = proxyquire(
      // eslint-disable-line
      '../../app/setup-account-request/setup-account-request',
      { '../obtain-access-token': { postToken: postTokenStub } },
    ).setupAccountRequest;
  });

  after(() => {
    process.env.ASPSP_AUTH_SERVER = null;
    process.env.ASPSP_AUTH_SERVER_CLIENT_ID = null;
    process.env.ASPSP_AUTH_SERVER_CLIENT_SECRET = null;
  });

  it('returns access-token from postToken call', async () => {
    const token = await setupAccountRequest('authorisationServerId');
    assert.equal(token, accessToken);
    assert(postTokenStub.calledWith(authServerHost, clientId, clientSecret));
  });
});
