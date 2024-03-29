var https = require('https');
var db = require('./game-constants').connectToDatabase(['accounts', 'accountsMeta']);
var passwordHash = require('password-hash');
var crypto = require('crypto');
var passwordReset = require('./passwordReset');
var check = require('validator').check;
var assertRequiredParameters = require('./utility-fns').assertRequiredParameters;

function getUsernameDetails(username, callback) {
  db.accounts.findOne({username: username.toLowerCase()}, callback);
}

function getEmailDetails(email, callback) {
  db.accounts.findOne({email: email.toLowerCase()}, callback);
}

function doesUserExist (username, callback) {
  getUsernameDetails(username, function (err, result) {
    if(result === undefined) {
      console.error("The mongodb server might be down!");
    }
    callback(result !== null);
  });
}

function doesEmailExist (email, callback) {
  getEmailDetails(email, function (err, result) {
    if(result === undefined) {
      console.error("The mongodb server might be down!");
    }
    callback(result !== null);
  });
}

function makeNormalAccount (username, unencryptedPassword, email, callback) {
  username = username.toLowerCase();
  doesUserExist(username, function(userExists) {
    if(userExists) {
      callback({error: 'Username already exists'});
      return;
    }
    doesEmailExist(email, function(emailExists) {
      if(emailExists) {
        callback({error: 'Email already exists'});
        return;
      }
      var password = passwordHash.generate(unencryptedPassword);
      db.accounts.insert({username: username, password: password, email: email});
      callback({success: true});
    });
  });
}

function generateUserName(callback) {
  db.accountsMeta.findOne(function (err, result) {
    var fieldName = 'highestAccountId';
    var prefix = 'user';
    var accountId = result !== null ? result[fieldName] : 135821;
    var checkUserName = function(accountId, callback) {
      doesUserExist(prefix + accountId, function(userExists) {
        if(userExists)
          checkUserName(accountId + 1, callback);
        else
          callback(accountId);
      });
    };
    checkUserName(accountId, function(accountId) {
      var data = {};
      data[fieldName] = accountId + 1;
      if(result === null)
        db.accountsMeta.insert(data);
      else
        db.accountsMeta.update({}, {$set: data});
      callback(prefix + accountId);
    });
  });
};

/* Precondition: the original already exists, but the new one does not */
function changeUserName(originalUsername, newUsername, callback) {
  db.accounts.update({username: originalUsername.toLowerCase()},
                     {$set: {username: newUsername.toLowerCase()}}, callback);
}

function changePassword(username, newPassword, callback) {
  db.accounts.update({username: username},
      {$set: {password: passwordHash.generate(newPassword)}}, callback);
}

function login(username, unencryptedPassword, callback) {
  getUsernameDetails(username, function(err, result) {
    if(err || result === null) {
      callback(false);
    } else {
      callback(passwordHash.verify(unencryptedPassword, result.password));
    }
  });
}

function logout(username, callback) {
  db.accounts.update({username: username.toLowerCase()},
                     {$set: {auth_token: null, auth_tokenDate: null}});
  //TODO: maybe call callback only if update succeeded?
  callback(true);
}

function generateAuthToken(username, callback) {
  crypto.randomBytes(32, function(ex, buf) {
    if (ex) throw ex;
    var token = buf.toString('base64');
    var encryptedToken = passwordHash.generate(buf.toString('base64'));
    db.accounts.update({username: username.toLowerCase()},
                       {$set: {auth_token: encryptedToken, auth_tokenDate: new Date()}});
    callback(token);
  });
}

function isAuthTokenValid(username, auth_token, callback) {
  getUsernameDetails(username, function (err, result) {
    if(err || result == null) {
      callback(false);
      return;
    }
    //TODO: make auth tokens expire?
    callback(passwordHash.verify(auth_token, result.auth_token));
  });
}

//Calls the callback with true on success. On failure, it sends an error
//message and calls the callback with false.
function validateCredentials(res, query, callback) {
  if(!assertRequiredParameters(res, query, ['username', 'auth_token'])) {
    callback(false);
  } else {
    isAuthTokenValid(query.username, query.auth_token, function (isValid) {
      if(isValid) {
        callback(true);
      } else {
        res.send({error: "Invalid authorization"});
        callback(false);
      }
    });
  }
}



/* On success, it calls the callback with the userId. On failure, it calls the
 * callback with null. */
function userIdForFacebookAccessToken(accessToken, callback)
{
  var options = {host: 'graph.facebook.com',
                 path: '/me?access_token=' + accessToken};
  var req = https.request(options, function (res) {
    var body = ''
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function () {
      var data = JSON.parse(body);
      if(data.hasOwnProperty('error'))
        callback(null);
      else
        callback(data.id);
    });
  });
  req.end();
  req.on('error', function (e) {
    console.error(e);
  });
}

/* Exported functions */
var pages = {};
exports.pages = pages;
exports.isAuthTokenValid    = isAuthTokenValid;
exports.validateCredentials = validateCredentials;
exports.generateUserName    = generateUserName;
exports.doesUserExist       = doesUserExist;
exports.doesEmailExist      = doesEmailExist;
exports.getUsernameDetails  = getUsernameDetails;

pages.newAccount = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['username', 'password', 'email']))
    return;
  makeNormalAccount(query.username, query.password, query.email, function (success) {
    res.send(success);
  });
};

pages.generateUserName = function (req, res) {
  generateUserName(function (name) {
    res.send({username: name});
  });
};

pages.changeUserName = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['newUsername']))
    return;
  var originalUsername = query.username;
  var newUsername      = query.newUsername;
  validateCredentials(res, query, function (isValid) {
    if(isValid) {
      doesUserExist(newUsername, function (newUsernameExists) {
        if(newUsernameExists) {
          res.send({error: "New username already exists"});
        } else {
          changeUserName(originalUsername, newUsername, function (err, result) {
            if(err) {
              res.send({error: "An unknown error occurred when changing the username"});
              console.log(err);
            } else
              res.send({success: true});
          });
        }
      });
    };
  });
};

pages.changePassword = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['username', 'newPassword']))
    return;
  var username    = query.username;
  var newPassword = query.newPassword;
  var oldPassword = query.oldPassword;
  var changePasswordCallback = function (err, result) {
      if(err) {
        console.err(err);
        res.send({error: "Unknown error in changing password"});
      } else {
        generateAuthToken(username, function (token) {
          res.send({auth_token: token});
        });
      }
  };
  if(oldPassword) {
    getUsernameDetails(username, function (err, result) {
      if(!result || !result.password || !passwordHash.verify(oldPassword, result.password)) {
        res.send({error: "Invalid username or password"});
      } else {
        changePassword(username, newPassword, changePasswordCallback);
      }
    });
  } else {
    getUsernameDetails(username, function (err, result) {
      if(err) {
        res.send({error: "Unknown error when changing password"});
      } else if(!result || result.password) {
        res.send({error: "Invalid username or password"});
      } else {
        changePassword(username, newPassword, changePasswordCallback);
      }
    });
  }
};

pages.login = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['username', 'password']))
    return;
  login(query.username, query.password, function (success) {
    if(success) {
      generateAuthToken(query.username, function (token) {
        res.send({auth_token: token});
      });
    }
    else {
      res.send({error: "Invalid username or password"});
    }
  });
};

pages.logout = function (req, res, query) {
  validateCredentials(res, query, function (isValid) {
    if(isValid) {
      logout(query.username, function (success) {
        if(success)
          res.send({success: true});
        else
          res.send({error: "logout failed"});
      });
    }
  });
};

pages.facebookLogin = function (req, res, query) {
  if(!assertRequiredParameters(res, query, ['facebookAccessToken']))
    return;
  userIdForFacebookAccessToken(query.facebookAccessToken, function (userId) {
    if(!userId) {
      res.send({error: "Invalid facebook access token"});
      return;
    }
    var usernameCallback = function (username) {
      var data = {facebook: {userId: userId}};
      db.accounts.update({username: username}, {$set: data});
      generateAuthToken(username, function (auth_token) {
        res.send({username: username, auth_token: auth_token});
      });
    };
    db.accounts.findOne({facebook: {userId: userId}}, function (err, result) {
      if(err) {
        res.send({error: "Unknown error with the database"});
        return;
      }
      if(result && query.username && (result.username != query.username.toLowerCase())) {
        res.send({error: "Facebook user already exists under another username"});
        return;
      }
      if(!(query.username && query.auth_token)) {
        if(result) {
          usernameCallback(result.username);
        } else {
          generateUserName(function (username) {
            var data = {username: username};
            if(query.email)
              data.email = query.email;
            db.accounts.insert(data, function (err, result) {
              if(err)
                res.send({error: "Unknown error when generating username"});
              else
                usernameCallback(username);
            });
          });
        }
      } else {
        isAuthTokenValid(query.username, query.auth_token, function (isValid) {
          if(isValid)
            usernameCallback(query.username);
          else
            res.send({error: "Either the username or the authorization token is invalid"});
        });
      }
    });
  });
};

pages.sendRecoveryEmail = passwordReset.sendRecoveryEmail;
pages.recoverPassword   = passwordReset.recoverPassword;
pages.resetPassword     = passwordReset.resetPassword;

