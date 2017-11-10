const request = require('supertest');
const fs = require('fs');
const path = require('path');

const accessToken = 'AN_ACCESS_TOKEN';

const { drop } = require('../app/storage.js');

const { app } = require('../app/index.js');
const { session } = require('../app/session.js');
const { AUTH_SERVER_COLLECTION } = require('../app/ob-directory');

const assert = require('assert');
const nock = require('nock');

nock(/secure-url\.com/)
  .get('/private_key.pem')
  .reply(200, fs.readFileSync(path.join(__dirname, 'test_private_key.pem')));

nock(/auth\.com/)
  .post('/as/token.oauth2')
  .reply(200, {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 1000,
  });

const directoryHeaders = {
  reqheaders: {
    authorization: `Bearer ${accessToken}`,
  },
};

const expectedResult = [
  {
    id: 'aaa-example-org-http://aaa.example.com',
    logoUri: 'string',
    name: 'AAA Example Bank',
    orgId: 'aaa-example-org',
  },
  {
    id: 'bbbccc-example-org-http://bbb.example.com',
    logoUri: 'string',
    name: 'BBB Example Bank',
    orgId: 'bbbccc-example-org',
  },
  {
    id: 'bbbccc-example-org-http://ccc.example.com',
    logoUri: 'string',
    name: 'CCC Example Bank',
    orgId: 'bbbccc-example-org',
  },
];

nock(/example\.com/, directoryHeaders)
  .get('/scim/v2/OBAccountPaymentServiceProviders/')
  .reply(200, {
    Resources: [
      {
        AuthorisationServers: [
          {
            BaseApiDNSUri: 'http://aaa.example.com',
            CustomerFriendlyLogoUri: 'string',
            CustomerFriendlyName: 'AAA Example Bank',
          },
        ],
        id: 'aaa-example-org',
      },
      {
        AuthorisationServers: [
          {
            BaseApiDNSUri: 'http://bbb.example.com',
            CustomerFriendlyLogoUri: 'string',
            CustomerFriendlyName: 'BBB Example Bank',
          },
          {
            BaseApiDNSUri: 'http://ccc.example.com',
            CustomerFriendlyLogoUri: 'string',
            CustomerFriendlyName: 'CCC Example Bank',
          },
        ],
        id: 'bbbccc-example-org',
      },
      {
        id: 'empty-example-org',
      },
    ],
  });

const login = application => request(application)
  .post('/login')
  .set('Accept', 'x-www-form-urlencoded')
  .send({ u: 'alice', p: 'wonderland' });

describe('Directory', () => {
  before(() => {
    // set up dummy but valid client key to sing jwt
    process.env.CLIENT_KEY = 'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ0KTUlJQk9RSUJBQUpCQU1Odng4ZmtUNmJXYk1jNGNqdTc1eC9kdkZvYnBIWjNVU25lbWhCNUxYQVFYb2c0eTVqVA0KaXdvOTVBdWJONDB1Mm1YRDhRVWhCNFJFQ2Q0alAvWmczMlVDQXdFQUFRSkFXRzE2VW9xT002bnZuQkNCTjEvaw0KeXJsVVlOMERCQXNtc1RBa08zSG95andDMVpKUG9COUQ4SGJEYzljWnhjRW5vQTZDK2pvNmxSN2NOWTlDRWthbQ0KZ1FJaEFQR2I1S2UxVEQreTBleW1Sb21KVEk5VzZjdmNmVk85dWlhZnVjbjBvLzNGQWlFQXp4UFhicHIxZGtBeg0KZG45QVlMazFIZU1vaXZqak0zVVpFUGhkNmJaOEZTRUNJRngzcDJrd0Q4Q0pOYUoyZUtTR3NaQmlXUlEyakppUw0KRWo1Wi93YjE1QlZwQWlCdHVoN1N2Z3ZKY0RXVTJkTWNMYWVtd2FMUEdSa1RRRDViRHJCODBqU240UUlnY243cw0KYTRvcFdtMVhLM3V3WGhBcXVqY3FnY1NseEpZQXMwWGtvSUNOV3c0PQ0KLS0tLS1FTkQgUlNBIFBSSVZBVEUgS0VZLS0tLS0=';
  });

  after(() => {
    process.env.CLIENT_KEY = null;
  });
  session.setId('foo');

  it('returns proxy 200 response for /account-payment-service-provider-authorisation-servers', (done) => {
    login(app).end((err, res) => {
      const sessionId = res.body.sid;

      request(app)
        .get('/account-payment-service-provider-authorisation-servers')
        .set('Accept', 'application/json')
        .set('authorization', sessionId)
        .end((e, r) => {
          assert.equal(r.status, 200);
          assert.equal(r.body.length, expectedResult.length, `expected ${expectedResult.length} results, got ${r.body.length}`);
          assert.deepEqual(r.body[0], expectedResult[0]);
          assert.deepEqual(r.body[1], expectedResult[1]);
          assert.deepEqual(r.body[2], expectedResult[2]);
          const header = r.headers['access-control-allow-origin'];
          assert.equal(header, '*');
          done();
        });
    });
  });

  after(() => {
    drop(AUTH_SERVER_COLLECTION);
    session.deleteAll();
  });
});
