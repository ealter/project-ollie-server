var db = require('./game-constants').connectToDatabase(['accounts', 'accountsMeta', 'games']);
var accounts = require('./accounts');
var _ = require('underscore');
var assertRequiredParameters = require('./utility-fns').assertRequiredParameters;

//Assumes that the challanger and opponent exist.
function startGame(challenger, opponent, callback) {
  db.games.insert({challenger: challenger,
                     opponent: opponent,
                    startDate: new Date(),
             turnIsChallenger: true, //If true, this means that the challenger is up next
                   gameIsOver: false},
                  function (err, result) {
                    if(err) {
                      console.error(err);
                      callback(false);
                    } else {
                      callback(result[0]._id);
                    }
                  });
}

function getCurrentGamesForUser(username, callback) {
  db.games.find({challenger: username, gameIsOver: false}, function (err, result) {
    if(err) {
      console.error(err);
      callback(null);
      return;
    }
    var iAmChallenging = true;
    var getClientFacingGamesData = function (dbGames) {
      return _.map(dbGames, function (dbGameData) {
        return {gameId: dbGameData._id,
              opponent: iAmChallenging ? dbGameData.opponent : dbGameData.challenger,
            isYourTurn: dbGameData.turnIsChallenger === iAmChallenging};
      });
    };
    var challengingGames = getClientFacingGamesData(result);
    db.games.find({opponent: username, gameIsOver: false}, function (err, result) {
      if(err) {
        console.error(err);
        callback(challengingGames);
        return;
      }
      iAmChallenging = false;
      var opponentGames = getClientFacingGamesData(result);
      callback(_.union(opponentGames, challengingGames));
    });
  });
}

var pages = {};
exports.pages = pages;

pages.challengePlayer = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['username', 'auth_token', 'opponentUsername']))
    return;
  var username = query.username;
  var opponentUsername = query.opponentUsername;
  if(username === opponentUsername) {
    res.send({error: 'You cannot challenge yourself to a game.'});
    return;
  }
  accounts.isAuthTokenValid(username, query.auth_token, function (isValid) {
    if(!isValid) {
      res.send({error: "Invalid authorization token"});
      return;
    }
    accounts.doesUserExist(opponentUsername, function (opponentExists) {
      if(!opponentExists) {
        res.send({error: "The opponent username is invalid"});
      } else {
        startGame(username, opponentUsername, function (gameId) {
          if(gameId) {
            res.send({gameId: gameId});
          } else {
            res.send({error: "Unknown error when starting the game"});
          }
        });
      }
    });
  });
};

pages.currentGames = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['username', 'auth_token']))
    return;
  var username = query.username;
  accounts.isAuthTokenValid(username, query.auth_token, function (isValid) {
    if(!isValid) {
      res.send({error: "Invalid authorization token"});
    } else {
      getCurrentGamesForUser(username, function (games) {
        res.send({games: games});
      });
    }
  });
};

