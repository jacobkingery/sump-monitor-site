var express = require('express');
var path = require('path');
var mongojs = require('mongojs');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// all environments
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 3000);
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
var dbURL = process.env.OPENSHIFT_MONGODB_DB_URL + process.env.OPENSHIFT_APP_NAME || 'mongodb://localhost:27017/monitor';
var db = mongojs(dbURL, ['readings']);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// number of readings to show on the webpage
var numReadings = 15;

// helper function for getting readings from the db
var getReadings = function(n, cb) {
  db.readings.find().sort({$natural: -1}).limit(n, cb);
};

// GET / - render index page with readings
app.get('/', function(req, res) {
  getReadings(numReadings, function(err, readings) {
    if (err) throw err;

    console.log(readings);
    res.render('index', {
      title: 'Sump Monitor',
      readings: readings
    });
  });
});

// POST /update - update db and emit new readings
app.post('/update', function(req, res) {
  var reading = {
    Time: req.body.timestamp,
    Level: req.body.level
  };

  db.readings.save(reading, function(err, saved) {
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
