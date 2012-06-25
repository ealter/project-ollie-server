var assertRequiredParameters = require('./accounts').assertRequiredParameters;
var gameConstants = require('./game-constants');
var db = require('mongojs').connect(gameConstants.databaseName,
                                   ['accounts']);

var pages = {};
exports.pages = pages;

pages.searchUsername = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['query']))
    return;
  db.accounts.findOne({username: query.query}, {username: true}, function (err, result) {
    if(err) {
      res.send({error: err});
    } else if(result) {
      res.send({usernames: [result.username]});
    } else {
      res.send({usernames: []});
    }
  });
};

