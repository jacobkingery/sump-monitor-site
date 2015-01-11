
/*
 * POST updates.
 */

var fs = require('fs');

exports.update = function(req, res){
  var level = req.body.level;
  fs.writeFile('state.json', JSON.stringify({ level: level }));
};
