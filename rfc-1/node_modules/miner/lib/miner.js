var os = require('os');

exports.localtunnel = require('./services/localtunnel');
exports.pagekite = require('./services/pagekite');
exports.browserstack = require('./services/browserstack');
exports.local = function(config, callback) {
	var hostname = config.hostname || (config.useOsHostname ? os.hostname() : 'localhost');
	var url = 'http://' + hostname +  (config.port ? ':' + config.port : '');
	callback(null, url);
};
