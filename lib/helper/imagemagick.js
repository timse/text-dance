"use strict";

// FFMPEG helper to extract frames from video files
// thats pretty much all this thing can do

var exec = require("child_process").exec;
var fmt = require("util").format;

var convert = exports.convert = function(file1, quality, file2, cb){

	var cmd = fmt( "convert %s -quality %s %s", file1, quality, file2 );

	exec(cmd, cb);
};





