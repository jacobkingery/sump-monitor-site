
var fs = require('fs');

/*
 * GET home page.
 */

exports.index = function(req, res){
  fs.readFile('state.json', function (err, data) {
    if (err) throw err;

    obj = JSON.parse(data);
    var readings = obj.readings;

    res.render('index', { title: 'Sump Monitor', readings: readings.reverse() });
  });
};


/*
 * POST updates.
 */

exports.update = function(req, res){
  var level = req.body.level;
  var timestamp = req.body.timestamp;
  fs.readFile('state.json', function (err, data) {
    if (err) throw err;
    
    obj = JSON.parse(data);
    var readings = obj.readings;
    readings = readings.slice(1)
    readings.push([timestamp, level]);
    
    fs.writeFile('state.json', JSON.stringify({ readings: readings }), function(err,data) {
      res.setHeader('Content-Type', 'application/json');
      if (err) {
        res.end(JSON.stringify({ success: false }));
      } else {
        res.end(JSON.stringify({ success: true }));
      }
    });
  });
};

