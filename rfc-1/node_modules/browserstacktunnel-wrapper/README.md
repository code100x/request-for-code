node-BrowserStackTunnel
=======================

[![Build Status](https://travis-ci.org/pghalliday/node-BrowserStackTunnel.png)](https://travis-ci.org/pghalliday/node-BrowserStackTunnel)
[![Dependency Status](https://gemnasium.com/pghalliday/node-BrowserStackTunnel.png)](https://gemnasium.com/pghalliday/node-BrowserStackTunnel)

A Node.js wrapper for the BrowserStack tunnel client. On first run this will download the appropriate binary for your platform from BrowserStack. On Windows this will be a Jar file and you will need to have Java already installed.

http://www.browserstack.com/

## Installation

```
npm install browserstacktunnel-wrapper
```

## API

```javascript
var BrowserStackTunnel = require('browserstacktunnel-wrapper');

var browserStackTunnel = new BrowserStackTunnel({
  key: YOUR_KEY,
  hosts: [{
    name: 'localhost',
    port: 8080,
    sslFlag: 0
  }], // optionally set hosts
  osxBin: 'your_bin_dir', // optionally override the default bin directory for the OSX binary
  linux32Bin: 'your_bin_dir', // optionally override the default bin directory for the Linux 32 bit binary
  linux64Bin: 'your_bin_dir', // optionally override the default bin directory for the Linux 64 bit binary
  win32Bin: 'your_bin_dir', // optionally override the default bin directory for the win32 binary
  localIdentifier: 'my_tunnel', // optionally set the -localIdentifier option
  v: true, // optionally set the -v (verbose) option
  proxyUser: PROXY_USER, // optionally set the -proxyUser option
  proxyPass: PROXY_PASS, // optionally set the -proxyPass option
  proxyPort: PROXY_PORT, // optionally set the -proxyPort option
  proxyHost: PROXY_HOST, // optionally set the -proxyHost option
  force: false, // optionally set the -force option
  forcelocal: false, // optionally set the -forcelocal option
  onlyAutomate: false, // optionally set the -onlyAutomate option
  enableLoggingForApi: true // optionally set the -enable-logging-for-api option
});

browserStackTunnel.start(function(error) {
  if (error) {
    console.log(error);
  } else {
    // tunnel has started
    
    browserStackTunnel.stop(function(error) {
      if (error) {
        console.log(error);
      } else {
        // tunnel has stopped
      }
    });
  }
});
```

## Roadmap

- Nothing yet

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using `npm test`.

## License
Copyright &copy; 2014 Peter Halliday  
Licensed under the MIT license.

[![Donate Bitcoins](http://i.imgur.com/b5BZsFH.png)](bitcoin:17LtnRG4WxRLYBWzrBoEKP3F7fZx8vcAsK?amount=0.01&label=grunt-mocha-test)

[17LtnRG4WxRLYBWzrBoEKP3F7fZx8vcAsK](bitcoin:17LtnRG4WxRLYBWzrBoEKP3F7fZx8vcAsK?amount=0.01&label=grunt-mocha-test)
