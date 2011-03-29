/*

Copyright (c) 2011, Steven Thurlow
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of Steven Thurlow nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

define(function() {
	if (!Math.sign) {
		// Todo: compare this method with if (>0) 1; if (<0) -1; 0;
		// Todo: consider negative and positive zero, infinity
		Math.sign = function(x) { if (isFinite(x)) {return (x / Math.abs(x) || 0)} throw "Write your own damn Math.sign(x)."; };
	}
	
	function nthOrderError(i, arr, order, seeds) {
		if (order > 0) {
			return nthOrderError(i, arr, order-1, seeds) - nthOrderError(i-1, arr, order-1, seeds);
		}
		else {
			if (i >= 0) return arr[i];
			else return (seeds[seeds.length + i] || 0);
		}
	}

	function nthOrderPrediction(i, arr, order, seeds) {
		function val(i) { return (arr[i] || seeds[seeds.length + i] || 0); }
		if (order == 0)
			return 0;
		if (order == 1)
			return val(i-1);
		if (order == 2)
			return 2*val(i-1) - val(i-2);
		if (order == 3)
			return 3*val(i-1) - 3*val(i-2) + val(i-3);
	}
	
	return {
		quantize: function(samples, bits) {
			//var err = 0;
			var steps = Math.pow(2, bits) / 2;
			var stepSize = 1 / steps;
			
			return Array.prototype.map.call(samples, function(curr, i, out) {
				//var val = (curr + err) / stepSize;
				var val = curr / stepSize;
				if (val >= 0) val = Math.round(val >= steps ? steps - 1 : val);
				else val = Math.round(val < -steps ? -steps : val);

				//err = curr + err - val * stepSize;
				return val;
			});
		},
		unquantize: function(samples, bits, method) {
			
			var steps = Math.pow(2, bits) / 2;
			var stepSize = dataFrame.range / steps;

			return Array.prototype.map.call(samples, function(curr, i, out) {
				return curr * stepSize;
			});
		},
		quantizationMethods: {
			adaptive: null,
			fixed: null
		},
		unquantizationMethods: {
			adaptive: null,
			fixed: null
		},
		muLaw: function(x, bits) {
			var mu = Math.pow(2, bits) - 1;
			return Math.sign(x) * (Math.log(1 + mu * Math.abs(x)) / Math.log(1 + mu));
		},
		inverseMuLaw: function(x, bits) {
			var mu = Math.pow(2, bits) - 1;
			return Math.sign(x) * (1 / mu) * (Math.pow(1 + mu, Math.abs(x)) - 1);
		},
		predict: function(samples, order, seeds) {
			seeds = seeds || [];
			return Array.prototype.map.call(samples, function(curr, i, out) {
				return nthOrderError(i, out, order, seeds);
			});
		},
		restore: function(samples, order, seeds) {
			return Array.prototype.map.call(samples, function(curr,i,input) { 
				return (nthOrderPrediction(i, output, order, seeds) + curr); 
			});
		}
	};
});
