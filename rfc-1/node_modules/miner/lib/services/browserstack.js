// http://www.browserstack.com/BrowserStackTunnel.jar
// https://github.com/pghalliday/node-BrowserStackTunnel

var BrowserStackTunnel = require('browserstacktunnel-wrapper');

module.exports = function (config, callback) {
  if (!config.hosts) {
    config.hosts = [
      {
        name: 'localhost',
        port: config.port,
        sslFlag: 0
      }
    ];
  }

  var tunnel = new BrowserStackTunnel(config);

  tunnel.start(function (error) {
    if (error) {
      return callback(error);
    }

    tunnel.kill = function (cb) {
      cb = cb || function () {
      };
      tunnel.stop.call(this, cb);
    };

    callback(null, 'http://localhost:' + config.hosts[0].port, tunnel);
  });
};
