(function(window) {
	"use strict";

	var assign      = Object.assign;
	var Fn          = window.Fn;
	var AudioObject = window.AudioObject;

	var debug = true;

	var defaults = {
		tick:   4,
		tock:   1,
		note:   72,
		source: {}
	};

	// Event types.
	//
	// [time, "tick"]
	// [time, "tock"]

	var types = {
		'tick': function(time, event, destination, metronome, audio) {
			// Schedule audio
			destination.start(time, metronome.note + 5, 1);

			// Schedule event for visual feedback 
			setTimeout(function() {
				metronome.trigger('tick');
			}, (time - audio.currentTime - 0.003) * 1000);

			// Log in timeline
			if (debug && Soundstage.inspector) {
				Soundstage.inspector.drawEvent(audio.currentTime, time, 'tick', 72);
			}
		},

		'tock': function(time, event, destination, metronome, audio) {
			// Schedule audio
			destination.start(time, metronome.note, 0.5);

			// Schedule event for visual feedback 
			setTimeout(function() {
				metronome.trigger('tock');
			}, (time - audio.currentTime - 0.003) * 1000);

			// Log in timeline
			if (debug && Soundstage.inspector) {
				Soundstage.inspector.drawEvent(audio.currentTime, time, 'tock', 60);
			}
		},

		'stop': function(time, event, destination, metronome, audio) {
			destination.stop(time);
		}
	};

	function createTickSequence(tick, tock) {
		var n = tock === 0 ? -tick : -tock ;

		var stream = Fn(tock === 0 ?
			function ticktock() {
				if (stream.status === "done") { return; }
				var beat = n += tick;
				return [beat, 'tick'];
			} :
			function ticktock() {
				if (stream.status === "done") { return; }
				var beat = n += tock;
				var type = n % tick === 0 ? "tick" : "tock" ;
				return [beat, type];
			}
		);

		return stream;
	}

	function Metronome(audio, clock, options) {
		var metronome = this;
		var settings  = assign({}, defaults, options);
		var source    = AudioObject.Tick(audio, settings.source);
		var state     = 'stopped';
		var tick, tock, cuestream;

		function schedule(time, event) {
			if (state === 'stopped' || clock.state === 'stopped') { return; }
			if (!types[event[1]]) { return; }
			types[event[1]](time, event, source, metronome, audio);
		}

		function start(time, tick, tock) {
			var ticks = createTickSequence(tick, tock);

			cuestream && cuestream.stop(time);
			state = 'started';

			cuestream = clock
			.create(ticks)
			.each(function(event) {
				schedule(event[0], event);
			})
			.start(time);
		}

		function stop(time) {
			cuestream && cuestream.stop(time);
			cuestream = undefined;
			state   = 'stopped';
		}

		Object.defineProperties(this, {
			state: {
				get: function() { return state; },
				enumerable: true
			},

			tick: {
				get: function() {
					return tick;
				},

				set: function(n) {
					if (tick === n) { return; }
					tick = n;
					if (state === 'stopped') { return; }
					start(clock.timeAtBeat(Math.ceil(clock.beatAtTime(audio.currentTime))), tick, tock);
				},

				// Support observe via get/set
				configurable: true
			},

			tock: {
				get: function() {
					return tock;
				},

				set: function(n) {
					if (tock === n) { return; }
					tock = n;
					if (state === 'stopped') { return; }
					start(clock.timeAtBeat(Math.ceil(clock.beatAtTime(audio.currentTime))), tick, tock);
				},

				// Support observe via get/set
				configurable: true
			}
		});

		this.start = function(time, tick, tock) {
			time = time || audio.currentTime;
			start(time, tick, tock);
		};

		this.stop = function(time) {
			time = time || audio.currentTime;
			stop(time);
		};

		this.tick   = settings.tick;
		this.tock   = settings.tock;
		this.note   = settings.note;
		this.source = source;

		// Connect source to the audio destination
		AudioObject.getOutput(source).connect(audio.destination);

		// Plot output on debug timeline if it's available
		if (Soundstage.inspector) {
			Soundstage.inspector.drawAudioFromNode(AudioObject.getOutput(source));
		}

		if (settings.state === 'started') { this.start(); }
	}

	assign(Metronome.prototype, mixin.events);

	// Export

	window.Metronome = Metronome;

})(this);