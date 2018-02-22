const { accessTokenAndResourcePath, consentAccountRequestId, deleteConsent } = require('../authorise');
const { deleteAccountRequest } = require('./account-requests');

// const deleteRequest = async (authorisationServerId, headers) => {
const deleteRequest = async (headers) => {
  const { authorisationServerId, username } = headers;
  // const keys = { username: headers.username, authorisationServerId, scope: 'accounts' };
  const keys = { username, authorisationServerId, scope: 'accounts' };
  const accountRequestId = await consentAccountRequestId(keys);

  if (accountRequestId) {
    const { accessToken, resourcePath } = await accessTokenAndResourcePath(authorisationServerId);
    const headersWithToken = Object.assign({ accessToken }, headers);
    const success = await deleteAccountRequest(accountRequestId, resourcePath, headersWithToken);
    if (success) {
      await deleteConsent(keys);
      return 204;
    }
  }
  const error = new Error('Bad Request');
  error.status = 400;
  throw error;
};

exports.deleteRequest = deleteRequest;
