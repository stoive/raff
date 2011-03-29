define(['lib/riff', 'lib/audio'], function(riff, audio){
	return {
		encode: function(bitrate, channels, sampleRate) {
			if (!Array.isArray(channels)) {
				throw "argument exception";
			};
			sampleRate = sampleRate || 44100;
			var dataLength = channels.length * channels[0].length * bitrate / 8;

			// quantize
			if (bitrate == 8 || bitrate == 16) {
				channels = channels.map(function(curr) {
					return audio.quantize(curr, bitrate);
				});
			}
			if (bitrate == 8) {
				// convert to signed int
				channels = channels.map(function(curr) {
					return curr.map(function(curr2) {
						return curr2 + 128;
					});
				});
			}
			
			// size = format field + chunk1 header + chunk1 body + chunk2 header + chunk2 body
			var riffCk = new riff.Chunk("RIFF", 4 + 8 + 16 + 8 + dataLength)
			
			// Format field
			riffCk.ckData.setUint8(0, ("W").charCodeAt(0));
			riffCk.ckData.setUint8(1, ("A").charCodeAt(0));
			riffCk.ckData.setUint8(2, ("V").charCodeAt(0));
			riffCk.ckData.setUint8(3, ("E").charCodeAt(0));
			
			// fmt  chunk
			fmtCk = new riff.Chunk("fmt ", 16, riffCk.ckData.buffer, riffCk.ckData.byteOffset + 4);
			// AudioFormat: PCM
			fmtCk.ckData.setInt16(0, 1, true);
			// NumChannels
			fmtCk.ckData.setInt16(2, channels.length, true);
			// SampleRate
			fmtCk.ckData.setInt32(4, sampleRate, true);
			// ByteRate (bytes per second)
			fmtCk.ckData.setInt32(8,  sampleRate * channels.length * bitrate % 8, true);
			// BlockAlign (sample frame size)
			fmtCk.ckData.setInt16(12, channels.length * sampleRate % 8, true);
			// BitsPerSample (bits in each channel sample)
			fmtCk.ckData.setInt16(14, bitrate, true);
			
			var dataCk = new riff.Chunk("data", dataLength, riffCk.ckData.buffer, fmtCk.ckData.byteOffset + fmtCk.ckData.byteLength);
			//sequence into frames
			
			var writeMethod;
			if (bitrate == 8) {
				writeMethod = DataView.prototype.setUint8;
			}
			else if (bitrate == 16) {
				writeMethod = DataView.prototype.setInt16;
			}
			else if (bitrate == 32) {
				writeMethod = DataView.prototype.setInt32;
			}
			var n = 0;
			for (var i = 0; i < channels[0].length; i++) {
				for (var j = 0; j < channels.length; j++) {
					writeMethod.call(dataCk.ckData, n * (bitrate / 8), channels[j][i], true);
					n++;
				}
			}
			return riffCk.ckData.buffer;
		},
		decode: function(blob) {
		}
	};
});
