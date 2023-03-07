const { q, fauna_client, response } = require('./utils');

exports.handler = async function (event) {
  const query = event.queryStringParameters;
  const body = event.body ? JSON.parse(event.body) : {};

  switch (event.httpMethod) {
    case 'GET':
      return await GET(query, body);
    case 'POST':
      return await POST(query, body);
    case 'DELETE':
      return await DELETE(query, body);
    //pre-fight
    case 'OPTIONS':
      return response(true);
    default:
      return response(
        '400 Bad Request: Use [GET | POST | DELETE] .../answer',
        400
      );
  }
};

async function GET({ id }) {
  try {
    return response(
      await fauna_client.query(
        q.Select(
          ['data', 'offer'],
          q.Get(q.Match(q.Index('match'), [id, true]))
        )
      )
    );
  } catch (error) {
    return response('');
  }
}

async function POST({ id }, { offer }) {
  try {
    await fauna_client.query(
      q.Update(q.Select('ref', q.Get(q.Match(q.Index('match'), [id, false]))), {
        data: {
          offer,
          answer: true,
        },
      })
    );
    return response(true);
  } catch (error) {
    return response(false);
  }
}

async function DELETE({ id }) {
  try {
    await fauna_client.query(
      q.Delete(q.Select('ref', q.Get(q.Match(q.Index('match'), [id, true]))))
    );
    return response(true);
  } catch (error) {
    return response(false);
  }
}
