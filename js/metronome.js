(function(window) {
	"use strict";

	var assign      = Object.assign;
	var Fn          = window.Fn;
	var AudioObject = window.AudioObject;
	var Event       = window.SoundstageEvent;

	var debug = true;

	var defaults = {
		duration: 0.03125,
		tick:     72,
		tock:     64,
		source: {}
	};


	function Metronome(audio, settings, sequencer, options) {
		var metronome = this;
		var settings  = assign({}, defaults, options);
		var source    = AudioObject.Tick(audio, settings.source);
		var buffer    = [];
		var playing   = false;
		var stream;


		// Private

		function generate(t1, t2) {
console.log(t1, t2);
			var b1 = sequencer.beatAtTime(t1);
			var b2 = sequencer.beatAtTime(t2);
			var beat = Math.ceil(b1);
			var tick = metronome.tick;
			var tock = metronome.tock;
			var time, event;

			buffer.length = 0;

			while (beat < b2) {
				event = Event(beat, 'note', sequencer.barAtBeat(beat) % 1 === 0 ? tick : tock, 1, settings.duration);
				buffer.push(event);
				++beat;
			}

			return buffer;
		}

		// Public

		this.start = function start(time) {
			var stream = sequencer.create(generate, source).start(time || audio.currentTime);

			stream.then(function(t) {
				if (!playing) { return; }
console.log('HEYYYY', t);
				start(0);
			});

			playing = true;
		}

		this.stop = function stop(time) {
			playing = false;
			stream.stop(time || audio.currentTime);
		}

		this.tick = settings.tick;
		this.tock = settings.tock;

		// Setup

		// Connect source to the audio destination
		AudioObject.getOutput(source).connect(audio.destination);

		// Plot output on debug timeline if it's available
		if (Soundstage.inspector) {
			Soundstage.inspector.drawAudioFromNode(AudioObject.getOutput(source));
		}

		if (settings.state === 'started') { this.start(); }
	}

	assign(Metronome.prototype);

	// Export

	window.Metronome = Metronome;

})(this);