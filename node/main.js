var http = require('http');
var router = require('./router').createRouter();

var port = process.argv[2] || 1337;
http.createServer(function (request, response) {
  var body = '';
  request.on('data', function (chunk) {
    body += chunk;
    if (body.length > 5e5) {
      //flood attack or faulty client... nuke request
      request.connection.destroy();
    }
  });

  request.on('end', function() {
    router.handle(request, body, function (route) {
      response.writeHead(route.status, route.headers);
      response.end(route.body);
    });
  });
}).listen(port);

console.log('The server is running at port ' + port);

