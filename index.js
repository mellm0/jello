'use strict';

var $env = require('./lib/env'),
    $ = require('gulp-load-plugins')();

module.exports = function(gulp, tasks) {
    if(!gulp)
        gulp = require('gulp');

    if(!tasks) {
        tasks = [
            './tasks/utilities',
            './tasks/server',
            './tasks/css',
            './tasks/js',
            './tasks/images',
            './tasks/sprites',
            './tasks/html',
            './tasks/jekyll',
            './tasks/copy',
            './tasks/git'
        ];
    }

    $env.start(function () {
        for(var i=0;i<tasks.length;i++) {
            require(tasks[i])(gulp, $, $env);
        }
    });
};