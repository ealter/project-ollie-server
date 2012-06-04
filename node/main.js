var http = require('http');
var router = require('./router').createRouter();

http.createServer(function (request, response) {
  var body = '';
  request.on('data', function (chunk) {
    body += chunk;
  });

  request.on('end', function() {
    router.handle(request, body, function (route) {
      response.writeHead(route.status, route.headers);
      response.end(route.body);
    });
  });
}).listen(80);

console.log('The server is running');
