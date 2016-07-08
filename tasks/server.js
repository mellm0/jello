module.exports = function (gulp, $, $env) {
    var $defaults = $env.$defaults,
        startPhp = function(options, cb) {
            if(options && (!options.hasOwnProperty('php') || !$env.shell.which('php'))) {
                return false;
            }

            var host = options.php !== true && options.php.hasOwnProperty('host') ? options.php.host : $defaults.php.host,
                ini = options.php !== true && options.php.hasOwnProperty('ini') ? ' -c ' + options.php.ini : '',
                dir = options.php !== true && options.php.hasOwnProperty('dir') ? ' -t ' + options.php.dir : '',
                router = options.php !== true && options.php.hasOwnProperty('router') ? ' ' + options.php.router : '';

            $env.shell.exec('php -S ' + host + ini + dir + router, {async: true}, function() {
                if(cb) {
                    cb();
                }
            });

            return true;
        },
        startCaddy = function(options, cb) {
            if(options && (!options.hasOwnProperty('caddy') || !$env.shell.which('caddy'))) {
                return false;
            }

            var confFile = options.caddy !== true && options.caddy.hasOwnProperty('configuration_file') ? ' -conf=' + options.caddy.configuration_file : '',
                logTo = options.caddy !== true && options.caddy.hasOwnProperty('log_to') ? ' -log=' + options.caddy.log_to : '',
                port = options.caddy !== true && options.caddy.hasOwnProperty('port') ? ' -port ' + options.caddy.port : '',
                root = options.caddy !== true && options.caddy.hasOwnProperty('root') ? ' -root=' + options.caddy.root : '';

            $env.shell.exec('caddy ' + confFile + logTo + port + root, {async: true}, function() {
                if(cb) {
                    cb();
                }
            });

            return true;
        };

    // Start a browser sync server
    gulp.task('server', ['jekyll'], function (done) {
        var options = $env.project().hasOwnProperty('server') ? $env.project().server : $defaults.server.options,
            isPhp = startPhp(options),
            isCaddy = startCaddy(options);

        if(isPhp) {
            options.proxy = options.php !== true && options.php.hasOwnProperty('host') ? options.php.host : $defaults.php.host;
            options.open = true;
        }
        else if(isCaddy) {
            if(options.caddy === true) {
                options.proxy = '127.0.0.1:2015';
            }
            else {
                options.proxy = options.caddy.hasOwnProperty('bind_to') ? options.caddy.bind_to : '127.0.0.1';
                options.proxy += ':' + (options.caddy.hasOwnProperty('port') ? options.caddy.port : '2015');
            }
        }

        if(options.hasOwnProperty('proxy')) {
            options.proxy = {
                target: options.proxy,
                proxyReq: [
                    function (proxyRequest, message) {
                        if(!message || !message.hasOwnProperty('headers') || !message.headers.hasOwnProperty('host')) {
                            return;
                        }

                        proxyRequest.setHeader('X-BS-Proxy-Host', message.headers.host);
                    }
                ]
            };
        }

        $env.server(options, function () {
            $env.trigger('server:start', [this]);
            done();
        });
    });

    // Start a php server
    gulp.task('server:php', ['jekyll'], function (done) {
        var options = $env.project().hasOwnProperty('server') ? $env.project().server : $defaults.server.options;
        startPhp(options, done);
    });

    // Reload server
    gulp.task('server:reload', function (done) {
        $env.server.reload();
        done();
    });
};