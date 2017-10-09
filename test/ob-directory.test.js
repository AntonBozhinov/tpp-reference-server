const request = require('supertest');

const { app } = require('../app/index.js');
const { session } = require('../app/session.js');
const assert = require('assert');

const nock = require('nock');

const directoryHeaders = {
  reqheaders: {
    authorization: 'Bearer AN_ACCESS_TOKEN',
  },
};

const expectedResult = [
  {
    id: 'http://aaa.example.com',
    logoUri: 'string',
    name: 'AAA Example Bank',
    orgId: 'aaa-example-org',
  },
  {
    id: 'http://bbb.example.com',
    logoUri: 'string',
    name: 'BBB Example Bank',
    orgId: 'bbbccc-example-org',
  },
  {
    id: 'http://ccc.example.com',
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
    session.deleteAll();
  });
});
