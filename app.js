var express = require('express');
var path = require('path');
var fs = require('fs');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res) {
  fs.readFile('state.json', function(err, data) {
    if (err) throw err;

    obj = JSON.parse(data);
    var readings = obj.readings;

    res.render('index', {
      title: 'Sump Monitor',
      readings: readings.reverse()
    });
  });
});

app.post('/update', function(req, res) {
  var reading = {
    Time: req.body.timestamp,
    Level: req.body.level
  };

  fs.readFile('state.json', function(err, data) {
    if (err) throw err;
    
    // Remove oldest reading, add new reading
    obj = JSON.parse(data);
    var readings = obj.readings;
    readings = readings.slice(1)
    readings.push(reading);

    // Write readings to file
    fs.writeFile('state.json', JSON.stringify({ readings: readings }), function(err,data) {
      res.setHeader('Content-Type', 'application/json');
      if (err) {
        res.end(JSON.stringify({ success: false }));
      } else {
        res.end(JSON.stringify({ success: true }));
      }
    });

    // Emit updated readings array to listening sockets
    io.emit('update', readings.reverse());
  });
});

http.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
