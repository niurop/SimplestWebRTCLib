const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(handler);

function handler(req, res, next) {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': '*',
  });
  next();
}

const offers = {};

app.post('/offer', (req, res) => {
  const { id, offer } = req.body;
  console.log('offer: ', id);
  offers[id] = { offer, res };
});

app.post('/askforoffer', (req, res) => {
  const { id } = req.body;
  console.log('askforoffer: ', id);
  res.json(offers[id].offer);
});

app.post('/answer', (req, res) => {
  const { id, answer } = req.body;
  console.log('answer: ', id);
  offers[id].res.json(answer);
  delete offers[id];
});

app.listen(8000, function (err) {
  if (err) console.log('Error in server setup');
  console.log('Server listening');
});
