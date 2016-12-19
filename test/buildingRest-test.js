require('dotenv').config({verbose: true});
const PORT = 3001;
var assert = require('assert')
  , app = require('../index')
  , expected_id = 1
// Configure REST API host & URL
require('api-easy')
.describe('auth-rest')
.use('localhost', PORT)
.root('/api/v1')
.setHeader('Content-Type', 'application/json')
.setHeader('Accept', 'application/json')

// Initially: start server
.expect('Start server', function () {
  app.app.listen(PORT);
}).next()

// 1. Get list of buildings
.get('/buildings')
.expect(200)
.expect('Should have more than zero buildings', function (err, res, body) {
  var result = JSON.parse(body);
  assert.ok(result.buildings.length > 0, 'The list does not contains buildings');
})
.next()

// Export tests for Vows
.export(module)