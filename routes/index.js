
/*
 * GET home page.
 */

var fs = require('fs');

exports.index = function(req, res){
  fs.readFile('state.json', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
    var level = obj.level;

    res.render('index', { title: 'Sump Monitor', level: level });
  });
};
