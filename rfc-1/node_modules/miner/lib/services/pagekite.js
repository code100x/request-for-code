// https://pagekite.net/
var spawn = require('child_process').spawn;

module.exports = function(config, callback) {
	var url = config.domain || config.name + '.pagekite.me';
	var pagekite = spawn(config.executable || 'pagekite.py', [ config.port || 80,  url]);
	var buffer = '';
	var cb = function() {
		if(callback) {
			callback.apply(this, arguments);
			callback = null;
		}
	};
	var timeout = setTimeout(function() {
		pagekite.kill('SIGHUP');
		cb(new Error('Process timed out'));
	}, config.timeout || 30000);

	pagekite.on('exit', function(code) {
		if(code !== 0) {
			cb(new Error('Pagkekite process exited with ' + code + '\n'));
		}
	});

	pagekite.stdout.on('data', function(data) {
		buffer += data.toString();
		if(buffer.match(new RegExp('bid=http:' + url)) !== null) {
			clearTimeout(timeout);
			cb(null, 'http://' + url, pagekite);
		}
	});

	pagekite.stderr.on('data', function(data) {
		console.error('PAGEKITE ERROR: ' + data.toString());
	});
};
