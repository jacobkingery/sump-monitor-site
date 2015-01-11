
var fs = require('fs');

/*
 * GET home page.
 */

exports.index = function(req, res){
  fs.readFile('state.json', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
    var level = obj.level;

    res.render('index', { title: 'Sump Monitor', level: level });
  });
};


/*
 * POST updates.
 */

exports.update = function(req, res){
  var level = req.body.level;
  fs.writeFile('state.json', JSON.stringify({ level: level }), function(err,data) {
    res.setHeader('Content-Type', 'application/json');
    if (err) {
      res.end(JSON.stringify({ success: false }));
    } else {
      res.end(JSON.stringify({ success: true }));
    }
  });
};

