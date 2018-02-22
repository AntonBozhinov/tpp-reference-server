const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { checkErrorThrown } = require('../utils');

const authorisationServerId = 'testAuthorisationServerId';
const fapiFinancialId = 'testFinancialId';
const interactionId = 'testInteractionId';
const sessionId = 'testSessionId';
const username = 'testUsername';
const headers = {
  fapiFinancialId, interactionId, sessionId, username, authorisationServerId,
};

describe('deleteAccountRequest called with authorisationServerId and fapiFinancialId', () => {
  const accessToken = 'access-token';
  const resourceServer = 'http://resource-server.com';
  const resourcePath = `${resourceServer}/open-banking/v1.1`;
  const accountRequestId = '88379';
  let deleteRequestProxy;
  let accessTokenAndResourcePathProxy;
  let deleteAccountRequestStub;
  let consentAccountRequestIdStub;

  const setup = success => () => {
    deleteAccountRequestStub = sinon.stub().returns(success);
    accessTokenAndResourcePathProxy = sinon.stub().returns({ accessToken, resourcePath });
    consentAccountRequestIdStub = sinon.stub().returns(accountRequestId);
    deleteRequestProxy = proxyquire(
      '../../app/setup-account-request/delete-account-request',
      {
        '../authorise': {
          accessTokenAndResourcePath: accessTokenAndResourcePathProxy,
          consentAccountRequestId: consentAccountRequestIdStub,
        },
        './account-requests': { deleteAccountRequest: deleteAccountRequestStub },
      },
    ).deleteRequest;
  };

  describe('when delete successful', () => {
    before(setup(true));

    it('returns 204 from deleteRequests call', async () => {
      const status = await deleteRequestProxy(headers);
      assert.equal(status, 204);
      const headersWithToken = {
        accessToken, fapiFinancialId, interactionId, sessionId, username, authorisationServerId,
      };
      assert(deleteAccountRequestStub.calledWithExactly(
        accountRequestId,
        resourcePath,
        headersWithToken,
      ));
    });
  });

  describe('when delete not successful', () => {
    before(setup(false));

    it('throws error for now', async () => {
      await checkErrorThrown(
        async () => deleteRequestProxy(headers),
        400, 'Bad Request',
      );
    });
  });
});
