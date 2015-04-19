'use strict';

var $path = require("path"),
    $ = require('gulp-load-plugins')({
        config: $path.join(__dirname, 'package.json')
    });

module.exports = function (gulp, tasks) {
    var $env = require('./lib/env')(gulp, $);

    if (!gulp) {
        gulp = require('gulp');
    }

    if (!tasks) {
        tasks = [
            './tasks/watchers',
            './tasks/deploy',
            './tasks/build',
            './tasks/utilities',
            './tasks/server',
            './tasks/css',
            './tasks/js',
            './tasks/images',
            './tasks/sprites',
            './tasks/html',
            './tasks/jekyll',
            './tasks/copy',
            './tasks/install',
            './tasks/update',
            './tasks/git',
            './tasks/targets'
        ];
    }

    //$env.start(function () {
    //    for(var i=0;i<tasks.length;i++) {
    //        require(tasks[i])(gulp, $, $env);
    //    }
    //});

    for (var i = 0; i < tasks.length; i++) {
        require(tasks[i])(gulp, $, $env);
    }
};