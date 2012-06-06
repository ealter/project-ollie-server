var journey = require('journey');

exports.createRouter = function () {
  var router = new (journey.Router);
  router.get('/').bind(function (req, res) {
    res.send('Nothing to show here');
  });
  router.path('/accounts/', function() {
    var accounts = require('./accounts.js');
    var pages = ['newAccount', 'generateUserName', 'login', 'sendRecoveryEmail',
                 'recoverPassword', 'resetPassword'];
    for(var i=0; i<pages.length; i++) {
      var page = pages[i];
      this.get(page).bind(accounts[page]);
    }
  });
  return router;
};
