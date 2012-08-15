var db = require('./game-constants').connectToDatabase(['accounts', 'purchases']);
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

function addTokensToUser(username, numNewTokens, callback) {
  numberOfTokensForUser(username, function (numTokens) {
    if(_.isObject(numTokens)) {
      callback(numTokens);
    } else {
      var newTotal = numTokens + numNewTokens;
      if(numTokens + numNewTokens < 0) {
        console.log("The number of tokens is " + str(newTotal) + " which is negative");
      }
      var data = {};
      data[tokensDbKey] = newTotal;
      db.accounts.update({username: username.toLowerCase()}, {$set: data});
      callback({tokens: numTokens});
    }
  });
}

function validateStoreReceipt(username, receiptData, callback) {
  var options = {host: 'buy.itunes.apple.com',
                 path: 'verifyReceipt',
               method: 'POST',
              headers: {'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': receiptData.length}};
  var req = https.request(options, function (res) {
    var body = ''
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function () {
      var data = JSON.parse(body);
      if(data.status != 0) {
        callback(false);
      } else {
        db.purchases.insert(data.receipt);
        var numPurchased = parseInt(data.receipt.product_id);
        if(_.isNaN(numPurchased)) {
          console.log("Invalid product id: " + data.receipt.product_id);
          numPurchased = 1000;
        }
        numPurchased *= data.receipt.quantity;
        addTokensToUser(username, numPurchased, callback);
      }
    });
  });
  req.write({receipt_data: receiptData});
  req.end();
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

pages.validateTokenPurchase = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['receipt-data']))
    return;
  accounts.validateCredentials(res, query, function (isValid) {
    if(isValid) {
      validateStoreReceipt(query.username, query['receipt-data'], function (data) {
        res.send(data); //On success, the number of tokens with the key 'tokens'
      });
    }
  });
};

