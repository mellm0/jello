var $path = require("path"),
    $fs = require('fs'),
    $gUtils = require("gulp-util"),
    $note = require('node-notifier'),
    $sequence = require('run-sequence');

module.exports = function (gulp, $, $env) {
    var defaults = {
            privateKeyFile: '/.ssh/id_rsa'
        },
        exports = {},

        escapeRegExp = function(string) {
            return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
        },

        rtrim = function (str, charlist) {
            //  discuss at: http://phpjs.org/functions/rtrim/
            // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
            //    input by: Erkekjetter
            //    input by: rem
            // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
            // bugfixed by: Onno Marsman
            // bugfixed by: Brett Zamir (http://brett-zamir.me)
            //   example 1: rtrim('    Kevin van Zonneveld    ');
            //   returns 1: '    Kevin van Zonneveld'

            charlist = !charlist ? ' \\s\u00A0' : (charlist + '')
                .replace(/([\[\]\(\)\.\?\/\*\{\}\+\$\^\:])/g, '\\$1');
            var re = new RegExp('[' + charlist + ']+$', 'g');
            return (str + '')
                .replace(re, '');
        },

        home = function () {
            return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
        },

        parentDirectory = function () {
            return $path.join.apply(this, [__dirname, '..', '..', '..'].concat(Array.prototype.slice.call(arguments)));
        },

        parentFolderName = function () {
            return $path.basename(parentDirectory());
        },

        replaceVars = function (content, vars) {
            for (var $var in vars) {
                if (vars.hasOwnProperty($var)) {
                    content = content.replace(new RegExp(escapeRegExp('{$' + $var + '}'), 'g'), vars[$var]);
                }
            }

            return content;
        };

    // Remove trailing characters
    exports.rtrim = rtrim;

    // Get home directory
    exports.home = home;

    // Replaces vars with object if matching
    exports.replace_vars = replaceVars;

    // Attach private key file
    exports.attach_private_key = function (configuration) {
        if (!configuration.hasOwnProperty('privateKey')) {
            if (configuration.hasOwnProperty('privateKeyFile')) {
                configuration.privateKey = $fs.readFileSync(configuration.privateKeyFile);
            }
            else {
                configuration.privateKey = $fs.readFileSync(rtrim(home(), '/') + defaults.privateKeyFile);
            }
        }

        return configuration;
    };

    // Get merged files glob (or the opposite, depending on except)
    exports.get_merged_files = function (configuration, destDir, ext, except) {
        if (!ext) {
            ext = 'css';
        }
        var glob = [], dest;

        for (var key in configuration) {
            if (configuration.hasOwnProperty(key)) {
                dest = configuration[key].hasOwnProperty('file') ? configuration[key].file : key + '.' + ext;

                if (except) {
                    glob.push('!' + destDir + dest);
                }
                else {
                    glob.push(destDir + dest);
                }
            }
        }

        return glob;
    };

    // Append folder to all items in glob
    exports.append_folder_to_glob = function (folder, glob) {
        var except = [folder + '/', 'bower_components', 'node_modules', 'vendor'],
            newGlob = [];

        var fn = function (item) {
            for (var i = 0; i < except.length; i++) {
                if (item.substring(0, except[i].length) === except[i] || item.substring(0, except[i].length + 1) === '!' + except[i]) {
                    newGlob.push(item);
                    return;
                }
            }

            newGlob.push(item.charAt(0) === '!' ? '!' + folder + '/' + item.substring(1) : folder + '/' + item);
        };


        if (glob.constructor === Array) {
            glob.forEach(fn);
            return newGlob;
        }
        else {
            fn(glob);
            return newGlob.pop();
        }
    };

    // Send a notification to console, terminal and OSX
    exports.notify = function (message, important) {
        if (important) {
            $gUtils.beep();
            $gUtils.beep();
            message = $gUtils.colors.red.underline(message);
        }
        else {
            $gUtils.beep();
            message = $gUtils.colors.cyan(message);
        }

        $gUtils.log(message);
        $note.notify({message: message});
    };

    // Create args from JSON object
    exports.args_from_json = function (options, validOptions) {
        var args = [];

        for (var option in options) {
            if (options.hasOwnProperty(option)) {
                if (validOptions && validOptions.indexOf(option) === -1) {
                    continue;
                }

                if (options[option] === true) {
                    args.push('--' + option);
                }
                else if (Array.isArray(options[option])) {
                    for (var i = 0; i < options[option].length; i++) {
                        args.push('--' + option + "='" + options[option][i] + "'");
                    }
                }
                else if (options[option] !== false) {
                    args.push('--' + option + "='" + options[option] + "'");
                }
            }
        }

        return args;
    };

    // Apply to a single option or an array
    exports.apply_to_array_or_one = function (item, fn, done, sync) {
        var updates = 0, finished = 0, forceFinish = false, currentlyExecuting = false, finishedExecuting = [];

        var incrementUpdates = function () {
                updates++;
            },
            incrementFinished = function () {
                finishedExecuting.push(currentlyExecuting);
                currentlyExecuting = false;
                finished++;

                if (sync) {
                    onEachInArray();
                }
            },
            ifDone = function () {
                if (done && updates === finished) {
                    done(forceFinish);
                }
            },
            forceDone = function () {
                forceFinish = true;
            },
            eachFn = function (itemConfiguration) {
                fn(itemConfiguration, incrementUpdates, incrementFinished, ifDone, forceDone);
            },
            onEachInArray = function () {
                for (var i = 0; i < item.length; i++) {
                    if (forceFinish) {
                        break;
                    }
                    else if (finishedExecuting.indexOf(i) > -1) {
                        continue;
                    }

                    if (!sync || currentlyExecuting === false) {
                        if (sync) {
                            currentlyExecuting = i;
                        }

                        eachFn(item[i]);
                    }
                }
            };

        if (Array.isArray(item)) {
            onEachInArray();
        }
        else {
            eachFn(item);
        }

        if (done && (forceFinish || updates === 0)) {
            done(forceFinish);
        }
    };

    exports.merge_objects = function (objects) {
        if (!Array.isArray(objects))
            objects = Array.prototype.slice.call(arguments);

        if (objects.length === 1)
            return objects[0];

        var merged = {},
            i, key;

        if (objects.length === 0)
            return merged;

        for (i = 0; i < objects.length; i++) {
            for (key in objects[i]) {
                if (!objects[i].hasOwnProperty(key))
                    continue;

                merged[key] = objects[i][key];
            }
        }

        return merged;
    };

    // get the parent directory path
    exports.parent_directory = parentDirectory;

    // get the parent directory name
    exports.parent_folder = parentFolderName;

    // Run functions/tasks in sequence
    if (gulp) {
        $sequence.use(gulp);
    }

    exports.sequence = $sequence;

    // A pretty error handler
    exports.error_handler = function () {
        return $.plumber($.notify.onError("Error: <%= error.message %>"));
    };

    // Load an optional module
    exports.require = function (moduleName) {
        var module = null;

        try {
            module = require(moduleName);
        } catch (er) {
            module = null;
        }

        if (typeof module === 'undefined')
            module = null;

        return module;
    };

    // Functions related to config objects
    exports.config = {};

    exports.config.canDelete = function (configuration) {
        return configuration.hasOwnProperty('dest') || configuration.hasOwnProperty('delete');
    };

    exports.config.getDeleteGlob = function (configuration) {
        return configuration.hasOwnProperty('delete') ? configuration.delete : configuration.dest;
    };

    exports.config.add_filename = function (configuration, extension) {
        if (configuration.hasOwnProperty('filename'))
            return configuration;

        if (extension && !Array.isArray(configuration.dest) && configuration.dest.indexOf('.' + extension, configuration.dest.length - (extension.length + 1)) !== -1) {
            var destParts = configuration.dest.split('/');
            configuration.filename = destParts.pop();
            configuration.dest = destParts.join('/');
        }

        return configuration;
    };

    exports.get_sub_shelled_command = function (commands, folder) {
        if (folder)
            commands.unshift('cd ' + folder);

        return '(' + commands.join(' && ') + ')';
    };

    exports.get_relative_location_of_module = function (folder) {
        return folder.split('/').filter(function(v) { return v != '';}).map(function() { return '..'; }).join('/');
    };

    return exports;
};
