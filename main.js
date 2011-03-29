require.ready(function(){
	var ac = new AudioContext();
	var aisn = ac.createAudioInputSourceNode();
	var samples = [];var Wav;
	var data;
	var write = true;
	aisn.onaudioprocess = function(event) {
		if (samples.length < 100000) {
			samples = samples.concat(Array.prototype.slice.call(event.inputBuffer.getChannelData(0)))
		}
		else if (write) {
			write=false;
			require(['types/audio/wav'], function(wav) {
				Wav=wav;
				data = Wav.encode(16, [samples]);
				var a = document.createElement('a');
				a.innerText = "Listen to the last " + (100000 / 44100) + "seconds of audio as a WAV file";
				var base64 = "";
				var ui8a = new Uint8Array(data);
				for (var i = 0; i < ui8a.length; i++) {
					var byte = ui8a[i].toString(16);
					base64 += "%" + (byte.length == 1 ? "0" : "") + byte;
				}
				a.href = "data:audio/wav," + base64;
				document.body.appendChild(a);
			});
		}
	};
});
