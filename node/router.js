var journey = require('journey');

exports.createRouter = function () {
  var router = new (journey.Router);
  router.get('/').bind(function (req, res) {
    res.send('Nothing to show here');
  });
  router.path('/accounts/', function() {
    var accounts = require('./accounts.js');
    var pages = ['newAccount', 'generateUserName', 'login', 'sendRecoveryEmail',
                 'recoverPassword', 'resetPassword', 'logout', 'facebookLogin',
                 'changeUserName'];
    var pageFunctions = accounts.pages;
    for(var i=0; i<pages.length; i++) {
      var page = pages[i];
      this.post(page).bind(pageFunctions[page]);
      this.get(page).bind(pageFunctions[page]);
    }
  });
  return router;
};
