const faunaDB = require('faunadb');

require('dotenv').config();

const q = faunaDB.query;

const fauna_client = new faunaDB.Client({
  secret: process.env.FAUNADB_SECRET_KEY,
});

function response(body = '', statusCode = 200) {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: {
      'access-control-allow-methods': 'DELETE,GET,POST',
      'access-control-allow-origin': '*',
    },
  };
}

module.exports = { q, fauna_client, response };
