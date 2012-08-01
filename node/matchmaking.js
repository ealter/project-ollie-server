var _ = require('underscore');
var accounts = require('./accounts');
var assertRequiredParameters = accounts.assertRequiredParameters;
var db = require('./game-constants').connectToDatabase(['accounts']);

//TODO: base this on rankings
//TODO: We probably want to store this in a database
function getRandomPlayer(username, callback) {
  var self = getRandomPlayer;
  if(_.isUndefined(self.queue)) {
    self.queue = [];
  }
  var queue = self.queue;
  var opponent = null;
  var queueIndex = 0;
  while(!opponent) {
    if(queueIndex >= queue.length) {
      queue.push({username: username, callback: callback});
      break;
    } else {
      var opponent = queue[queueIndex];
      if(opponent === username) {
        queueIndex++;
        opponent = null;
      } else {
        queue.splice(queueIndex, 1);
        callback(opponent.username);
        opponent.callback(username);
      }
    }
  }
}

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

pages.findRandomPlayer = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['username', 'auth_token']))
    return;
  var username = query.username;
  accounts.isAuthTokenValid(username, query.auth_token, function (isValid) {
    if(!isValid) {
      res.send({error: "Invalid authorization"});
    } else {
      getRandomPlayer(username, function (opponent) {
        res.send({username: username, opponent: opponent});
      });
    }
  });
};

