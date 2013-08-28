{{polyfill.rAF}}

;(function(window, document){

	var frameCounter = 0;
	var freqCounter = 0;
	var frameLength = {{animate.loop}};
	var freqLength = {{animate.freq}};
	var container = document.querySelector('.sprites');
	var frame, freq;
	(function animate(){
		requestAnimationFrame(animate);
		frame = frameCounter%frameLength;
		freq = freqCounter%freqLength;

		/* always increment freqCounter */
		freqCounter = (freqCounter + 1) % freqLength;

		/* only proceed to new frame if there is one */
		if(freq===0){

			/* Start/restart loop */
			if(frame === 0){
				container.className = 'sprites';
			}else{ /* Show next frame */
				container.className += ' f-'+frame;
			}
			/* proceed to next frame */
			frameCounter = (frameCounter + 1) % frameLength;
		}
	}());

}(window, window.document));

