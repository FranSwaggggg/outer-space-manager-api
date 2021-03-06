var express = require('express')
var path = require('path')
var router = express.Router()
var jwt = require('jsonwebtoken')
require('./response')
require('./db/dbSeed').fillDb()
var queueHelper = require('./db/queueHelper')
var admin = require('./db/db')
// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = admin.database()
var ref = db.ref('outer-space-manager')

var auth = require('./api/authRest.js')
var fleetRest = require('./api/fleetRest.js')
var userRest = require('./api/userRest.js')
var deviceRest = require('./api/deviceRest.js')
var buildings = require('./api/buildingRest.js')
var searches = require('./api/searchRest.js')
var app = exports.app = express()

app.set('port', (process.env.PORT || 3005))
var bodyParser = require('body-parser')
app.use(bodyParser.json())

app.use(express.static(path.join(__dirname, '/doc')))

// views is directory for all template files
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')

app.get('/', function (request, response) {
  response.render('pages/index')
})

/*
* Routes that can be accessed by any one
*/
router.post('/api/v1/auth/login', auth.login)
router.post('/api/v1/auth/create', auth.create)
router.get('/img/:user', userRest.getImage)

// route middleware to verify a token
router.use(function (req, res, next) {
  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token']
  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, process.env.APP_SECRET, function (err, decoded) {
      if (err) {
        res.respond('Failed to authenticate token.', 'invalid_access_token', 403)
        return
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded
        ref.child('tokens').orderByChild('token').equalTo(token).once('value', function (snapshot) {
          var tokenFetched = snapshot.val()
          if (tokenFetched == null) {
            res.respond('No token corresponding found', 'invalid_access_token', 403)
            return
          }
          queueHelper.executeQueue(function () {
            var username = tokenFetched[Object.keys(tokenFetched)[0]].username
            var userRef = ref.child('users/' + username)
            userRef.once('value', function (snapshot) {
              var userFetched = snapshot.val()
              if (userFetched == null) {
                res.respond('No user corresponding found', 'invalid_access_token', 403)
                return
              }
              userRest.refreshResources(userFetched, function (user) {
                req.user = user
                next()
              })
            }, function (errorObject) {
              res.respond('Oups, server is not that ok with your request', 'server_bad_response', 500)
            })
          })
        }, function (errorObject) {
          res.respond('Oups, server is not that ok with your request', 'server_bad_response', 500)
        })
      }
    })
  } else {
    // if there is no token
    // return an error
    res.respond('No token provided', 'invalid_access_token', 403)
    return
  }
})
router.get('/api/v1/buildings', buildings.getBuildings)
router.get('/api/v1/buildings/list', buildings.getBuildingsForUser)
router.post('/api/v1/buildings/create/:buildingId', buildings.createBuildingForUser)
router.get('/api/v1/searches', searches.getSearches)
router.get('/api/v1/searches/list', searches.getSearchesForUser)
router.post('/api/v1/searches/create/:searchId', searches.createSearchForUser)
router.get('/api/v1/ships/:shipId', fleetRest.getShipById)
router.get('/api/v1/ships', fleetRest.getShips)
router.get('/api/v1/fleet/list', fleetRest.getShipsForUser)
router.post('/api/v1/ships/create/:shipId', fleetRest.createShip)
router.get('/api/v1/users/:from/:limit', userRest.getUsers)
router.get('/api/v1/reports/:from/:limit', userRest.getReports)
router.post('/api/v1/fleet/attack/:userName', fleetRest.attack)
router.get('/api/v1/users/get', userRest.getCurrentUser)
router.post('/api/v1/devices/add', deviceRest.addDeviceToken)
router.get('/api/v1/devices/pushme', deviceRest.pushme)

app.use('/', router)
if (module.parent === null) {
  app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'))
  })
}
// Used to expose the app for the tests
module.exports = app
