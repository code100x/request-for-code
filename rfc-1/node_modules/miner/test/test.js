var assert = require('assert');
var connect = require('connect');
var request = require('request');
var os = require('os');
var BrowserStack = require('browserstack');

var miner = require('../lib/miner.js');

describe("Miner test suite", function () {
  var isTravis = process.env.TRAVIS === 'true';
  var responseContent = 'Echo!\n';
  var port = 1337;
  var server;

  before(function (done) {
    server = connect().use(function (req, res) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(responseContent);
    }).listen(port).on('listening', done);
  });

  after(function (done) {
    server.close(done);
  });

  describe('Default', function () {
    it('Creates a default URL', function (done) {
      miner.local({}, function (err, url) {
        assert.equal(url, 'http://localhost');
        done();
      });
    });

    it('Uses custom port and reaches host', function (done) {
      miner.local({ port: port }, function (error, url) {
        assert.ok(!error);
        assert.equal(url, 'http://localhost:' + port);
        request(url, function (error, response, body) {
          assert.ok(!error);
          assert.equal(body, responseContent);
          done();
        });
      });
    });

    it('Uses OS hostname', function (done) {
      miner.local({
        port: port,
        useOsHostname: true
      }, function (error, url) {
        assert.ok(!error);
        assert.equal(url, 'http://' + os.hostname() + ':' + port);

        // Travis won't let us access os.hostname(), only localhost
        if (isTravis) {
          return done();
        }

        request(url, function (error, response, body) {
          assert.ok(!error);
          assert.equal(body, responseContent);
          done();
        });
      });
    });
  });

  describe('Localtunnel', function () {
    it('Opens localtunnel, returns URL', function (done) {
      miner.localtunnel({
        port: port
      }, function (error, url, tunnel) {
        assert.ok(!error);
        assert.ok(url.indexOf('loca.lt') !== -1);
        request(url, function (error, response, body) {
          assert.ok(!error);
          assert.equal(body, responseContent);
          tunnel.kill();
          done();
        });
      });
    });
  });

  describe.skip('Browserstack', function () {
    it('Starts Browserstack tunnel, VM makes request to local server', function (done) {
      var otherPort = 1339;
      var client = BrowserStack.createClient({
        username: process.env.BROWSERSTACK_USER,
        password: process.env.BROWSERSTACK_PASSWORD
      });
      var tunnel = null;

      connect().use(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Browserstack Server\n');
        tunnel.kill();
        done();
      }).listen(otherPort).on('listening', function () {
        miner.browserstack({
          port: otherPort,
          key: process.env.BROWSERSTACK_KEY
        }, function (error, url, browserstackTunnel) {
          tunnel = browserstackTunnel;
          assert.ok(!error);
          client.createWorker({
            os: 'win',
            browser: 'ie',
            version: '10.0',
            url: url
          }, function (error) {
            assert.ok(!error);
          });
        });
      });
    });
  });

  // TODO figure out how to set up Pagekite in Travis CI
  describe.skip('Pagekite', function () {
    it('Opens pagekite, returns URL', function (done) {
      miner.pagekite({
        name: 'miner',
        port: port
      }, function (error, url, process) {
        assert.ok(!error);
        assert.ok(url.indexOf('pagekite.me') !== -1);
        request(url, function (error, response, body) {
          assert.ok(!error);
          assert.equal(body, responseContent);
          process.kill();
          done();
        });
      });
    });
  });
});
