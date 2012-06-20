var db = require('mongojs').connect('ollie', ['accounts', 'accountsMeta']);
var passwordHash = require('password-hash');
var crypto = require('crypto');
var passwordReset = require('./passwordReset');

Date.prototype.addHours = function(h){
    this.setHours(this.getHours()+h);
    return this;
}

function doesUserExist (username, callback) {
  db.accounts.findOne({username: username}, function (err, result) {
    callback(result !== null);
  });
}

function doesEmailExist (email, callback) {
  db.accounts.findOne({email: email}, function (err, result) {
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
      console.log(accountId);
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

function generateAuthToken(username, callback) {
  crypto.randomBytes(16, function(ex, buf) {
    if (ex) throw ex;
    var token = buf.toString('base64');
    var encryptedToken = passwordHash.generate(buf.toString('base64'));
    db.accounts.update({username: username},
                       {$set: {auth_token: encryptedToken, auth_tokenDate: new Date()}});
    callback(token);
  });
}

function login(username, unencryptedPassword, callback) {
  db.accounts.findOne({username: username}, function(err, result) {
    if(err || result === null) {
      callback(false);
      return;
    }
    callback(passwordHash.verify(unencryptedPassword, result.password));
  });
}

function logout(username, auth_token, callback) {
  isAuthTokenValid(username, auth_token, function (isValid) {
    if(!isValid) {
      callback(false);
      return;
    }
    db.accounts.update({username: username}, {auth_token: nil, auth_tokenDate: nil});
    //TODO: maybe call callback only if update succeeded?
    callback(true);
  });
}

function assertRequiredParameters(query, requiredParameters) {
  for (var i=0; i < requiredParameters.length; i++) {
    var propName = requiredParameters[i];
    if(!query.hasOwnProperty(propName) || query[propName] === "") {
      return {error: 'Missing parameter ' + propName};
    }
  }
  return null;
}

function isAuthTokenValid(username, auth_token, callback) {
  db.accounts.findOne({username: username}, function (err, result) {
    if(err || result == null) {
      callback(false);
      return;
    }
    //TODO: make auth tokens expire?
    callback(passwordHash.verify(auth_token, result.auth_token));
  });
}

/* Exported functions */
var pages = {};
exports.pages = pages;
exports.isAuthTokenValid = isAuthTokenValid;
exports.generateUserName = generateUserName;

pages.newAccount = function (req, res, query) {
  assertRequiredParameters(query, ['username', 'password', 'email']);
  makeNormalAccount(query.username, query.password, query.email, function (success) {
    res.send(success);
  });
};

pages.generateUserName = function (req, res) {
  generateUserName(function (name) {
    res.send({username: name});
  });
};

pages.login = function (req, res, query) {
  assertRequiredParameters(query, ['username', 'password']);
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
  assertRequiredParameters(query, ['username', 'auth_token']);
  logout(query.username, query.auth_token, function (success) {
    if(success)
      res.send({success: true});
    else
      res.send({error: "logout failed"});
  });
};

pages.facebookLogin = function (req, res, query) {
  assertRequiredParameters(query, ['facebookUserId']);
  var usernameCallback = function (username) {
    var data = {facebook: {userId: query.facebookUserId}};
    db.accounts.update({username: username}, {$set: data});
    generateAuthToken(username, function (auth_token) {
      res.send({username: username, auth_token: auth_token});
    });
  };
  if(!(query.username && query.auth_token)) {
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
  } else {
    isAuthTokenValid(query.username, query.auth_token, function (isValid) {
      if(isValid)
        usernameCallback(query.username);
      else
        res.send({error: "Either the username or the authorization token is invalid"});
    });
  }
};

pages.sendRecoveryEmail = passwordReset.sendRecoveryEmail;
pages.recoverPassword   = passwordReset.recoverPassword;
pages.resetPassword     = passwordReset.resetPassword;

