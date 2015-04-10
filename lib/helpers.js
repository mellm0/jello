var defaults = {
    privateKeyFile: '/.ssh/id_rsa',
};

var $path = require("path"),
    $fs = require('fs'),
    $gUtils = require("gulp-util"),
    $note = require('node-notifier');

module.exports = function() {
    var exports = {},
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
        };

    // Remove trailing characters
    exports.rtrim = rtrim;

    // Get home directory
    exports.home = home;

    // Attach private key file
    exports.attach_private_key = function (configuration) {
        if (!configuration.hasOwnProperty('privateKey')) {
            if (configuration.hasOwnProperty('privateKeyFile'))
                configuration.privateKey = $fs.readFileSync(configuration.privateKeyFile);
            else
                configuration.privateKey = $fs.readFileSync(rtrim(home(), '/') + defaults.privateKeyFile);
        }

        return configuration;
    };

    // Get merged files glob (or the opposite, depending on except)
    exports.get_merged_files = function (configuration, destDir, ext, except) {
        if (!ext) ext = 'css';
        var glob = [], dest;

        for (var key in configuration) {
            if (configuration.hasOwnProperty(key)) {
                dest = configuration[key].hasOwnProperty('file') ? configuration[key].file : key + '.' + ext;

                if (except)
                    glob.push('!' + destDir + dest);
                else
                    glob.push(destDir + dest);
            }
        }

        return glob;
    };

    // Append folder to all items in glob
    exports.append_folder_to_glob = function (folder, glob) {
        var except = [folder + '/', '!' + folder + '/', 'bower_components', 'node_modules', 'vendor'],
            newGlob = [];

        var fn = function (item) {
            for (var i = 0; i < except.length; i++) {
                if (item.substring(0, except[i].length) === except[i])
                    return item;
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
        }
        else {
            $gUtils.beep();
        }

        console.log(message);
        new $note().notify({message: message});
    };

    // Create args from JSON object
    exports.args_from_json = function (options, validOptions) {
        var args = [];

        for (var option in options) {
            if (options.hasOwnProperty(option)) {
                if (validOptions && validOptions.indexOf(option) === -1)
                    continue;

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
    exports.apply_to_array_or_one = function (item, fn, done) {
        var updates = 0, finished = 0, forceFinish = false;

        var incrementUpdates = function () {
                updates++;
            },
            incrementFinished = function () {
                finished++;
            },
            ifDone = function () {
                if (done && updates === finished)
                    done(forceFinish);
            },
            forceDone = function() {
                forceFinish = true;
            },
            eachFn = function (itemConfiguration) {
                fn(itemConfiguration, incrementUpdates, incrementFinished, ifDone, forceDone);
            };

        if (Array.isArray(item)) {
            for (var i = 0; i < item.length; i++) {
                if(forceFinish)
                    break;

                eachFn(item[i]);
            }
        }
        else {
            eachFn(item);
        }

        if (forceFinish || updates === 0)
            done(forceFinish);
    };

    // get the parent directory
    exports.parent_directory = parentDirectory;

    return exports;
};