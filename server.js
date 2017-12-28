// server.js
var express = require('express');
var Sequelize = require('sequelize');

var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

// set up app
app.set('port', process.env.PORT);
app.set('views', 'views');
app.set('view engine', 'jade');
app.use(express.json());
app.use(express.static('public'));

// settings
var numReadings = 30;  // number of readings to show on the webpage
var maxReadings = 100; // max number of readings to keep in the database

// connect to the database
var sequelize = new Sequelize('database', process.env.DB_USER, process.env.DB_PASS, {
  host: '0.0.0.0',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    idle: 10000,
  },
  operatorsAliases: false,
  // Security note: the database is saved to the file `db.sqlite` on the local filesystem. It's deliberately
  // placed in the `.data` directory which doesn't get copied if someone remixes the project on Glitch.
  storage: '.data/db.sqlite',
});

// authenticate with the database and set up table
var Readings;
var removeOldReadings = function(reading, options) {
  Readings.count().then(function(count) {
    if (count > maxReadings) {
      // delete old readings if we're over the limit
      var num = count - maxReadings;
      console.log('deleting ' + num + ' old reading(s)');
      Readings.destroy({
        where: sequelize.literal('id in (select id from readings order by timestamp limit ' + num + ')'),
      });
    }
  });
};
sequelize.authenticate()
  .then(function() {
    console.log('Connection has been established successfully.');
    // define a new table 'readings'
    Readings = sequelize.define('readings',
      {
        level: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        timestamp: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      },                           
      {
        hooks: {
          afterCreate: removeOldReadings,
          afterBulkCreate: removeOldReadings,
        },
      },
    );
    
    sequelize.sync();
  })
  .catch(function (err) {
    console.log('Unable to connect to the database: ', err);
  });

// helper function for getting readings from the db
var getReadings = function(num, callback) {
  Readings.findAll({
    attributes: [
      ['level', 'Level'],
      [sequelize.fn('strftime', '%m/%d/%Y %H:%M:%S', sequelize.col('timestamp')), 'Time'],
    ],
    order: [
      ['timestamp', 'DESC'],
    ],
    limit: num,
    raw: true,
  }).then(callback);
};

// helper function for adding readings to the db and emiting new readings
var addReadings = function(readings, callback) {
  Readings.bulkCreate(readings)
    .then(function() {
      callback(undefined);
    })
    .catch(callback);

  getReadings(numReadings, function(newReadings) {
    io.emit('update', newReadings);
  });
}

// GET / - render index page with readings
app.get('/', function(req, res) {
  getReadings(numReadings, function(readings) {
    res.render('index', {
      title: 'Sump Monitor',
      readings: readings,
    });
  });
});

// GET /readings - get readings as JSON
app.get('/readings', function(req, res) {
  getReadings(numReadings, function(readings) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(readings));
  });
});

// POST /update - update db and emit new readings
app.post('/update', function(req, res) {
  var readings = [{
    timestamp: req.body.timestamp,
    level: req.body.level,
  }];
  addReadings(readings, function(err) {
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      console.log('Error adding reading to db: ', err);
      res.end(JSON.stringify({ success: false }));
    } else {
      res.end(JSON.stringify({ success: true }));
    }
  });
});

// POST /bulkUpdate - update db with multiple readings and emit new readings
app.post('/bulkUpdate', function(req, res) {
  addReadings(req.body.readings, function(err) {
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      console.log('Error adding readings to db: ', err);
      res.end(JSON.stringify({ success: false }));
    } else {
      res.end(JSON.stringify({ success: true }));
    }
  });
});

// start server
var listener = http.listen(app.get('port'), function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
