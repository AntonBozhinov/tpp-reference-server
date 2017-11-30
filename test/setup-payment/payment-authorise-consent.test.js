const request = require('supertest');
const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const express = require('express');
const bodyParser = require('body-parser');
const env = require('env-var');
const qs = require('qs');

const authorisationServerId = '123';
const clientId = 'testClientId';
const clientSecret = 'testClientSecret';
const redirectUrl = 'http://example.com/redirect';
const issuer = 'http://example.com';
const jsonWebSignature = 'testSignedPayload';

const setupApp = (setupPaymentStub, authorisationEndpointStub) => {
  const clientCredentialsStub = sinon.stub().returns({ clientId, clientSecret });
  const createJsonWebSignatureStub = sinon.stub().returns(jsonWebSignature);
  const issuerStub = sinon.stub().returns(issuer);
  const { generateRedirectUri } = proxyquire(
    '../../app/authorise/authorise-uri.js',
    {
      'env-var': env.mock({
        SOFTWARE_STATEMENT_REDIRECT_URL: redirectUrl,
      }),
      './request-jws': {
        createJsonWebSignature: createJsonWebSignatureStub,
      },
      '../authorisation-servers': {
        authorisationEndpoint: authorisationEndpointStub,
        getClientCredentials: clientCredentialsStub,
        issuer: issuerStub,
      },
    },
  );
  const { paymentAuthoriseConsent } = proxyquire(
    '../../app/setup-payment/payment-authorise-consent.js',
    {
      './setup-payment': {
        setupPayment: setupPaymentStub,
      },
      '../authorise': {
        generateRedirectUri,
      },
    },
  );
  const app = express();
  app.use(bodyParser.json());
  app.post('/payment-authorise-consent', paymentAuthoriseConsent);
  return app;
};

const fapiFinancialId = 'testFapiFinancialId';

const doPost = app => request(app)
  .post('/payment-authorise-consent')
  .set('x-fapi-financial-id', fapiFinancialId)
  .send({ authorisationServerId });

describe('/payment-authorise-consent with successful setupPayment', () => {
  const setupPaymentStub = sinon.stub();
  const authorisationEndpointStub = sinon.stub().returns('http://example.com/authorize');
  const app = setupApp(setupPaymentStub, authorisationEndpointStub);

  const expectedRedirectHost = 'http://example.com/authorize';
  const expectedParams = {
    client_id: clientId,
    redirect_uri: redirectUrl,
    request: jsonWebSignature,
    response_type: 'code',
    scope: 'openid payments',
    state: 'eyJhdXRob3Jpc2F0aW9uU2VydmVySWQiOiIxMjMiLCJzY29wZSI6Im9wZW5pZCBwYXltZW50cyJ9',
  };

  it('creates a redirect URI with a 200 code via the to /authorize endpoint', (done) => {
    doPost(app)
      .end((e, r) => {
        assert.equal(r.status, 200);
        const location = r.body.uri;
        const parts = location.split('?');
        const host = parts[0];
        const params = qs.parse(parts[1]);
        assert.equal(host, expectedRedirectHost);
        assert.deepEqual(params, expectedParams);
        const header = r.headers['access-control-allow-origin'];
        assert.equal(header, '*');
        done();
      });
  });
});

describe('/payment-authorise-consent with error thrown by setupPayment', () => {
  const status = 403;
  const message = 'message';
  const error = new Error(message);
  error.status = status;
  const setupPaymentStub = sinon.stub().throws(error);
  const authorisationEndpointStub = sinon.stub();
  const app = setupApp(setupPaymentStub, authorisationEndpointStub);

  it('returns status from error', (done) => {
    doPost(app)
      .end((e, r) => {
        assert.equal(r.status, status);
        assert.deepEqual(r.body, { message });
        const header = r.headers['access-control-allow-origin'];
        assert.equal(header, '*');
        done();
      });
  });
});
