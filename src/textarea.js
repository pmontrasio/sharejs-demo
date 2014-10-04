"use strict";

// import the Connect middleware (http://www.senchalabs.org/connect/)
var Duplex = require("stream").Duplex;
var connect = require("connect");
var http = require("http");
var serveStatic = require("serve-static");
var browserChannel = require("browserchannel").server;
var livedb = require("livedb");

// create a ShareJS server with no persistence
var backend = livedb.client(livedb.memory());
backend.submit("textareas", "textarea1", { create: { type: "text", data: "Come here with two browsers and type" } },
	      function (err, version, transformedByOps, snapshot) {
		console.log("Created document. Err:" + err + ". Version: " + version);
	      }
	     );
var sharejs = require("share");
var share = sharejs.server.createClient({ backend: backend });

var app = connect();
// attach a static file server that serves files from our static directory
app.use(serveStatic(__dirname + "/../static"));
app.use(serveStatic(sharejs.scriptsDir));
app.use(browserChannel({ cors: "*" }, function (client) {
  var stream = new Duplex({ objectMode: true });

  stream._read = function () {};
  stream._write = function (chunk, encoding, callback) {
    if (client.state !== "closed") {
      client.send(chunk);
    }
    callback();
  };

  client.on("message", function (data) {
    stream.push(data);
  });

  client.on("close", function (reason) {
    stream.push(null);
    stream.emit("close");
  });

  stream.on("end", function() {
    client.close();
  });

  // Give the stream to sharejs
  return share.listen(stream);
}));


// create a Connect server
var server = http.createServer(app);

// set our server port and start the server
var port = 5000;
server.listen(port, function () { console.log("Listening on " + port); });
