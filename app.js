var express = require('express');
var path = require('path');
var mongodb = require('mongodb');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// all environments
var server_ip_address = '0.0.0.0';
app.set('port', 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// connect to database
var dbURL = process.env.DB_URL;
if (dbURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
  var mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
  var mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
  var mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
  var mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
  var mongoUser = process.env[mongoServiceName + '_USER'];
  dbURL = 'mongodb://';
  if (mongoUser && mongoPassword) {
    dbURL += mongoUser + ':' + mongoPassword + '@';
  }
  dbURL +=  mongoHost + ':' + mongoPort + '/' + mongoDatabase;
}
var db
mongodb.connect(dbURL, function(err, conn) {
  if (err) throw err;

  db = conn
  // make sure collection is capped
  db.command({'convertToCapped': 'readings', size: 20000});

  console.log('Connected to MongoDB');
})


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// number of readings to show on the webpage
var numReadings = 30;

// helper function for getting readings from the db
var getReadings = function(n, cb) {
  db.collection('readings').find().sort({$natural: -1}).limit(n).toArray(cb);
};

// GET / - render index page with readings
app.get('/', function(req, res) {
  getReadings(numReadings, function(err, readings) {
    if (err) throw err;

    res.render('index', {
      title: 'Sump Monitor',
      readings: readings
    });
  });
});

// GET /ping - simple ping for healthcheck
app.get('/ping', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ response: 'pong' }));
});

// POST /update - update db and emit new readings
app.post('/update', function(req, res) {
  var reading = {
    Time: req.body.timestamp,
    Level: req.body.level
  };

  db.collection('readings').insertOne(reading, function(err, saved) {
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      res.end(JSON.stringify({ success: false }));
    } else {
      res.end(JSON.stringify({ success: true }));
    }

    getReadings(numReadings, function(err, readings) {
      io.emit('update', readings);
    });
  });
});

// start server
http.listen(app.get('port'), server_ip_address, function() {
  console.log('Express server listening on port ' + app.get('port'));
});
