'use strict';

var $ = require('gulp-load-plugins')();

module.exports = function(gulp, tasks) {
    var $env = require('./lib/env')(gulp, $);

    if(!gulp)
        gulp = require('gulp');

    if(!tasks) {
        tasks = [
            './tasks/utilities',
            './tasks/server',
            './tasks/build',
            './tasks/watchers',
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
            './tasks/targets',
            './tasks/deploy'
        ];
    }

    //$env.start(function () {
    //    for(var i=0;i<tasks.length;i++) {
    //        require(tasks[i])(gulp, $, $env);
    //    }
    //});

    for(var i=0;i<tasks.length;i++) {
        require(tasks[i])(gulp, $, $env);
    }
};