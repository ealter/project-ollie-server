var db = require('./game-constants').connectToDatabase(['accounts']);
var assertRequiredParameters = require('./utility-fns').assertRequiredParameters;
var accounts = require('./accounts');
var _ = require('underscore');

var tokensDbKey = 'tokens'; //@const

function numberOfTokensForUser (username, callback) {
  accounts.getUsernameDetails(username, function (err, result) {
    if(err) {
      console.log("Error getting number of tokens");
      console.log(err);
      callback({error: err});
    } else if(!result) {
      callback({error: "User does not exist"});
    } else if(result[tokensDbKey]) {
      callback(result[tokensDbKey]);
    } else {
      callback(0);
    }
  });
}

var pages = {};
exports.pages = pages;

pages.numberOfTokens = function (req, res, query) {
  accounts.validateCredentials(res, query, function (isValid) {
    if(isValid) {
      numberOfTokensForUser(query.username, function (numTokens) {
        if(_.isNumber(numTokens)) {
          res.send({tokens: numTokens});
        } else if(_.isObject(numTokens) && numTokens.error) {
          res.send(numTokens);
        } else {
          console.log("Unknown callback from numberOfTokensForUser");
          console.log(numTokens);
          res.send({error: null});
        }
      });
    }
  });
};

