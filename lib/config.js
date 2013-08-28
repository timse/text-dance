"use strict";

var path = require('path');

var config = module.exports = {};


// Default settings
// These are used to fill up user defined settings
config.options = {

	/* Frames per second as desired for the animation
	 * these are also used for the frame extraction from the video
	 */
	fps: 6,

	/* Format to use in the final image export
	 * Currently supports:
	 *  - jpe?g
	 *  - png
	 *
	 *  when jpg is used 'quality' can be specified aswell
	 */
	format: 'png',


	/* Quality for the images in the final export
	 * Only works with jpg as format
	 *
	 * The default is 70 which offers a good deal between size and quality imho
	 */
	quality: 70,


	/* classname that gets added to the wrapper-iframe (in case u want to give it some styling
	 * if provided this will be just added as is to the 'className' property of the iframe, so if u want more than one class just add them space separated.
	 * e.g.: 'classname-1 classname-2 classname-3'
	 */
	className: 'text-dance',

	// tolerances used during diff-calculation
	tolerance:{
		/* absolute difference threshold between two r, g or b values
		 * of a rgb value of a pixel when compared with each other
		 *
		 * e.g.:
		 * you compare two frames,
		 * frame1 has the rgba value (120, 155, 211, 90) at position x=1, y=1
		 * or r = 120, g = 155, b = 211, a = 90
		 *
		 * for frame 2 to be different at least one of the 4 values (r, g, b or a) must be more or less of the threshold given here.
		 * 9 worked fine for me most of the time so i set it as default
		 * this is just my best guess, so play around with it as much as u like
		 * */
		color: 9,



		/* allowed gap between two differce points to still belong to the same cluster
		 * assume the following field of calculated differences between two frames
		 * where 'X' means 'no difference' and 'O' means different pixel
		 *
		 * XXXXXXX
		 * XOXXXXX
		 * XXOXXXX
		 * XXXXOXX
		 *
		 * if cluster is zero (0) then it will only check the direct surroundings
		 * so the point at (2,1) will find the point(3,2) and they will form a cluster
		 * point (5,4) will not be added to the cluster because its not within the direct surroundings. To add it, u would have to set this option two 1 (add one more 'round' around this point. Now the point is within the reach for point (3,2) which is also connected to point (2,1) anyways.
		 *
		 * these clusters are later used to calculate rectangles that then are directly used as sprites. So playing around with this setting can dramatically decrease the amount of distinct images within the sprite and therefor less html is needed which results in smoother animation if u have a ton of differences. This can even dramatically lower the size of the whole thing so its worth to play around with it
		 * */
		cluster: 0,



		 /* threshold of difference points a cluster must have to not be considered noise
		  *
		 * */
		points: 10

	},

	/* if specified, the iframe will not just be appended to the body
	 * but append it to the anchor instead
	 * (untill onready but at least once, if the anchor still doesnt exist after that, screw you) */
	anchor: ''
};

config.fmt = {
	dataImage: 'data:image/%s;base64,%s',
	frame: {
		selector: '.f-%s > .f-%s',
		css: '%s{display: block !important;}'
	},
	sprite: {
		/* filename for export in node-spritesheet
		 * filename gets used as a class selector for the specific sprite
		 * the final output for this looks something like this
		 * s-1-12.png where '1' is the frame and '12' the difference cluster in this frame
		 */
		file: 's-%s.png',

		/* complete selector used for this sprite later
		 * e.g.: we have again difference 12 in frame 1 then the final selector will look like this:
		 * 		.f-1.s-1-12.f
		 *
		 * 	 - '.f' stands for 'frame' (so we can access all frames at once)
		 * 	 - '.f-1' stands for frame 1, where this sprite belongs to
		 * 	 - '.s-1-12' stands for sprite for difference 12 in frame 1
		 */
		selector: '.s-%s.f-%s.s',

		/* css injected to position the sprite at its desired location
		 * the first %s containts the selector as defined above
		 * the 2/3 %s the left/top-values for the current boundary
		 */
		css: '%s{left:%spx;top:%spx;',

		/*  this regex is used to find the selector that is automatically used by node-spritesheet as defined by the file
		 *  it then gets replaced by the css as defined above, injecting additional selectors and css properties
		 * */
		regex: '\.s\-%s[^\\d\\n]+',

		html: '<div class="s-%s f-%s s"></div>'
	}
};

config.sprite = {
	files: {
		image: 'sprite.png',
		css: 'sprite.css',
		background: 'sprite-background.png'
	},
	fmt: {
	},
	selector: '.s'
};

config.template = {
	rAF: path.resolve(__dirname, './template/rAF-polyfill.js'),
	animate: path.resolve(__dirname, './template/animate.js'),
	content: path.resolve(__dirname, './template/content.html'),
	wrapper: path.resolve(__dirname, './template/wrapper.js'),
	css: path.resolve(__dirname, './template/style.css')
};

