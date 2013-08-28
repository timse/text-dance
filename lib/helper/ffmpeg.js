"use strict";

// FFMPEG helper to extract frames from video files
// thats pretty much all this thing can do

var exec = require("child_process").exec;
var fmt = require("util").format;

var videoToFrames = exports.videoToFrames = function(video, fps, dir, cb){

	var cmd = fmt( "ffmpeg -i %s -ss 1 -f image2 -q:v %s -vf \"fps=fps=%s\" %s/frameShots%03d.%s",
		video,
		1, // we export in highest quality, we can screw this up later (:
		fps,
		dir,
		"png" // always take png, we need good quality here
	);

	exec(cmd, cb);
};





