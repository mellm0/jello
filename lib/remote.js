var $ssh = require('ssh2'),
    $enquire = require('inquirer');

module.exports = function (gulp, $, $env) {
    var defaults = {
            options:        {
                include:   ['.htaccess'],
                exclude:   ['.DS_Store', '_notes', '.git', '.idea', '/_assets', '/assets', 'assets.json', 'bower.json', 'gulpfile.js', 'package.json', 'README.md', '/.*', 'bower_components', 'node_modules', '/cache', '*.bak', 'atlassian-ide-plugin.xml'],
                compress:  true,
                verbose:   true,
                recursive: true,
                relative:  true,
                update:    true,
                delete:    true,
                progress:  true,
                partial:   true
            },
            backupOptions:  {
                include: ['/.htaccess'],
                exclude: ['.backup.*']
            },
            validArguments: ['checksum', 'ignore-times', 'size-only', 'archive', 'recursive', 'backup', 'backup-dir', 'suffix', 'update', 'links', 'copy-unsafe-links', 'copy-links', 'safe-links', 'hard-links', 'perms', 'whole-file', 'owner', 'group', 'times', 'dry-run', 'sparse', 'one-file-system', 'existing', 'max-delete', 'delete', 'delete-excluded', 'filter', 'delete-after', 'ignore-errors', 'force', 'block-size', 'rsh', 'rsync-path', 'exclude', 'exclude-from', 'include', 'include-from', 'cvs-exclude', 'csum-length', 'temp-dir', 'compare-dest', 'compress', 'numeric-ids', 'timeout', 'daemon', 'no-detach', 'address', 'config', 'port', 'blocking-io', 'log-format', 'stats', 'partial', 'progress', 'password-file', 'bw-limit', 'read-batch', 'write-batch', 'itemize-changes']
        },
        $helpers = require("./helpers")(gulp, $, $env),
        $shell = $env.shell;

    var findTarget = function (target, overrides) {
            if (!$env.project().hasOwnProperty('targets') || !$env.project().targets.hasOwnProperty(target)) {
                return false;
            }// Check project for driver, or use a different driver specified in its settings (so you can use same
             // details for multiple drivers)
            else if ($env.project().targets[target].hasOwnProperty('target') && target != $env.project().targets[target].target) {
                if(overrides) {
                    for (var option in overrides) {
                        if (overrides.hasOwnProperty(option)) {
                            options[option] = overrides[option];
                        }
                    }
                }

                return findTarget($env.project().targets[target].target, overrides);
            }

            else {
                return $env.project().targets[target];
            }
        },

        dateForFiles = function () {
            return new Date().toISOString().replace(/[^a-z0-9]/gi, '_').toLowerCase();
        },

        escapeRegExp = function(string) {
            return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
        },

        replaceVars = function (content, vars) {
            for (var $var in vars) {
                if (vars.hasOwnProperty($var)) {
                    content = content.replace(new RegExp(escapeRegExp('{$' + $var + '}'), 'g'), vars[$var]);
                }
            }

            return content;
        },

        configHasOneOfArrayAsProperty = function (possibleProps, config) {
            for (var i = 0; i < possibleProps.length; i++) {
                if (config.hasOwnProperty(possibleProps[i])) {
                    return possibleProps[i];
                }
            }

            return false;
        },

        validRsyncArgs = function (options) {
            var args = [], i;

            for (var option in options) {
                if (options.hasOwnProperty(option)) {
                    if (option === 'port') {
                        args.push("--rsh='ssh -p" + options[option] + "'");
                    }

                    if (option === 'itemize-changes') {
                        args.push('--itemize-changes=');
                        continue;
                    }

                    if (defaults.validArguments.indexOf(option) === -1) {
                        continue;
                    }

                    if (options[option] === true) {
                        args.push('--' + option);
                    }
                    else if (Array.isArray(options[option])) {
                        for (i = 0; i < options[option].length; i++) {
                            args.push('--' + option + "='" + options[option][i] + "'");
                        }

                        if (options.hasOwnProperty(option + '-additional')) {
                            if (Array.isArray(options[option + '-additional'])) {
                                for (i = 0; i < options[option + '-additional'].length; i++) {
                                    args.push('--' + option + "='" + options[option + '-additional'][i] + "'");
                                }
                            }
                            else {
                                args.push('--' + option + "='" + options[option + '-additional'] + "'");
                            }
                        }
                    }
                    else if (options[option] !== false) {
                        args.push('--' + option + "='" + options[option] + "'");
                    }
                }
            }

            if (options.hasOwnProperty('rsync-args')) {
                if (Array.isArray(options['rsync-args'])) {
                    for (i = 0; i < options['rsync-args'].length; i++) {
                        args.push(options['rsync-args'][i]);
                    }
                }
                else {
                    args.push(options['rsync-args']);
                }
            }

            return args;
        },

        reverseSrcAndDest = function (configuration, overrides) {
            var options = JSON.parse(JSON.stringify(configuration));

            delete options.dest;
            delete options.host;
            delete options.username;
            delete options.src;
            delete options.srcHost;
            delete options.srcUsername;

            if (overrides) {
                for (var option in overrides) {
                    if (overrides.hasOwnProperty(option)) {
                        options[option] = overrides[option];
                    }
                }
            }

            options.src = configuration.dest;

            if (configuration.hasOwnProperty('host')) {
                options.srcHost = configuration.host;

                if (configuration.hasOwnProperty('username')) {
                    options.srcUsername = configuration.username;
                }
            }

            return options;
        },

        sync = function (configuration, callback, backups, noCommands) {
            if (backups && Array.isArray(backups) && configHasOneOfArrayAsProperty(configuration, backups)) {
                backup(configuration, callback, null, null, backups);
            }
            else if (backups && configuration.hasOwnProperty(backups)) {
                backup(configuration, callback, backups);
            }
            else {
                var option,
                    options = JSON.parse(JSON.stringify(defaults.options)),
                    pwd = $helpers.rtrim($shell.pwd(), '/'),
                    vars = {
                        'PWD':     pwd,
                        'HOME':    $helpers.home(),
                        'DATE':    dateForFiles(),
                        'PROJECT': $helpers.parent_folder(),
                        'TMPDIR':  process.env.TMPDIR,
                        'PROXY': $env.project().hasOwnProperty('server') && $env.project().server.hasOwnProperty('proxy') ? $helpers.rtrim($env.project().server.proxy.replace('http://', ''), '/') : ''
                    };

                for (option in configuration) {
                    if (configuration.hasOwnProperty(option)) {
                        options[option] = configuration[option];
                    }
                }

                var args = validRsyncArgs(options);

                if (options.hasOwnProperty('dest')) {
                    var dest = $helpers.rtrim(replaceVars(options.dest, vars), '/'),
                        src,
                        srcFolder = options.hasOwnProperty('src') ? $helpers.rtrim(replaceVars(options.src, vars), '/') + '/' : pwd + '/';

                    if (options.hasOwnProperty('host')) {
                        dest = options.host + ':' + dest;

                        if (options.hasOwnProperty('username')) {
                            dest = options.username + '@' + dest;
                        }
                    }
                    else {
                        dest = dest + '/';
                        $shell.exec('mkdir -p ' + dest);
                    }

                    if (options.hasOwnProperty('srcHost')) {
                        src = options.srcHost + ':' + srcFolder;

                        if (options.hasOwnProperty('srcUsername')) {
                            src = options.srcUsername + '@' + src;
                        }
                        else if (options.hasOwnProperty('username')) {
                            src = options.username + '@' + src;
                        }
                    }
                    else {
                        $shell.exec('mkdir -p ' + srcFolder);
                    }

                    var fullyRemote = options.srcHost && options.host,
                        remoteSettings = {};

                    if(fullyRemote) {
                        for(option in options) {
                            if(options.hasOwnProperty(option)) {
                                if(options.hasOwnProperty('src' + option.charAt(0).toUpperCase() + option.slice(1))) {
                                    remoteSettings[option] = options['src' + option.charAt(0).toUpperCase() + option.slice(1)];
                                }
                                else {
                                    remoteSettings[option] = options[option];
                                }
                            }
                        }
                    }

                    if (noCommands) {
                        // Both are destinations, so we are going to ssh into one to rsync to the other
                        if(fullyRemote) {
                            execute(['rsync ' + args.join(' ') + ' ' + srcFolder + ' ' + dest], remoteSettings, function (code, output) {
                                if (callback) {
                                    callback.apply(this, [dest, src, options, code, output]);
                                }
                            }, dest);
                        }
                        else {
                            $shell.exec('rsync ' + args.join(' ') + ' ' + src + ' ' + dest, function (code, output) {
                                if (callback) {
                                    callback.apply(this, [dest, src, options, code, output]);
                                }
                            });
                        }
                    }
                    else {
                        var afterCallback = function(output) {
                            $.util.beep();

                            if (output && remoteSettings.hasOwnProperty('itemize-changes') && typeof options['itemize-changes'] !== 'boolean') {
                                execute(
                                    ["echo '" + output + "' > " + options['itemize-changes']],
                                    options, after(dest, src, options, callback), dest
                                );
                            }
                            else {
                                after(dest, src, options, callback);
                            }
                        };

                        before(dest, src, options, function () {
                            if(fullyRemote) {
                                execute(['rsync ' + args.join(' ') + ' ' + srcFolder + ' ' + dest], remoteSettings, function (code, signal, stream, output) {
                                    afterCallback(output);
                                }, dest);
                            }
                            else {
                                $shell.exec('rsync ' + args.join(' ') + ' ' + src + ' ' + dest, function (code, output) {
                                    afterCallback(output);
                                });
                            }
                        });
                    }
                }
                else if (callback) {
                    callback();
                }
                else {
                    return false;
                }
            }
        },

        backup = function (configuration, callback, backupsProperty, noSync, onEachCb) {
            var backupOptions,
                backupsPropertyToUse = function () {
                    if (Array.isArray(backupsProperty)) {
                        return configHasOneOfArrayAsProperty(backupsProperty);
                    }
                    else {
                        return backupsProperty
                    }
                }(),
                options = reverseSrcAndDest(configuration, defaults.backupOptions),
                pwd = $helpers.rtrim($shell.pwd(), '/'),
                time = dateForFiles(),
                vars = {
                    'PWD':     pwd,
                    'HOME':    $helpers.home(),
                    'DATE':    time,
                    'PROJECT': $helpers.parent_folder(),
                    'TMPDIR':  process.env.TMPDIR,
                    'PROXY': $env.project().hasOwnProperty('server') && $env.project().server.hasOwnProperty('proxy') ? $helpers.rtrim($env.project().server.proxy.replace('http://', ''), '/') : ''
                },
                finished = 0,
                ifDone = function () {
                    if (finished >= options[backupsPropertyToUse].length) {
                        if (noSync && callback) {
                            callback();
                        }
                        else if (!noSync) {
                            sync(configuration, callback);
                        }
                    }
                };

            if(!options.hasOwnProperty(backupsPropertyToUse)) {
                if (noSync && callback) {
                    callback();
                }
                else if (!noSync) {
                    sync(configuration, callback);
                }

                return;
            }

            for (var i = 0; i < options[backupsPropertyToUse].length; i++) {
                backupOptions = options;

                for (var option in options[backupsPropertyToUse][i]) {
                    if (options[backupsPropertyToUse][i].hasOwnProperty(option)) {
                        backupOptions[option] = options[backupsPropertyToUse][i][option];
                    }
                }

                if (backupOptions.hasOwnProperty('host') || backupOptions.hasOwnProperty('srcHost')) {
                    backupOptions.dest = $helpers.rtrim(replaceVars(backupOptions.dest, vars), '/') + '/';

                    if (backupOptions.hasOwnProperty('itemize-changes')) {
                        if (backupOptions.hasOwnProperty('name')) {
                            backupOptions.dest = backupOptions.dest + backupOptions.name;
                        }
                    }
                    else {
                        backupOptions.dest = backupOptions.dest + time;
                    }

                    sync(options, function (dest, src, backupOptions, code, output) {
                        if (onEachCb) {
                            onEachCb(dest, src, backupOptions, code, output);
                        }

                        $helpers.notify(src + ' has been backed up to ' + dest);
                        finished++;

                        if (!backupOptions.hasOwnProperty('dry-run') && backupOptions.hasOwnProperty('itemize-changes')) {
                            execute(["echo '" + output + "' > " + dest + '.backup.' + time + '.txt'], backupOptions, ifDone, dest);
                        }
                        else {
                            ifDone();
                        }
                    }, null, true);
                }
                else {
                    backupOptions.dest = $helpers.rtrim(replaceVars(backupOptions.dest, vars), '/') + '/.backup.' + time + '.tar.gz';

                    $shell.exec('tar -zhcvf \'' + backupOptions.dest + '\' ' + backupOptions.src, function (backupOpts) {
                        if (onEachCb) {
                            onEachCb(backupOpts.dest, backupOpts.src, backupOpts);
                        }

                        $helpers.notify(backupOpts.src + ' has been backed up to ' + backupOpts.dest);
                        finished++;

                        ifDone();
                    }(backupOptions));
                }
            }
        },

        before = function (dest, src, configuration, callback) {
            executeCommands('dest-commands-before', 'src-commands-before', dest, src, configuration, callback);
        },

        after = function (dest, src, configuration, callback) {
            executeCommands('dest-commands-after', 'src-commands-after', dest, src, configuration, callback);
        },

        executeCommands = function (destCommandsKey, srcCommandsKey, dest, src, configuration, callback) {
            var all = 0,
                done = 0,
                ifDone = function () {
                    done++;

                    if (callback && done >= all) {
                        callback.apply(this, [dest, src, configuration]);
                    }
                };

            if (configuration.hasOwnProperty(destCommandsKey)) {
                all++;
            }

            if (configuration.hasOwnProperty(srcCommandsKey)) {
                all++;
            }

            if (configuration.hasOwnProperty(destCommandsKey)) {
                $.util.log('Executing commands on destination: ' + dest);
                execute(configuration[destCommandsKey], configuration, function () {
                    ifDone();
                }, dest);
            }

            if (configuration.hasOwnProperty(srcCommandsKey)) {
                $.util.log('Executing commands on source: ' + src);

                var srcConfiguration = JSON.parse(JSON.stringify(configuration));

                if (srcConfiguration.hasOwnProperty('srcHost')) {
                    srcConfiguration.destHost = configuration.host;
                    srcConfiguration.host = configuration.srcHost;
                }
                else {
                    srcConfiguration.host = null;
                }

                execute(srcConfiguration[srcCommandsKey], srcConfiguration, function () {
                    ifDone();
                }, dest);
            }

            if (!all) {
                ifDone();
            }
        },

        execute = function (commands, configuration, callback, dest, execSettings) {
            if (commands && commands.length) {
                var commandsVars = {
                    'PWD':     $helpers.rtrim($shell.pwd(), '/'),
                    'DEST':    configuration.dest,
                    'SRC':     configuration.src,
                    'HOME':    $helpers.home(),
                    'TMPDIR':  process.env.TMPDIR,
                    'DATE':    dateForFiles(),
                    'PROJECT': $helpers.parent_folder(),
                    'PROXY': $env.project().hasOwnProperty('server') && $env.project().server.hasOwnProperty('proxy') ? $helpers.rtrim($env.project().server.proxy.replace('http://', ''), '/') : ''
                };

                for (var i = 0; i < commands.length; i++) {
                    commands[i] = replaceVars(replaceVars(commands[i], commandsVars), commandsVars);
                }

                configuration = JSON.parse(JSON.stringify(configuration));

                if (configuration.hasOwnProperty('host') && configuration.host) {
                    if (configuration.hasOwnProperty('dry-run')) {
                        $.util.log('Will execute the following commands on ' + dest + "\n" + commands.join("\n"));

                        if (callback) {
                            callback.apply(this);
                        }
                    }
                    else {
                        configuration = $helpers.attach_private_key(configuration);

                        if(!dest)
                            dest = configuration.username + '@' + configuration.host + ':' + '~';

                        if(!execSettings)
                            execSettings = {};

                        var Client = $ssh.Client,
                            client = new Client(),
                            fn = execSettings.hasOwnProperty('shell') ? 'shell' : 'exec',
                            passwordFromPrompt = '',
                            startClient = function() {
                                client.on('ready', function () {
                                    $helpers.notify('Connected to: ' + dest);
                                    client[fn](commands.join(' && '), execSettings, function (err, stream) {
                                        if (err) {
                                            throw err;
                                        }

                                        var usePassword = false, buffer = '';

                                        stream
                                            .on('close', function (code, signal) {
                                                console.log('Connection closed');
                                                client.end();

                                                if (callback) {
                                                    callback.apply(this, [code, signal, stream, buffer]);
                                                }
                                            }).on('data', function (data) {
                                                if (!usePassword && data.trim() === '[sudo] password for ' + configuration.username + ':') {
                                                    if(execSettings.sudoPassword)
                                                        stream.write(execSettings.sudoPassword + '\n');
                                                    else if(configuration.password)
                                                        stream.write(configuration.password + '\n');
                                                    else if(passwordFromPrompt)
                                                        stream.write(passwordFromPrompt + '\n');
                                                    else {
                                                        console.log('No password detected. Please pass a password using --pass=""');
                                                        stream.close();
                                                    }
                                                    buffer = '';
                                                    usePassword = true;
                                                } else if(data.toString().trim() === 'Sorry, try again.') {
                                                    console.log('No password detected. Please pass a password using --pass=""');
                                                    stream.close();
                                                } else if(data.toString().trim()) {
                                                    console.log('STDOUT: ' + data);
                                                    buffer += data.toString();
                                                }
                                            }).on('error', function (data) {
                                                console.log('STDERR: ' + data);
                                            }).stderr.on('data', function (data) {
                                                console.log('STDERR: ' + data);
                                            });
                                    });
                                }).connect(configuration);
                            };

                        if(commands.join(' && ').indexOf('sudo') !== -1) {
                            execSettings.pty = true;
                            process.stdout.write('\033c');
                            $enquire.prompt([{
                                type: "password",
                                message: "Enter your password for admin privileges to this target",
                                name: "password"
                            }], function(answers) {
                                passwordFromPrompt = answers.password;
                                startClient();
                            });
                        }
                        else {
                            startClient();
                        }
                    }
                }
                else if (configuration.hasOwnProperty('dry-run')) {
                    $.util.log('Will execute the following commands in current directory' + "\n" + commands.join("\n"));

                    if (callback) {
                        callback.apply(this);
                    }
                }
                else {
                    $shell.exec(commands.join(' && '), function (code, output) {
                        if (callback) {
                            callback.apply(this, [code, output]);
                        }
                    });
                }
            }
        };

    // Check if git is available
    exports.is_available = function () {
        if (!$shell.which('rsync')) {
            $helpers.notify('Rsync is not installed.');
            return false;
        }

        return true;
    };

    // Find a target from the project settings
    exports.find_target = findTarget;

    // Collect rsync args that are valid
    exports.rsync_args = validRsyncArgs;

    // Backup a folder according to settings
    exports.backup = backup;

    // Remote sync a folder according to settings
    exports.sync = sync;

    // Execute on a configuration
    exports.execute = execute;

    // Reverse the source and destination
    exports.reverse_src_and_dest = reverseSrcAndDest;

    return exports;
};