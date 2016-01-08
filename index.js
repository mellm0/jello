'use strict';

var $path = require("path"),
    $ = require('gulp-load-plugins')({
        config: $path.join(__dirname, 'package.json')
    });

module.exports = function (gulp, settings) {
    settings = settings || {};

    var $env = require('./lib/env')(gulp, $, settings);

    if (!gulp) {
        gulp = require('gulp');
    }

    if (!settings.hasOwnProperty('tasks')) {
        settings.tasks = [
            './tasks/watchers',
            './tasks/deploy',
            './tasks/utilities',
            './tasks/server',
            './tasks/css',
            './tasks/js',
            './tasks/images',
            './tasks/sprites',
            './tasks/html',
            './tasks/jekyll',
            './tasks/copy',
            './tasks/build',
            './tasks/install',
            './tasks/update',
            './tasks/git',
            './tasks/targets'
        ];
    }

    // Some fixes to gulp for handling errors
    // @TODO: To be removed in Gulp 4
    var origSrc = gulp.src;
    gulp.src = function () {
        return fixPipe(origSrc.apply(this, arguments));
    };
    function fixPipe(stream) {
        var origPipe = stream.pipe;
        stream.pipe = function (dest) {
            arguments[0] = dest.on('error', function (error) {
                var nextStreams = dest._nextStreams;
                if (nextStreams) {
                    nextStreams.forEach(function (nextStream) {
                        nextStream.emit('error', error);
                    });
                } else if (dest.listeners('error').length === 1) {
                    throw error;
                }
            });
            var nextStream = fixPipe(origPipe.apply(this, arguments));
            (this._nextStreams || (this._nextStreams = [])).push(nextStream);
            return nextStream;
        };
        return stream;
    }

    //$env.start(function () {
    //    for(var i=0;i<tasks.length;i++) {
    //        require(tasks[i])(gulp, $, $env);
    //    }
    //});

    for (var i = 0; i < settings.tasks.length; i++) {
        require(settings.tasks[i])(gulp, $, $env);
    }
};