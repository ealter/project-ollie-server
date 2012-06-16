var db = require('mongojs').connect('ollie',
         ['accounts', 'accountsMeta', 'accountRecovery']);
var mongodb = require('mongodb');
var passwordHash = require('password-hash');
var url = require('url');
var crypto = require('crypto');
var constants = require('./game-constants.js');
var nodemailer = require('nodemailer');
nodemailer.sendmail = true;
var transport = nodemailer.createTransport("Sendmail", "/usr/sbin/sendmail");
var mustache = require('mustache');
var fs = require('fs');

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
    var hashedToken = passwordHash.hash(buf);
    var token = new mongodb.Binary(hashedToken);
    db.accounts.update({username: username},
                       {$set: {token: token, tokenDate: new Date()}});
    callback(buf);
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
    db.accounts.update({username: username}, {token: nil, tokenDate: nil});
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
    callback(passwordHash.verify(auth_token, result.token));
  });
}

/* Password Recovery */
function getPasswordResetLink(email, callback) {
  crypto.randomBytes(8, function(ex, buf) {
    db.accountRecovery.findOne({email: email}, function (err, result) {
      if(err) {
        callback(null);
        return;
      }
      var expires = new Date().addHours(2);
      var data = {email: email, token: new mongodb.Binary(buf), expires: expires};
      if(result === null)
        db.accountRecovery.insert(data);
      else
        db.accountRecovery.update({email: email}, data);
      var encodedToken = encodeURIComponent(buf.toString('base64'));
      callback(url.format({protocol: 'https:',
                         hostname: constants.hostname,
                         pathname: '/accounts/recoverPassword',
                         query: {email: email, auth: encodedToken}}));
    });
  });
}

function isPasswordResetTokenValid(email, token, callback) {
  db.accountRecovery.findOne({email: email, token: token}, function (err, result) {
    callback(result !== null && result.expires >= new Date());
  });
}

function resetPassword(email, token, unencryptedPassword, callback) {
  isPasswordResetTokenValid(email, token, function(valid) {
    if(!valid) {
      callback(false);
      return;
    }
    db.accountRecovery.remove({email: email});
    var password = passwordHash.generate(unencryptedPassword);
    db.accounts.update({email: email}, {$set: {password: password}});
    //Send an email
    var message = {
      from:    constants.noReplyEmail,
      to:      email,
      subject: "Your password has been reset",
      text:    "This is an automatic message from Gorilla Warefare informing "+
               "you that your password for " + constants.companyName +
               " has been reset."
    };
    transport.sendMail(message, function (error) {
      if(error)
        console.error("Sending email confirming a pssword change failed");
    });
    callback(true);
  });
}

/* Exported functions */
var pages = {};
exports.pages = pages;
exports.isAuthTokenValid = isAuthTokenValid;

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
        res.send({auth_token: token.toString('base64')});
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

/* Password recovery exported functions */
pages.sendRecoveryEmail = function (req, res, query) {
  assertRequiredParameters(query, ['email']);
  var email = query.email;
  doesEmailExist(email, function (emailExists) {
    if(!emailExists) {
      console.log("email " + email + " does not exist");
      return;
    }
    getPasswordResetLink(email, function (link) {
      if(!link) {
        res.send({error: 'Password recovery link is invalid. Please try again'});
        return;
      }
      fs.readFile('./passwordRecoveryEmail.html', 'ascii', function (err, template) {
        if(err) throw err;
        var message = {
          from: constants.noReplyEmail,
          to: email,
          subject: "Recover password for " + constants.gamename,
          html: mustache.to_html(template, {companyName: constants.gamename,
                                            resetLink: link})
        };
        transport.sendMail(message, function (error) {
          if(error)
            console.error("Sending an email encountered an error");
          else
            console.log("message sent");
        });
        res.send("If the email address exists, the password recovery message " +
                 "has been sent");
      });
    });
  });
};

pages.recoverPassword = function (req, res, query) {
  assertRequiredParameters(query, ['email', 'auth']);
  isPasswordResetTokenValid(query.email, query.auth, function (valid) {
    if(!valid) {
      res.send({error: "Invalid email recovery link"});
      return;
    }
    fs.readFile('./passwordRecoveryForm.html', 'ascii', function (err, template) { 
      if(err) throw err;
      res.send(mustache.to_html(template, {email: query.email,
                                            auth: query.auth,
                                            company: constants.companyName}));
    });
  });
};

pages.resetPassword = function (req, res, query) {
  assertRequiredParameters(query, ['email', 'auth', 'password', 'password_repeat']);
  var formError = function(message) {
    res.send(message);
  };
  var password = query.password;
  if(password !== query.password_repeat) {
    formError("The passwords do not match.");
    return;
  }
  if(strlen(password) < constants.minPasswordLength) {
    formError("The password must be at least " + constants.minPasswordLength +
              " characters long.");
    return;
  }
  resetPassword(query.email, query.auth, query.password, function (isValid) {
    if(!isValid) {
      formError("The password reset link is not valid.");
      return;
    }
    fs.readFile('./passwordResetSuccess.html', function (err, html) {
      if(err) throw err;
      res.send(html);
    });
  });
};

