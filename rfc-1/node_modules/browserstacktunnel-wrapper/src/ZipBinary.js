var path = require('path'),
    https = require('https'),
    unzip = require('unzipper'),
    fs = require('fs'),
    HttpsProxyAgent = require('https-proxy-agent');

function ZipBinary(platform, arch, bin, ext) {
  'use strict';

  var self = this;
  self.bin = bin || path.resolve(path.join(__dirname, '..', 'bin', arch ? path.join(platform, arch) : platform));
  self.path = path.resolve(path.join(self.bin, 'BrowserStackLocal' + (ext ? '.' + ext : '')));
  self.command = self.path;
  self.args = [];

  self.update = function (config, callback) {
    var extractStream = unzip.Extract({
      path: self.bin
    });

    var proxy = null;
    if (config.proxyHost && config.proxyPort) {
      config.proxyProtocol = config.proxyProtocol || 'http';
      var proxyAuth = (config.proxyUser && config.proxyPass) ?
          (encodeURIComponent(config.proxyUser) + ':' + encodeURIComponent(config.proxyPass) + '@') : '';
      proxy = config.proxyProtocol + '://' + proxyAuth + config.proxyHost + ':' + config.proxyPort;
    }

    var options = {
      hostname: 'www.browserstack.com',
      port: 443,
      path: '/browserstack-local/BrowserStackLocal-' + platform + (arch ? '-' + arch : '') + '.zip',
      method: 'GET',
      agent: (proxy) ? new HttpsProxyAgent(proxy) : null
    };

    https.get(options, function (response) {
      console.log('BrowserStackTunnel: download binary for ' + platform + (arch ? '-' + arch : '') + ' ...');
      extractStream.on('close', function () {
        console.log('BrowserStackTunnel: download complete');
        console.log('BrowserStackTunnel: chmod 0755 binary');
        fs.chmod(self.path, '0755', callback);
      });
      response.pipe(extractStream);
    });
  };
}

module.exports = ZipBinary;
