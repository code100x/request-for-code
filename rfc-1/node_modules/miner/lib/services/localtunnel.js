var localtunnel = require('localtunnel');

// http://localtunnel.me
module.exports = function (config, callback) {
  localtunnel(config.port, config, function (err, tunnel) {
    if (err) {
      return callback(err);
    }

    tunnel.kill = tunnel.close;

    callback(null, tunnel.url, tunnel);
  });
};
