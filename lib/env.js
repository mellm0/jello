var $server = require('browser-sync'),
    $delete = require('del'),
    $shell = require('shelljs'),
    $mergeStream = require("merge-stream"),
    $gUtils = require("gulp-util");

module.exports = function(gulp, $) {
    var defaults = {
            configFile: 'assets.json',
            modulesUrl: 'http://packages.dev/modules.json',
            modulesUrlSettings: {
                auth: {
                    user: 'milkyway',
                    pass: 'secret'
                }
            }
        },
        exports = {},
        settings = {},
        $helpers = require("./helpers")(gulp, $);

    var getConfigFile = function() {
            var args = Array.prototype.slice.call(arguments);

            if(!args.length)
                args.push(defaults.configFile);

            return $helpers.parent_directory.apply(this, args);
        },
        getAllConfigurations = function (callback) {
            var configs = [$env];

            if(!loadedModules) {
                buildModules(function ($modules) {
                    for (var module in $modules) {
                        if ($modules.hasOwnProperty(module)) {
                            configs.push($modules[module]);
                        }
                    }

                    loadedModules = true;

                    if(callback)
                        callback($env, configs);
                });
            }
            else {
                for (var module in $modules) {
                    if ($modules.hasOwnProperty(module)) {
                        configs.push($modules[module]);
                    }
                }

                if(callback)
                    callback($env, configs);
            }

            return configs;
        },
        addFolderToAllVars = function (folder, configuration) {
            var variables = ['css', 'js', 'images', 'html', 'copy'],
                globs = ['all', 'src', 'dest', 'lint'];

            variables.forEach(function (variable) {
                if (configuration.hasOwnProperty(variable)) {
                    globs.forEach(function (glob) {
                        if (configuration[variable].hasOwnProperty(glob))
                            configuration[variable][glob] = $helpers.append_folder_to_glob(folder, configuration[variable][glob]);
                    });
                }
            });

            return configuration;
        },
        buildModules = function (callback) {
            if ($gUtils.env.ignoreModules) {
                if (callback) callback();
            }
            else {
                var modules = ($env.hasOwnProperty('git') && $env.git.hasOwnProperty('modules')) ? $env.git.modules : {},
                    updateModules = function (mods) {
                        for (var name in mods) {
                            if ((
                                !$gUtils.env.module || $gUtils.env.module == name
                                ) && mods.hasOwnProperty(name)) {
                                var configFile = getConfigFile(name, defaults.configFile);

                                if ($shell.test('-d', name) && $shell.test('-f', configFile)) {
                                    delete require.cache[require.resolve(configFile)];
                                    $modules[name] = require(configFile);
                                    configFiles.push(configFile);
                                    $modules[name].configurationFile = configFile;
                                    $modules[name] = addFolderToAllVars(name, $modules[name]);
                                }
                                else {
                                    $modules[name] = {};
                                }

                                $modules[name].moduleFolder = name;

                                for (var modOption in mods[name]) {
                                    if (mods[name].hasOwnProperty(modOption)) {
                                        $modules[name][modOption] = mods[name][modOption];
                                    }
                                }
                            }
                        }
                    };

                if (Object.keys(modules).length) {
                    updateModules(modules);
                    if(callback) callback(modules);
                }
                else if ($env.modulesUrl || defaults.modulesUrl) {
                    var url = $env.modulesUrl ? $env.modulesUrl : defaults.modulesUrl;

                    require('request')(
                        url,
                        $env.modulesUrlSettings ? $env.modulesUrlSettings : defaults.modulesUrlSettings,
                        function (error, response, body) {
                            if (!error && response.statusCode == 200) {
                                modules = JSON.parse(body);
                                updateModules(modules);
                                if(callback) callback(modules);
                            }
                            else {
                                $helpers.notify('No modules found at url: ' + url);
                                if(callback) callback(modules);
                            }
                        });
                }
                else {
                    if(callback) callback(modules);
                }
            }
        };

    var configFiles = [getConfigFile()],
        $modules = {},
        loadedModules = false;

    var $env = $shell.test('-f', configFiles[0]) ? require(configFiles[0]) : {};

    // Get project environment
    exports.project = function () {
        return $env;
    };

    // Get all configurations, including modules
    exports.start = getAllConfigurations;

    // Set an environment var
    exports.set = function(key, value) {
        settings.key = value;
    };

    // Get an environment var
    exports.get = function(key) {
        return settings.hasOwnProperty(key) ? settings[key] : null;
    };

    // Refresh the configuration for env
    exports.refresh = function (callback) {
        var currConfig = $gUtils.env.config ? $gUtils.env.config : configFile,
            moduleConfigFile;

        delete require.cache[require.resolve(getConfigFile(currConfig))];
        $env = require(getConfigFile(currConfig));

        for (var module in $modules) {
            if ($modules.hasOwnProperty(module) && $modules[module].hasOwnProperty(['configurationFile'])) {
                moduleConfigFile = $modules[module].configurationFile;

                delete require.cache[require.resolve(getConfigFile(moduleConfigFile))];
                $modules[module] = require(getConfigFile(moduleConfigFile));
                $modules[module].configurationFile = moduleConfigFile;
            }
        }

        return getAllConfigurations(callback);
    };

    // Add folder to all specific configuration variables
    exports.add_folder_to_all_vars = addFolderToAllVars;

    // Build modules configuration
    exports.build_modules = buildModules;

    // Execute a function on all configurations (no streaming)
    exports.apply_to_all = function (fn, done) {
        getAllConfigurations(function(env, configs) {
            var updates = 0, finished = 0;

            var incrementUpdates = function () {
                    updates++;
                },
                incrementFinished = function () {
                    finished++;
                },
                ifDone = function () {
                    if (done && updates === finished)
                        done();
                },
                configFn = function (configuration) {
                    if (!configuration)
                        configuration = env;

                    fn(configuration, incrementUpdates, incrementFinished, ifDone);
                };

            for (var i = 0; i < configs.length; i++) {
                configFn(configs[i]);
            }

            if (done && updates === 0)
                done();
        });
    };

    // Execute a function and return a merged stream (must be called after env has started)
    exports.apply_to_all_and_stream = function (fn, done) {
        var streams = [],
            configs = getAllConfigurations(),
            addToStream = function (stream) {
                streams.push(stream)
            },
            configFn = function (configuration) {
                if (!configuration)
                    configuration = env;

                fn(configuration, addToStream);
            };

        for (var i = 0; i < configs.length; i++) {
            configFn(configs[i]);
        }

        return streams.length ? $mergeStream(streams) : done ? done() : null;
    };

    // shell in a parent directory
    $shell.cd($helpers.parent_directory());
    exports.shell = $shell;

    // Serve an environment wide browser
    exports.server = $server;

    // Delete from parent directory
    exports.delete = $delete;

    // Get settings of environment
    exports.settings = settings;

    // Get loaded configuration files
    exports.configuration_files = configFiles;

    return exports;
};