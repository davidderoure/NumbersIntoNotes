//
// NumbersIntoNotes.js
//
// Javascript interactive demo for the Ada Lovelace Symposium, 
// in which number sequences are converted into notes.
//
// This is a single page application designed for a standalone demo using 
// a laptop and widescreen display, so it assumes keyboard and mouse (and 
// audio) rather than small touchscreen devices - however bootstrap
// enables to work pretty well in a desktop browser. For the demo
// it was designed to be run offline (e.g. it can run off a USB stick).
// It can also be run from a web server, in which case the page can be
// loaded online and then saved in the browser to use for an offline demo.
// It has been developed and tested in entirely in Chrome.
// 
// Optionally it can POST to CGI scripts, to generate musical notation 
// and standard MIDI files, using Lilypond and csvmidi respectively.  
// The sofware to do this can be installed on a remote server, or on the 
// local machine in order to make the export functionality available for 
// demo purposes.  Two POST actions in the HTML need to be edited to point 
// at the appropriate server.
//
// David De Roure, December 2015
// This version released February 2016
//
// This file is organised in 6 sections
//
// Section 1 - generating number sequence       STAGE 1
// Section 2 - reducing modulo n                STAGE 2
// Section 3 - displaying number roll           STAGE 3
// Section 4 - interacting with mapping table
// Section 5 - playing audio
// Section 6 - exporting			STAGE 4

// globals for all sections

var maxSeqLen = 256;	// Default length of several generated number sequences 
			// and piano roll, 256 allows for 32 bars of 1/8 beats
var seqLen = 0;		// Actual length, set in Section 1

var algorithm = "";	// name of generating algorithm, used in metadata
var parameters = [];	// parameters, used in metadata

// Use <script src="big.js"></script>

var seq = [];		// The array of numbers (these are Big)
Big.E_POS = 50;		// Set big number notation to 50 digits

// Section 1 - Generating number sequence
//
// In the original demo this was achieved using the Fourmilab 
// emulator/simulator for the analytical engine.
//
// Here we use arbitrary precision arithmetic, because Javascript
// uses 64bit integer or 64 bit float with 53 binary digit significand, 
// while the analytical engine design had 40 or 50 decimal digits 
// (equivalent to 167 bits).
//
// For example, these are the factorials that can and can't be stored:
// 
// 20! = 2432902008176640000
// 10000111000011011001110111110010000010101101000000000000000000
// 19 decimal digits (62 binary digits - fits in 64 bit integer)
//
// 22! = 1124000727777607680000
// 22 decimal digits, 70 binary (51 before zeros - fits in 64 bit float)
//
// 41! = 33452526613163807108170062053440751665152000000000
// 50 decimal digits (165 binary digits)
// 
// 42! = 1405006117752879898543142606244511569936384000000000
// 52 decimal digits (170 binary digits)
// 
// 99999999999999999999999999999999999999999999999999
// 50 decimal digits (167 binary digits)
//

// Mathematical functions (recurrence relations)
// These functions generate ascending sequences which
// will be reduced modulo mod in stage 2.

// Generate sequence ax + d
// a and d are obtained from DOM where they must be numbers

function doArithmetic() {
    var a = Number(document.getElementById("a").value);
    var d = Number(document.getElementById("d").value);

    seqLen = maxSeqLen;

    seq[0] = Big(a);
    for (var i=1; i < seqLen; i++) {
       seq[i] = seq[i-1].plus(d);
    }
    displaySequence();
    algorithm = "Arithmetic progression";
    parameters = [["a", a], ["d", d]];
}

function doFactorial() {
    seqLen = maxSeqLen;
    seq[0] = Big(1);
    for (var i=1; i < seqLen; i++) {
       seq[i] = seq[i-1].times(i);
    }
    displaySequence();
    algorithm = "Factorial";
    parameters = [];
}

function doTriangle() {
    seqLen = maxSeqLen;
    seq[0] = Big(1);
    for (var i=1; i < seqLen; i++) {
       seq[i] = seq[i-1].plus(i + 1);
    }
    displaySequence();
    algorithm = "Triangular";
    parameters = [];
}

// Generate sequence F(n+1) = kF(n) + F(n-1)
// n0, n1 and k are obtained from DOM where they must be numbers
// k is corrected if out of range 1-99

function doFibonacci() {
    seqLen = maxSeqLen;
    var n0 = Number(document.getElementById("n0").value);
    var n1 = Number(document.getElementById("n1").value);
    var k = Number(document.getElementById("k").value);

    if (k < 1) { k = 1; document.getElementById("k").value = 1; } 
    else if (k > 99) { k = 99; document.getElementById("k").value = 99; } 

    seq[0] = Big(n0);
    seq[1] = Big(n1);

    for (var i=2; i < seqLen; i++) {
       seq[i] = (seq[i-1].times(k)).plus(seq[i-2]);
    }
    displaySequence();
    algorithm = "Fibonacci";
    parameters = [["n0", n0],["n1", n1],["k", k]];
}

// Generate sequence F(n+1) = F(n) + F(n-1) + F(n-2)
// n0, n1 and n2 are obtained from DOM where they must be numbers

function doTribonacci() {
    seqLen = maxSeqLen;
    var n0 = Number(document.getElementById("t0").value);
    var n1 = Number(document.getElementById("t1").value);
    var n2 = Number(document.getElementById("t2").value);

    seq[0] = Big(n0);
    seq[1] = Big(n1);
    seq[2] = Big(n2);

    for (var i=3; i < seqLen; i++) {
       seq[i] = seq[i-1].plus(seq[i-2]).plus(seq[i-3]);
    }
    displaySequence();
    algorithm = "Tribonacci";
    parameters = [["n0", n0],["n1", n1],["n2", n2]];
}

// Generate sequence of base^i where i=0,1,..
// base is obtained from DOM and corrected if out of range 2-99

function doPowers() {
    seqLen = maxSeqLen;
    var b = Number(document.getElementById("base").value);

    if (b < 2) { b = 2; document.getElementById("base").value = 2; } 
    else if (b > 99) { b = 99; document.getElementById("base").value = 99; } 

    seq[0] = Big(1);
    for (var i=1; i < seqLen; i++) {
       seq[i] = seq[i-1].times(b);
    }
    displaySequence();
    algorithm = "Power";
    parameters = [["base", b]];
}

// Generate all the primes up to n using Sieve of Eratosthenes
// n is provided in the function call else defaults to 0
// which means generate maxSeqLen primes.
//
// But how big should the seive be for maxSeqLen primes?
// The prime number theorem gives us pi(x) = x / (log x  - 1) primes below x
// Legendre published in 1798 x/(log x - 1.08366)
//
// Here are some useful values using Legendre
// pi(512) = 99
// pi(1024) = 175
// pi(1610) = 256
// pi(2048) = 313
// pi(3640) = 512
// pi(4096) = 566
// pi(8000) = 1012
// pi(8103) = 1024
// pi(8192) = 1033
// pi(8800) = 1100
// pi(10000) = 1231

// We observe that to generate n primes then a seive of 8n will be big
// enough till we get to about n = 1100
// If we want 128 primes we will seive 1024 which will generate 175
// If we want 256 primes we will seive 2048 which will generate 313
// If we want 512 primes we will seive 4096 which will generate 566
// If we want 1024 primes we will seive 8192 which will generate 1033

// Using Wolfram I have determined a better estimate by solving
// pi(x) for x={8,16,32,64,128,256,512,1024,2048}
// then fitting a quadratic
//
// fit quadratic {8,19},{16,53},{32,131},{64,311},{128,719},{256,1619},{512,3671},{1024,8161},{2048,17863}
//
// 0.000803121x^2 + 7.15392x - 132.177

function doPrimes(n) {
    if (isNaN(n) || n < 0) { n = 0; }

    // if n is zero we want maxSeqLen primes, so we set sievesize
    // to be more than enough.  A factor of 8 is an overapproximation 
    // till maxSeqLen is at least 1024

    var sievesize = n ? n : 8 * maxSeqLen; 
    var primes = [];

    // We start at i=1 to return 1 as a prime. These days we'd start at 2.

    for (var i=1; i < sievesize; i++) {
        primes[i] = true;
    }
    // mark multiples of primes as false

    var maxi = Math.sqrt(sievesize);

    for (var i=2; i < maxi; i++) {
        if (primes[i] === true) {
            for (var j = i * i; j < sievesize; j += i) {
                primes[j] = false;
            }
        }
    }

    // copy n true primes into seq

    var i = 1;
    var j = 0;

    while (i < sievesize && j < maxSeqLen) {
        if (primes[i] === true) {
            seq[j++] = Big(i);
        }
        i++;
    }
    seqLen = j;
    displaySequence();
    algorithm = "Primes";
    parameters = [];
}

// Mathematical functions with bounded values (e.g. digits, periodic).
// The default modulus value in the DOM is set to one more than
// the upper bound.

// Generate sinusoidal numbers a + a.sin(r.theta) where theta is in degrees
// e.g. With a = 12 and r = 5 we get a sine wave of period 72 and
// value ranging from 0 to 24 (cf mod 25, 2 chromatic octaves).
// a and r are obtained from DOM where they must be numbers.
// Default modulus is set to default to 2a+1 unless a>63 when the 
// amplitude needs manual modulo reduction.

function doSin() {
    var a = Number(document.getElementById("amplitude").value);
    var r = Number(document.getElementById("r").value) * Math.PI / 180;

    seqLen = maxSeqLen;

    for (var i=0; i < seqLen; i++) {
       seq[i] = Big(Math.round(a + (a * Math.sin(r * i))));
    }
    displaySequence();
    if (a > 63) {
        document.getElementById("modulus").value = a + a + 1;
    }
    algorithm = "Sin";
    parameters = [["a", a],["r", r]];
}

// Generate random number between 0 and n-1
// n is obtained from DOM and corrected if out of range 2-999

function doRandom() {
    var n = Number(document.getElementById("random").value);

    if (n < 2) {
        n = 2;
        document.getElementById("random").value = 2;
    } else if (n > 999) {
        n = 999;
        document.getElementById("random").value = 999;
    } 
    
    seqLen = maxSeqLen;

    for (var i=0; i < seqLen; i++) {
       seq[i] = Big(Math.floor(Math.random() * n));
    }
    document.getElementById("modulus").value = n;
    displaySequence();
    algorithm = "Random";
    parameters = [["n", n]];
}

// Generate 1D random walk.  Note the term "random walk" was introduced in 1905.
// Uses same value from DOM as random, to set range (rows) of grid.
// Finishes when hits boundary or at maxseqlen and sets seqlen accordingly.

function doRandomWalk() {
    var n = Number(document.getElementById("random").value);

    if (n < 2) {
        n = 2;
        document.getElementById("random").value = 2;
    } else if (n > 999) {
        n = 999;
        document.getElementById("random").value = 999;
    } 
    
    seqLen = maxSeqLen;

    var x = Math.floor(n/2);
    seq[0] = Big(x);
    var i;

    for (i=1; i < seqLen; i++) {
       x += Math.random() < 0.5 ? -1 : 1;    // toss coin
       if (x < 0 || x == n) { break; }
       seq[i] = Big(x);
    }

    seqlen = i;

    document.getElementById("modulus").value = n;
    displaySequence();
    algorithm = "Random Walk";
    parameters = [["n", n]];
}

// Generate random walk using intervals chosen by dice roll.
// There is no particular historical basis for this, but it
// is introduced in order to discuss probabilities of note transitions
// and therefore Markov (who was born just after Lovelace died).
// Perhaps a nod also to Mozart and dice but that was different.
// The idea here is to roll two dice, one counts the note up in pitch and 
// the other counts down.  This limits the size of heptatonic intervals 
// within the octave and favours smaller intervals (you could analyse music
// from the time of Lovelace to find out what probabilities they might have
// used instead):
// 
//  0  1,1 2,2 3,3 4,4 5,5 6,6  -  6 ways, probability 6 in 36 = 1/6  ~ 17% (17%)
// +1  2,1 3,2 4,3 5,4 6,5      -  5 ways, probability 5 in 36 = 5/36 ~ 14% (28%)
// +2  3,1 4,2 5,3 6,4          -  4 ways, probability 4 in 36 = 1/9  ~ 11% (22%)
// +3  4,1 5,2 6,3              -  3 ways, probability 3 in 36 = 1/12 ~ 8%  (17%)
// +4  5,1 6,2                  -  2 ways, probability 2 in 36 = 1/18 ~ 6%  (11%)
// +5  6,1                      -  1 way,  probability 1 in 36 = 1/36 ~ 3%  ( 6%)
// 
// Uses same value from DOM as random, to set range (rows) of grid.
// Resets to start position when hits boundary, continues to maxSeqLen
// For range of 10 the average chain length empirically seems to be 7 
// For range of 21 the average chain length empirically seems to be 24 ish
// For range of 42 the average chain length empirically seems to be 85 ish
// For range of 84 the average chain length empirically seems to be 320 ish
// For range of 100 the average chain length empirically seems to be 450 ish

function doDiceWalk() {
    var n = Number(document.getElementById("random").value);

    if (n < 2) {
        n = 2;
        document.getElementById("random").value = 2;
    } else if (n > 999) {
        n = 999;
        document.getElementById("random").value = 999;
    } 
    
    var x = Math.floor(n/2);	// starting position is half way up
    seq[0] = Big(x);
    var updice, downdice;	// calculated separately so rolls could be displayed
    
    seqLen = maxSeqLen;

    for (i=1; i < maxSeqLen; i++) {
       updice = Math.floor(Math.random() * 6) + 1;
       downdice = Math.floor(Math.random() * 6) + 1;
       x += updice - downdice;
       if (x < 0 || x >= n) { 
            seqLen = i; 
            x = Math.floor(n/2); 
       }
       seq[i] = Big(x);
    }

    document.getElementById("modulus").value = n;
    displaySequence();
    algorithm = "Dice";
    parameters = [["n", n]];
}

// Calculate pi using the Machin formula.  The last digits will be dodgy but
// this is retained to make the point (and it can easily be resolved by 
// calculating to a greater precision).
// n is provided in the function call else defaults to 160
// Default modulus is set to 10

function doPi(n) {
    if (isNaN(n) || n < 1 || n > maxSeqLen) { n = 160; }
    Big.DP = n;
    seqLen = n;

    x1 = arctan(Big(1).div(5));
    x2 = arctan(Big(1).div(239));
    pi = x1.times(4).minus(x2).times(4).toString();

    seq[0] = Big(3);
    for (var i=1; i < seqLen; i++) {
       seq[i] = Big(pi[i+1]);
    }
    document.getElementById("modulus").value = 10;
    displaySequence();
    algorithm = "Pi";
    parameters = [];
}

// arctan comes from https://github.com/MikeMcl/decimal.js/issues/9
// It's written for decimal.js but using it here with big.js (changed 
// .equals() to .eq() and NaN to 0)

function arctan(x) {
    var y = x;
    var yPrev = 0;
    var x2 = x.times(x);
    var num = x;
    var sign = -1;

    for (var k = 3; !y.eq(yPrev); k += 2) {
        num = num.times(x2);
  
        yPrev = y;
        y = (sign > 0) ? y.plus(num.div(k)) : y.minus(num.div(k));
        sign = -sign;
    }

    return y;
}

// Calculate golden ratio (phi) to n decimals using sqrt function 
// provided by big.js which uses Newton-Raphson.
// Note Newton-Raphson specifically for sqrt is a method which predates
// Newton as it is the Babylonian method or "Hero's method" (named 
// after first-century Greek mathematician Hero of Alexandria).
// n is provided in the function call else defaults to 200
// Default modulus is set to 10

function doPhi(n) {
    if (isNaN(n) || n < 1 || n > maxSeqLen) { n = 200; }
    Big.DP = n;
    seqLen = n;

    phi = Big(5).sqrt().add(1).div(2).toString();

    seq[0] = Big(1);
    for (var i=1; i < seqLen; i++) {
       seq[i] = Big(phi[i+1]);
    }
    document.getElementById("modulus").value = 10;
    displaySequence();
    algorithm = "Golden Ratio";
    parameters = [];
}

// Calculate Bernouill numbers using ada-bernoulli, copied from
// https://gist.github.com/terotil/3f83a473f372d31f55d5
// which in turn uses rationals provided by
// https://github.com/LarryBattle/Ratio.js

// Here we provide the numerators and denominators as separate
// integer sequences, corresponding to A027641 and A027642 (note
// the indexing is used by Ada Lovelace is off by one from OEIS)

// n is provided in the function call else defaults to 24

function doBernoullinumerators(n) {
    if (isNaN(n) || n < 1 || n > 32) { n = 24; }
    seqLen = n;

    for (var i=0; i < seqLen; i++) {
        seq[i] = Big(adaBernoulliNumber(i+1).numerator());
    }
    displaySequence();
    algorithm = "Bernoulli Numerators";
    parameters = [];
}

function doBernoullidenominators(n) {
    if (isNaN(n) || n < 1 || n > 32) { n = 24; }
    seqLen = n;

    for (var i=0; i < seqLen; i++) {
        seq[i] = Big(adaBernoulliNumber(i+1).denominator());
    }
    displaySequence();
    algorithm = "Bernoulli Denominators";
    parameters = [];
}

// Precanned sequences can be set in the HTML.
// They are not usually as long as maxSeqLen, so they leave seqLen set 
// to the appropriate value.
// Throws errors if sequence not valid

function setSeq(s) {
    if (s == undefined) { 
        throw "No sequence provided in setSeq";
    }
    if (s.length < 2) { 
        throw "Sequence too short in setSeq:" + seq.length; 
    }

    var i;

    for (i=0; i < s.length && i < maxSeqLen; i++) {
       seq[i] = Big(s[i]);
    }
    seqLen = i;
    displaySequence();
    algorithm = "Preset";
    parameters = [];
}

// Display generated sequence, until count numbers or chars characters
// or a num ber exceeds width, whichever happens first.
// Default to 100 numbers and 1000 characters, which is just
// enough to show 50 digit numbers in factorials, fibonacci, and powers.
// If count is zero then show all numbers.
// If chars is zero then don't limit HTML string.
// Highlight numbers with more than 64 bits or 50 decimal digits.
// Regardless, finish when an individual number is more than 120 characters.

function displaySequence(count, chars, width) {
    if (isNaN(count)) { count = 100; }
    if (isNaN(chars)) { chars = 1000; }
    if (isNaN(width)) { width = 120; }
    if (count == 0) { count = seqLen; }
    if (seqLen == 0) { return; }
        
    // If chars unset, HTML string must accommodate worst case 
    // where all numbers are width digits and highlighted

    if (chars == 0) { chars = count * (width + 40); }

    var prefix = seq[0].toString();
    var i = 1;
    var maxint64b = Big(2).pow(64).minus(1);
    var maxint50d = Big(10).pow(50).minus(1);
    var numberstr = "";
    var exceeded64b = 0; 
    var exceeded50d = 0; 


    while (i < seqLen && i < count && prefix.length < chars) {
        numberstr = seq[i].toString();
        if (numberstr.length > width) { break; }
        if (seq[i].gt(maxint50d)) {
            prefix = prefix + ", " + "<span style=\"color:red\">" + 
                              numberstr + "</span>";
            exceeded50d++;
        } else if (seq[i].gt(maxint64b)) {
            prefix = prefix + ", " + "<span style=\"color:blue\">" + 
                              numberstr + "</span>";
            exceeded64b++;
        } else {
            prefix = prefix + ", " + numberstr;
        }
        i++;
    }
    if (i < seqLen) {
        prefix = prefix + ", ...";
    }

    document.getElementById("sequence").innerHTML = prefix;

    var explain = "";

    if (exceeded64b) {
          explain = explain + 
            "<span style=\"color:blue\">Blue numbers exceed " +
            "64 binary bits. </span>";
    }
    if (exceeded50d) {
          explain = explain + 
            "<span style=\"color:red\">Red numbers exceed " +
            "50 decimal digits. </span>";
    }
    document.getElementById("colourexplanation").innerHTML = explain;
    document.getElementById("reducebutton").disabled = false;
}

// Search OEIS
//
// Can actually search OEIS with 1 or more numbers,
// but all sequences in OEIS are at least 4 terms and you need
// more than that to usefully reduce the search space in sequences like fib,
// so by default we search with (up to) 10 numbers.
// (If these are 50 digits each they'll still fit in the alleged
// max URL length of 2083.)

function doOEIS(n) {
    if (isNaN(n)) { n = 10; };
    if (n < 1) { throw "Search length too short to search OEIS: " + n; }
    if (seqLen == 0) { return; }

    window.open("https://oeis.org/search?q=" +
                 seq.slice(0, seqLen > n ? n : seqLen).join("%2C+") +
                 "&sort=&language=english&go=Search");
}

//
// Section 2 - Generate sequence modulo n and calculate period
//

// Some buttons hereafter use tooltips. The following jquery
// enables bootstrap tooltips.  Unfortunately they don't
// work very well in Chrome, so it's commented out.
//
// Selects all elements with data-toggle="tooltips"

// $('[data-toggle="tooltip"]').tooltip({ delay: 500 }); 

var modSeq = [];	// array of integers reduced mod modulus
			// corresponding directly to seq[]
var modulus = 0;	// modulus, 0 means not set

function doModsequence() {
    var m = Number(document.getElementById("modulus").value);

    if (m < 2) {
        m = 2;
        document.getElementById("modulus").value = m;
    } else if (m > 128) {
        m = 128;
        document.getElementById("modulus").value = m;
    } 
    
    modulus = m;

    for (var i=0; i < seqLen; i++) {
       // modSeq[i] = Number(seq[i].mod(modulus)); // fails if -ve
       modSeq[i] = (Number(seq[i].mod(modulus)) + modulus) % modulus;
    }
    displayModsequence();
    primeFactors(modulus);
}

// Display prime factorization of modulus

// Make array of primes up to n with a sieve the modern way

function primeFactors(n) {
    var primes = sieve(Math.sqrt(n) + 1);
    var factors = [];
    var c;	// count of occurrences of current prime factor

    for (var i=0; i < primes.length; i++) {
        if (primes[i] * primes[i] > n) { break; }
        c = 0;
        while (n % primes[i] == 0) {
            c++;
            n = Math.floor(n / primes[i]);
        }
        if (c) {
            factors.push([primes[i],c]);
        }
    }

    if (n > 1) { 
        factors.push([n,1]);
    }

    // write factors array into DOM

    if (factors.length == 1 && factors[0][1] == 1) {
        html="prime";
    } else {
        html = "";
        for (var i=0; i < factors.length; i++) {
            if (html) { html += " &times; " }
            html += factors[i][0];
            if (factors[i][1] > 1) { 
                html += "<sup>" + factors[i][1] + "</sup>";
            }
        }
    }

    document.getElementById("primefactors").innerHTML = html;
}

function sieve(n) {
    var sieve = [];

    for (var i=2; i < n; i++) {
        sieve[i] = true;
    }

    var maxi = Math.sqrt(n);

    for (var i=2; i < maxi; i++) {
        if (sieve[i] === true) {
            for (var j = i * i; j < n; j += i) {
                sieve[j] = false;
            }
        }
    }

    var primes = [];

    for (var i=0; i < n; i++) {
        if (sieve[i]) {
            primes.push(i);
        }
    }
    return primes;
}

// Logarithms are included to demonstrate issues of computational complexity
// rather than for music generation; e.g. compare fib to factorial and power
// Gives log base 10 of numbers of 1 or above.
// Log of 0 or negative numbers is set to zero for viz purposes.

function doLogsequence() {
    var max = 0;
    var x;

    for (var i=0; i < seqLen; i++) {
        x = Number(seq[i]);
        if (x <= 0) {
            modSeq[i] = 0;
        } else {
            modSeq[i] = Math.round(Math.log10(Number(seq[i])));
            if (modSeq[i] > max) {
	        max = modSeq[i];
	    }
	}
    }
    displayModsequence();
}

function displayModsequence() {
    document.getElementById("modsequence").value = 
        modSeq.slice(0, seqLen).join(" ");
    displayPeriod();
    document.getElementById("displaybutton").disabled = false;
}

// updateModseq is called when the sequence has been edited manually.
// This could be an enirely new sequence pasted into the textarea, so
// we need to count the sequence length and we can no longer rely
// on modulus.

function updateModseq() {
    var numbers = document.getElementById("modSequence").value.match(/\d+/g);

    if (numbers.length < 2) {
        window.alert("Sequence must contains at least two numbers");
        return;
    }

    if (numbers.length > maxSeqLen) {
        window.alert("Sequence cannot contain more than " + 
                      maxSeqLen + "numbers");
        return;
    }

    modSeq = numbers;
    seqLen = numbers.length;
    modulus = 0; // value now unreliable, could recalculate but not used again
    displayModsequence(); // reveal what we're actually using
}

// Try to calculate period.
// We take a sequence of length seqLen/2 starting at each index from 
// 1 to seqLen/2 and compare it with the sequence starting at 0. 
// If there is a complete match we declare the period and finish.
// The comparison function exits as soon as there is no match.

function displayPeriod() {
    document.getElementById("length").innerHTML = seqLen;
    document.getElementById("mod").innerHTML = modulus;

    var halfway = Math.floor(seqLen / 2);

    for (var i=1; i < halfway+1; i++) {
        if (cmp(i, 0, halfway)) {
            document.getElementById("period").innerHTML = i;
	    return;
        }
    }
    document.getElementById("period").innerHTML = "unknown";
}

// this could be a loop but I thought for a moment I was writing Lisp

function cmp(i, j, k) {
    if (j == k) {  // was i = seqLen
        return true;
    }
    
    if (modSeq[i] == modSeq[j]) {
        return cmp(i+1, j+1, k);
    }
    return false;
}

// Experimental variations on autocorrelation.
// If divs is 0 this is a direct autocorrelation.
// If divs is 1 we assume diatonic and test equality mod 7.
// If divs is 2 we assume chromatic and test equality mod 12.
// If divs is >2 this is treated as equal temprement scale
// of that length and consonance at 2:1 3:2 4:3 is counted
// following the Helmholtz dissonance curve (this could also be done
// using Euler's equations - note Helmholtz postdates Lovelace).

function displayCorrelation(divs) {
    if (isNaN(divs)) { divs = 0; }

    var counts = [];	// array showing number of counts for each index

    var width = Math.floor(seqLen / 2);

    var fifth = Math.round(divs * Math.log2(3/2));
    var fourth = Math.round(divs * Math.log2(4/3));
    // var maj3 = Math.round(divs * Math.log2(5/4));
    // var min3 = Math.round(divs * Math.log2(6/5));

    for (var i=1; i < width; i++) {
        var n = 0;
        for (var j=0; j < width; j++) {
            if (divs == 0) { 
                if (modSeq[i+j] == modSeq[j]) { n++; } 
            } else if (divs == 1) {
                if (modSeq[i+j]%7 == modSeq[j]%7) { n++; } 
            } else if (divs == 2) {
                if (modSeq[i+j]%12 == modSeq[j]%12) { n++; } 
            } else {
                var iv = Math.abs((modSeq[i+j] % divs) - (modSeq[j] % divs));
                if ( iv == 0 || iv == fourth || iv == fifth ) { n++; }
            }
        }
        counts[i] = [i, n];
    }

    if (counts.length == 0) { return; }

   // sort numerical descending counts with ascending indices

    counts.sort(function(a, b) {
           return b[1] == a[1] ? a[0] - b[0] : b[1] - a[1];
    });

    // display table of top 20 as 2 rows

    var cols = 0; // number of cols is number of non-zero entries max 20

    while (cols < 20 && counts[cols][1]) { cols++; }

    counts.splice(cols, counts.length - cols);

    // sort by ascending index

    counts.sort(function(a, b) { return a[0] - b[0]; });

    var tablestring = "<p><strong>autocorrelation table</strong></p>" +
                      "<table class=\"table table-bordered\"><tr>";

    for (var i=0; i < cols; i++) {
        tablestring = tablestring + "<td>" + counts[i][0] + "</td>";
    }
    tablestring = tablestring + "</tr><tr>"
    for (var i=0; i < cols; i++) {
        if (counts[i][1] == width) { 
            tablestring = tablestring + "<td><b>100%</b></td>";
        } else {
            tablestring = tablestring + "<td>" + 
                      Math.round(counts[i][1]*1000/width)/10 + "%</td>";
        }
    }
    tablestring = tablestring + "</tr></table>";

    document.getElementById("correlationtable").innerHTML = tablestring;
}

//
// Section 3 - Display number Roll
//
// Uses seqLen, algorithm
// modulus is no longer used but we calculate nRows from the sequence

var nRows = 0;		// number of rows in roll, typically same as modulus
var cellWidth = 8;	// default width of individual note cell on canvas
var cellHeight = 8;	// default height of individual note cell on canvas

var roll = [];		// array indexed (horizontally) by sequence index,
                        // each element is (vertical) array of notes:
                        // 0 = no note
                        // 1 = note
                        // 2 = note in rectangle currently being selected
                        // 3 = note in previous selection, retained by shift
                        // 4 = note pasted from memory
var memory = [];	// second roll for saving selection (cf clipboard)

var rect = {};		// Current selection rectangle
var mousedown = false;	// flag to track selection
var touchscreen = false;// if touchscreen don't assume mouse or shift key

var rollempty = true;	// set to false when roll array has been populated

var selStack = [];	// sekection stack, for undo and redo

// Selection variables used in Section 5 (audio) and Section 6 (export)
// These are set only in drawRoll.

var selected = 0;	// number of notes selected 
var selleft = 0;	// index of leftmost note in selection (column)
var selright = 0;	// index of rightmost note in selection (column)
var seltop = 0;		// index of highest (sic) note (row)
var selbot = 0;		// index of lowest (sic) note (row)

// The canvas

var canvas = document.getElementById('pianoroll')
var context = canvas.getContext('2d');

context.strokeStyle = 'LightGray';
context.fillStyle = 'CadetBlue';

// changes width of a cell by given delta

function rollWidth(i) { 
    if (cellWidth + i > 2 && cellWidth + i < 32) { 
        cellWidth += i; 
    }
    drawRoll();
}

// changes height of a cell by given delta

function rollHeight(i) { 
    if (cellHeight + i > 2 && cellHeight + i < 32) { 
        cellHeight += i; 
    }
    drawRoll();
}

// conduct one generation of the Game of Life on number roll
// (wrapped on a torus)
// Uses notes of value 1

function doLife() {
    var ilo, ihi, jlo, jhi; 
    var neighbours = 0;
    var newroll = [];

    // deselect so that cell values are only 0 ro 1

    for (var i=0; i < seqLen; i++) {
        for (var j=0; j < nRows; j++) {
            if (roll[i][j] > 1) {
                roll[i][j] = 1;
            }
        }
    }
    seloffset = 0; // hide shadow of paste

    // create next generation in newroll

    for (var i=0; i < seqLen; i++) {
        newroll[i] = [];
        for (var j=0; j < nRows; j++) {
            ilo = (i == 0) ? seqLen - 1 : i - 1;
            ihi = (i == seqLen - 1) ? 0 : i + 1;
            jlo = (j == 0) ? nRows - 1 : j - 1;
            jhi = (j == nRows - 1) ? 0 : j + 1;
            neighbours = roll[ilo][jlo] + roll[ilo][j] + roll[ilo][jhi] +
                         roll[i][jlo] + roll[i][jhi] +
                         roll[ihi][jlo] + roll[ihi][j] + roll[ihi][jhi];
	    if (neighbours < 2) {
                newroll[i][j] = 0;
            } else if (neighbours == 2 || neighbours == 3) {
                newroll[i][j] = roll[i][j];
            } else if (neighbours > 3) {
                newroll[i][j] = 0;
            }
            if (neighbours == 3 && roll[i][j] == 0) {
                newroll[i][j] = 1;
            }
        }
    }

    // copy newroll into number roll

    for (var i=0; i < seqLen; i++) {
        for (var j=0; j < nRows; j++) { 
            roll[i][j] = newroll[i][j]; 
        }
    }
    drawRoll();
}

// Conduct an iteration a la Arnol'd Cat using Fibonacci
// (x, y, n) -> (y % n, (x + y) % n)
// Inspired by a suggestion by Lasse Rempe-Gillen
// 11 Feb 2016

function doCat() {
    var newroll = [];

    // we work on a square of side nRows

    if (seqLen < nRows) { return; }

    // initialize newroll

    for (var x=0; x < nRows; x++) {
        newroll[x] = [];
    }

    // perform one iteration from roll into newroll

    for (var x=0; x < nRows; x++) {
        for (var y=0; y < nRows; y++) {
            newroll[y % nRows][ (x + y) % nRows] = roll[x][y];
        }
    }

    // copy newroll into number roll

    for (var x=0; x < nRows; x++) {
        for (var y=0; y < nRows; y++) {
            roll[x][y] = newroll[x][y]; 
        }
    }
        
    var count = Number(document.getElementById("pisano").innerHTML);

    if (!count) { count = pisanoPeriod(nRows); }
    document.getElementById("pisano").innerHTML = (count == 1) ? "": count - 1;

    drawRoll();
}

// Lookup the Pisano period in a table from 1..128

function pisanoPeriod(n) {
    if (n == undefined || n < 1 || n > 128) { 
        throw "pisanoPeriod takes 1..128: " + n;
    }

    return [1,3,8,6,20,24,16,12,24,60,10,24,
           28,48,40,24,36,24,18,60,16,30,48,24,
           100,84,72,48,14,120,30,48,40,36,80,24,
           76,18,56,60,40,48,88,30,120,48,32,24,
           112,300,72,84,108,72,20,48,72,42,58,120,
           60,30,48,96,140,120,136,36,48,240,70,24,
           148,228,200,18,80,168,78,120,216,120,168,48,
           180,264,56,60,44,120,112,48,120,96,180,48,
           196,336,120,300,50,72,208,84,80,108,72,72,
           108,60,152,48,76,72,240,42,168,174,144,120,
           110,60,40,30,500,48,256,192][n-1];
}

// mouse event handlers
// Need to add touch events for touchscreens
// For now we only respond to a touch as if it is a shift-click event

function mouseDown(e) {
    var r = canvas.getBoundingClientRect();
    rect.startX = e.clientX - r.left;
    rect.startY = e.clientY - r.top;
    canvas.style.cursor="crosshair";

    mousedown = true;

    if (touchscreen) { return; }

    // if shift-click, keep current selection by changing 2 to 3,

    for (var i=0; i < seqLen; i++) {
        for (var j=0; j < nRows; j++) {
            if (roll[i][j] > 1) {
	        roll[i][j] = e.shiftKey ? 3 : 1;
	    }
	}
    }
    seloffset = 0;
}

function mouseMove(e) {
    var r = canvas.getBoundingClientRect();
    
    var i = Math.floor((e.clientX - r.left) / cellWidth);
    var j = Math.floor((e.clientY - r.top) / cellHeight);

    document.getElementById("notenumber").innerHTML = nRows - j - 1;
    document.getElementById("notename").innerHTML = 
        midiNoteName(midiNotes[nRows - j - 1]);
    document.getElementById("noteindex").innerHTML = i;

    if (mousedown) {
        rect.w = (e.clientX - r.left) - rect.startX;
        rect.h = (e.clientY - r.top) - rect.startY ;
        drawRoll();
        context.strokeStyle="Red";
        context.strokeRect(rect.startX, rect.startY, rect.w, rect.h);
        context.strokeStyle = 'LightGray';
    }
}

function mouseUp(e) {
    canvas.style.cursor="default";
    mousedown = false;

    // if mouse hasn't moved then toggle this cell in selection

    var r = canvas.getBoundingClientRect();
    if (e.clientX - r.left == rect.startX &&
        e.clientY - r.top == rect.startY) {

        var i = Math.floor((e.clientX - r.left) / cellWidth);
	var j = Math.floor((e.clientY - r.top) / cellHeight);

        if (roll[i][j] > 1) {
            roll[i][j] = 1;
        } else if (roll[i][j] == 1) {
            roll[i][j] = 2;
        }       
    }
    pushSelection(); // push on selStack[]
    writeMetadata(); // because metadata includes selection info
    outputNoteNames();
    drawRoll();
}

// don't show note number and name when mouse is off canvas

function mouseOut(e) {
    if (!mousedown) {
        document.getElementById("notenumber").innerHTML = "";
        document.getElementById("notename").innerHTML = "";
        document.getElementById("noteindex").innerHTML = "";
    }
}

function keyDown(e) {
    var key = e.which || e.keycode;

    if (key == 65) { return selectAll(); }		// a key
    if (key == 67) { return copySelection(); }		// c key
    if (key == 86) { return pasteSelection(); }		// v key
    if (key == 90) { return popSelection(); }		// z key
    if (key == 188) { return nudgeSelection(-1); }	// comma (lt)
    if (key == 190) { return nudgeSelection(1); }	// period (gt)
}

// Once roll is initialized we draw it and initialize audio too
// Height of roll is the highest number in the sequence, capped at 128

function initRoll() {

    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    canvas.addEventListener("mouseout", mouseOut, false);
    window.addEventListener("keydown", keyDown, false);

    touchscreen = "ontouchstart" in window;

    // determine number of rows (usually same as modulus)

    nRows = 0;

    for (var i=0; i < seqLen; i++) { 
        if (modSeq[i] > nRows && modSeq[i] < 128) {
            nRows = modSeq[i];
        }
    }

    nRows++;

    // fill out roll as empty (cell=0) except notes from modSeq (cell=1)

    for (var i=0; i < seqLen; i++) {
        roll[i] = [];
        for (var j=0; j < nRows; j++) {
            roll[i][j] = 0;
        }
        roll[i][nRows - modSeq[i] - 1] = 1;
    }

    rollempty = false;

    document.getElementById("pisano").innerHTML = "";

    initSelectionmemory();
    drawRoll();
    drawMap();
    initAudio();
    initExport();
}

// drawRoll is called by initRoll, size change buttons, and 
// repeatedly by mousemove while dragging a selection

function drawRoll() {
    if (rollempty) { return initRoll(); }

    canvas.width = cellWidth * seqLen;
    canvas.height = cellHeight * nRows;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.rect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'Blue';
    context.stroke();

    selected = 0;
    selright = 0;
    selleft = seqLen;
    seltop = 0;
    selbot = nRows;

    // for each column, draw each cell

    for (var i=0; i < seqLen; i++) {
        for (var j=0; j < nRows; j++) {
            context.beginPath();
            context.rect(i*cellWidth, j*cellHeight, cellWidth, cellHeight);

	    // if we're currently selecting and cell has note, check 
            // if cell overlaps selection rectangle and update status

            if (mousedown && (roll[i][j] == 1 || roll[i][j] == 2) ) {
                if (rect.w > 0) {
                    rect.topleftX = rect.startX;
                    rect.borightX = rect.startX + rect.w;
                } else {
                    rect.topleftX = rect.startX + rect.w;
                    rect.borightX = rect.startX;
                }
                if (rect.h > 0) {
                    rect.topleftY = rect.startY;
                    rect.borightY = rect.startY + rect.h;
                } else {
                    rect.topleftY = rect.startY + rect.h;
                    rect.borightY = rect.startY;
                }
	        if  (i*cellWidth > rect.topleftX - cellWidth
                 && (i+1)*cellWidth < rect.borightX + cellWidth
                 && j*cellHeight > rect.topleftY - cellHeight
	         && (j+1)*cellHeight < rect.borightY + cellHeight) {
		    roll[i][j] = 2; 
                } else {
		    roll[i][j] = 1;
                }
            }

            // if cell has a note, colour it according to selection state

            if (roll[i][j] == 1) {
                context.fillStyle="CadetBlue";
                context.fill();
            } else if (roll[i][j] > 1) {
                context.fillStyle="Red";
                context.fill();
                selected++;
                if (selright < i) { selright = i; }
                if (selleft > i) { selleft = i; }
                if (seltop < j) { seltop = j; }
                if (selbot > j) { selbot = j; }
            } else if (seloffset && i + seloffset >= 0 && 
                       i + seloffset < seqLen && 
                      memory[i + seloffset][j]) {
                context.strokeStyle = 'Red';
                context.stroke();
            } else {
                context.strokeStyle = 'LightGray';
                context.stroke();
            }
        }
    }
    document.getElementById("selected").innerHTML = selected ? selected : "";
}

function selectAll() {
    for (var i=0; i < seqLen; i++) {
        for (var j=0; j < nRows; j++) {
            if (roll[i][j] >= 1) {
                roll[i][j] = 2;
            }
        }
    }
    drawRoll();
}

function pushSelection() {
    var selection = "";
    var col = "";

    for (var i=0; i < seqLen; i++) {
        col = "";
        for (var j=0; j < nRows; j++) {
            if (roll[i][j] > 1) {
                col += "," + j;
            }
        }
        if (col.length) {
            if (selection.length) {
                selection += " " + i + col;
            } else {
                selection = i + col;
            }
        }
    }

    // stash the seletion string in the DOM so it can be saved

    if (selection.length && selection != selStack[selStack.length - 1]) {
        selStack.push(selection);
        document.getElementById("selection").value = selection;
    }

    displayContour();
}

// Generate and display pitch contour of 12 symbols
// NB pitch numbers are measured from top of roll
   
function displayContour() {
    var tops = [];

    for (var i=0; i < seqLen && tops.length < 12; i++) {
        for (var j=0; j < nRows; j++) {
            if (roll[i][j] > 1) {
                tops.push(j);
                break;
            }
        }
    }
    if (!tops) { return; }

    var contour = "";
    var last = tops[0];

    for (var i=1; i < tops.length; i++) {
        contour += (tops[i] > last) ? "D" : (tops[i] < last) ? "U" : "R";
        last = tops[i];
    }
        
    document.getElementById("contour").innerHTML = contour;
}

function popSelection() {
    var sel = [];
    var entry = [];

    // unselect all

    for (var i=0; i < seqLen; i++) {
        for (var j=0; j < nRows; j++) {
            if (roll[i][j] > 1) {
                roll[i][j] = 1;
            }
        }
    }

    // reselect using penultimate entry in selStack

    if (selStack.length > 1) {
        selStack.pop();
        if (selStack.length > 0) {
            sel = selStack[selStack.length - 1].split(" ");
            for (var i=0; i < sel.length; i++) {
                entry = sel[i].split(",");
                for (var j=1; j < entry.length; j++) {
                    roll[entry[0]][entry[j]] = 2;
                }
            }
        }
    }

    document.getElementById("selection").value = 
        selStack.length ? selStack[selStack.length - 1] : "";

    drawRoll();
}


// These three functions implement a simple selection memory (or copy
// buffer) which uses memory to save the selection.  
// seloffset is the index at which this will be pasted, which
// enables sequences to be played against themselves.

var seloffset = 0;

function clearSelectionmemory() {
    for (var i=0; i < seqLen; i++) {
        for (var j=0; j < nRows; j++) {
            memory[i][j] = 0;
        }
    }
    seloffset = 0;
}

function copySelection() {
    for (var i=0; i < seqLen; i++) {
        for (var j=0; j < nRows; j++) {
            memory[i][j] = roll[i][j] > 1 ? 1 : 0;
        }
    }
    seloffset = 0;
}

function nudgeSelection(n) {
    if (isNaN(n)) { throw "Nudge requires numeric argument"; } 

    seloffset -= n;

    if (seloffset <= -seqLen) { 
        seloffset = -seqLen + 1; 
    } else if (seloffset >= seqLen) { 
        seloffset = seqLen - 1; 
    }
    drawRoll();
}

function pasteSelection() {
    var imin = seloffset > 0 ? 0 : -seloffset;
    var imax = seloffset > 0 ? seqLen - seloffset : seqLen;

    for (var i=imin; i < imax; i++) {
        for (var j=0; j < nRows; j++) {
            if (memory[i+seloffset][j] == 1) {
                roll[i][j] = 3;
            }
        }
    }
    pushSelection();
    drawRoll();
}

function initSelectionmemory() {
    for (var i=0; i < seqLen; i++) {
        memory[i] = [];
        for (var j=0; j < nRows; j++) {
            memory[i][j] = 0;
        }
    }
    seloffset = 0;
}

//
// Section 4 - Map numbers into notes
//

var midiNotes = []; // will hold mapping from numbers in mod sequence
                    // to midi note numbers.  128 indicates overflow
		    // (if midi note over 127, no noteis  played).

var notes = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B", "C"];

var pitch = 0;	// 0 to 11
var octave;	// -2 to 8
var midiOffset; // added on mapping
var scale = [];	// array of intervals

setPitch(0);			// C
setOctave(1);			// C1
setScale([2,2,1,2,2,2,1]); 	// default to major scale

function setPitch(i) {
    if (i < 0 || i > 11) { throw "Pitch out of range (0-11):" + i; }
    pitch = i;
    document.getElementById("pitch").innerHTML = notes[i];
    midiOffset = 12 * octave + pitch + 24;
    drawMap();
}

// In MIDI middle C is defined as MIDI note 60
// Conventions vary as to which Octave number this is (C3, C4, C5)
// Here we choose C3, which means the MIDI octaves run from -2 to 8
// (where 8 is incomplete as the last note is 127 = G).
// This gives C0 = 24, C1 = 36, C2 = 48, C3 = 60, C4 = 72, C5 = 84, ...

function setOctave(i) {
    if (i < -2 || i > 8) { throw "Octave out of range (-2 to 8):" + i; }
    octave = i;
    document.getElementById("octave").innerHTML = i;
    midiOffset = 12 * octave + pitch + 24;
    drawMap();
}

function setScale(s) {
    if ( s == undefined ) { throw "setScale expects array"; }
    scale = s;

    var scaleString = document.getElementById("scale");
    scaleString.value = s.join(" ");
    drawMap();
}

// reGenerate uses the array of intervals to rebuild the scale

function reGenerate() {
    var scaleString = document.getElementById('scale').value;
    var s = [];
    var ns = [];

    // parse string into array s then create new scale array ns

    s = scaleString.match(/(\d+)/g);
    
    if (s) {
        for (var i=0; i < s.length; i++) {
            ns[i] = Number(s[i]);
            if (ns[i] < 1 || ns[i] > 23) {
                window.alert("Intervals must be between 1 and 23: " + n);
	        return;
            }
        }
    } else {
        // check for WH or TS notation instead of numbers
        s = scaleString.match(/[WH]/g) || scaleString.match(/[TS]/g);
        if (!s) {
            window.alert("Intervals must be in format 2,2,1 or TTS or WWH");
            return;
        }
        for (var i=0; i < s.length; i++) {
            if ( s[i] == "H" || s[i] == "S" ) ns[i] = 1; 
            else if ( s[i] == "W" || s[i] == "T" ) ns[i] = 2; 
        }
    }

    // success show string and set scale array

    document.getElementById('scale').value = s.join(" ");
    scale = ns;
    drawMap();
}

function drawMap() {
    var n = midiOffset;
    midiNotes[0] = n;	// midiNotes maps modSeq value to MIDI note number
    var i=1;

    while (i < nRows) {
        for (var j=0; j < scale.length; j++) {
            n = n + scale[j];            
            if (n > 127) { 
		// throw "Midi note number exceeded 127: " + n;
		n = 128;
	    }
            midiNotes[i++] = n;
            if (i == nRows) { break; }
        }
    }

    var row = "";
    var tableHTML = "<tr>";

    // make table row of numbers

    for (var i=0; i < nRows; i++) {
        if (midiNotes[i] == 128) {
	    break;
	}
	row = row + "<td>" + i + "</td>";
    }
    row = row + "</tr><tr>"

    // add table row of note names

    for (var i=0; i < nRows; i++) {
        if (midiNotes[i] == 128) {
	    break;
	}
        row = row + "<td>" + midiNoteName(midiNotes[i]) + "</td>";
    }
    row = row + "</tr><tr>"

/*
    // add table row of MIDI note numbers
    for (var i=0; i < nRows; i++) {
        if (midiNotes[i] == 128) {
	    break;
	}
        row = row + "<td>" + midiNotes[i] + "</td>";
    }
*/
    row = row + "</tr>"

    document.getElementById("map").innerHTML = row;
    writeMetadata();
    outputNoteNames();
}

// Returns string representing MIDI note, or blank if > 127

function midiNoteName(i) {
    if (i < 128) {
        return notes[ i % 12 ] + (Math.floor(i / 12) - 2).toString();
    }
    return "";
}

// Returns string representing Lilypond note, or blank if > 127

function lilyNotename(i) {
    var notes = ["c", "cs", "d", "ef", "e", "f", "fs", 
                 "g", "af", "a", "bf", "b", "c"];
    var o = ",,,,,'''''";
    var oct = "";

    if (i > 127) { 
        return " "; 
    }
    if (i > 71) { 
        oct = o.substring(5, Math.floor(i / 12));
    } else if (i < 60) { 
        oct = o.substring(0, 5 - Math.floor(i / 12)); 
    } 

    return notes[ i % 12 ] + oct;
}

// 
// Section 5 - Play audio
//
//
// Use <script src="soundfont-loader.min.js"></script>

var audioCtx = null;;
var piano = null;
var notesPerBeat = 8; // default, until a play button is pressed
var bpm = 60;
var inst = "acoustic_grand_piano";	// default, until setInstrument() called
var audioInitialized = false;
var extension = 1;
var audioContexts = [];
var audioSources = [];

function playbuttonsDisabled(b) {
    elements = document.getElementsByClassName("play");

    for (var i=0; i < elements.length; i++) {
        elements[i].disabled = b;
    }
}
  
// initAudio() is called when roll is displayed (Display button)
// and hence always available as an audio reset to user
 
function initAudio() {

    playStop();

    // clear up any existing contexts

    for (var i=0; i < audioContexts.length; i++) {
        audioContexts[i].close(); 
    }
    audioContexts = [];

    audioInitialized = false;
    playbuttonsDisabled(true);

    startAudio();
}

// Piano and Xylophone soundfonts can come off the local server, helps for
// standalone demos

/*
Soundfont.nameToUrl = function(instName) { 
    if (instName == "acoustic_grand_piano" ||
        instName == "xylophone") {
        return "sf/" + instName + "-ogg.js"; 
    }
}
*/

// It takes a while to create the AudioContext and load a soundfont,
// so the audioCtx is initialized as early as possible in the
// interaction, not immediately before playing.  It is possible to 
// do multiple startAudio()s, perhaps making different instruments.

function startAudio(inst) {

    audioInitialized = false;
    playbuttonsDisabled(true);

    // make new context. Should be
    // var audioCtx = new AudioContext();
    // but catering for old browsers

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioContexts.push(audioCtx);

    // make an instrument
    // e.g. harpsichord, church_organ, rock_organ, xylophone, orchestral_harp, ...
    // Default is acoustic grand piano.

    var soundfont = new Soundfont(audioCtx);

    piano = soundfont.instrument( inst == undefined ? "acoustic_grand_piano" : inst );
    piano.onready(function() { 
        audioInitialized = true; 
        playbuttonsDisabled(false);
        // console.log("Audio ready");
    });
}

function playStop() {
    for (var i=0; i < audioSources.length; i++) { 
        audioSources[i] && audioSources[i].stop(0);
    }
    audioSources = [];
}

// note are usually of the duration corresponding to one
// cell on the piano roll. The duration can be changed from 1,
// to obtain staccato or sustain effects.  Sustain is useful to
// hear the harmonies.

function extendNotes(n) {
    extension = Number(n);
    if (extension < 0.5) {
        extension = 0.5;
    } else if (extension > 8) {
        extension = 8;
    }    
}
 
// n is duration of the note in american terminology i.e. 
// 16 corresponds to semiquavers (sixteenth)
// 8 corresponds to quavers (eighth)
// 4 corresponds to crotchets (quarter)
// 2 corresponds to minim (half)
// 1 corresponds to semibreve (whole)

function playRoll(n) {
    if (n < 1) { 
        notesPerBeat = 1; 
    } else if (n > 16) { 
        notesPerBeat = 16; 
    } else { 
        notesPerBeat = n; 
    }

    var bpmv = Number(document.getElementById("bpm").value);

    if (isNaN(bpmv) || bpmv < 30 || bpmv > 180) {
        window.alert("Tempo must be between 30 and 180 bpm");
        return;
    }
    bpm = bpmv;

    if (!audioInitialized) { return; }

    var time = audioCtx.currentTime + 0.1;
    var duration = 60 / (bpm * notesPerBeat); // audioCtx uses seconds

    var imin = selected ? selleft : 0;
    var imax = selected ? selright : seqLen - 1;

    for (var i=imin; i <= imax; i++) {
        for (j=0; j < nRows; j++) {
            if (roll[i][nRows - j - 1] > (selected ? 1 : 0)) {
                audioSources.push(piano.play(midiNoteName(midiNotes[j]), 
                                             time, duration * extension));
            }
        }
        time += duration;
    }

/* old code plays single line from modSeq

    if (selected) {
        for (var i=selleft; i < selright + 1; i++) {
            if (roll[i][nRows - modSeq[i] - 1] > 1 &&
                midiNotes[modSeq[i]] < 128) {
                piano.play(midiNoteName(midiNotes[modSeq[i]]), time, duration * extension);
            }
            time += duration;
        }
    } else {
        for (var i=0; i < seqLen; i++) {
	    if (midiNotes[modSeq[i]] < 128) {
                piano.play(midiNoteName(midiNotes[modSeq[i]]), time, duration * extension);
            }
            time += duration;
        }
    }
*/
}

// Section 6 - Exporting 
//
// These variables hold metadata strings which are set in updateMetadata()
// and used in multiple export functions

// mutable by user
var mTitle = "";
var mCreator = "";
var mExplanation = "";
var mId = "";	// ID provided by user, defaults to guid

// immutable by user
var mDate = "";		// date
var mGuid = ""; 	// unique ID generated here
var mScale = "";	// scale as strng of generating intervals
var mSelection_n = 0;	// number of notes in selection
var mSelection_bl = ""; // bottom left vertex of selection
var mSelection_tr = ""; // top right vertex of selection

// Test (asynchronously) to see if we currently have access to the CGI 
// scripts needed for exporting, and make submit button visible if we do.

// The id argument is the DOM id of the button to be displayed or not.

function checkCGI(script, id)
{
    var xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function() { 
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            document.getElementById(id).style.display = "inline";
            // console.log("CGI ready " + script);
        } else {
            document.getElementById(id).style.display = "none";
        }
    }

    xhttp.open("GET", script, true);
    xhttp.send(null);
}

// check if we have CGI scripts available, and initialize the metadata

function initExport() {
    var midiaction = document.getElementById("midiform").action;
    var lilyaction = document.getElementById("lilyform").action;
    var provaction = document.getElementById("provform").action;

    if (lilyaction != "") {
        checkCGI(lilyaction, "lilysubmit");
    }

    if (midiaction != "") {
        checkCGI(midiaction, "midisubmit");
    }

    if (provaction != "") {
        checkCGI(midiaction, "provsubmit");
    }

    writeMetadata();
    outputNoteNames();
}

// Generate and write metadata into the DOM

function writeMetadata() {
    var metaSequence = seq.slice(0, seqLen > 10 ? 10 : seqLen).join(",");
    var metaNumbers = modSeq.slice(0, seqLen > 10 ? 10 : seqLen).join(",");

    mScale = scale.join(",");

    mSelection_bl =
        selected ? selleft + "," + midiNoteName(midiNotes[nRows - seltop - 1])
                  : "0," + midiNoteName(midiNotes[0]);
    mSelection_tr =
        selected ? selright + "," + midiNoteName(midiNotes[nRows - selbot - 1])
                  : (seqLen - 1) + "," + midiNoteName(midiNotes[nRows - 1]);
    mSelection_n = selected ? selected : seqLen;

    var parameterString = "";
    for (var i=0; i < parameters.length; i++) {
        if (parameterString) { parameterString += ", "; }
        parameterString += parameters[i][0] + "=" + parameters[i][1];
    }

    // fill out metadata with defaults

    if (algorithm == "" || !seqLen || !nRows) { return; }

    mDate = Date();

    mGuid = createGuid();

    mExplanation = algorithm;
    if (parameterString) { mExplanation += " (" + parameterString + ")"; }
    if (modulus) { mExplanation += " mod " + modulus; }
    mExplanation +=  " on " + seqLen + " x " + nRows + 
        " number roll with 0 mapped to " + notes[pitch] + octave + 
        " and scale generated on intervals " + mScale + 
        ", playing with " + mSelection_n + 
        " notes selected in [" + mSelection_bl + 
        "] to [" + mSelection_tr + "] at tempo " + bpm + 
        "bpm, created on " + mDate + 
        ". The first numbers in the original sequence are " + metaSequence +
        " and in the reduced sequence are " + metaNumbers + "."

    document.getElementById("metaTitle").value = algorithm;
    document.getElementById("metaDescription").value = mExplanation;
    document.getElementById("metaDate").value = mDate;
    document.getElementById("metaIdentifier").value = mGuid;

    // immutable
    document.getElementById("metaSequence").innerHTML = metaSequence;
    document.getElementById("metaPitch").innerHTML = notes[pitch];
    document.getElementById("metaOctave").innerHTML = octave;
    document.getElementById("metaScale").innerHTML = mScale;
    document.getElementById("metaTempo").innerHTML = bpm;
    document.getElementById("metaRows").innerHTML = nRows;
    document.getElementById("metaColumns").innerHTML = seqLen;
    document.getElementById("metaSelection").innerHTML = 
        mSelection_n + " [" + mSelection_bl + "],[" + mSelection_tr + "]";
}

// read metadata values back from DOM
// Note only Title, Creator, Explanation, and Id are editable by user

function readMetadata() {
    mTitle = document.getElementById("metaTitle").value;
    mCreator = document.getElementById("metaCreator").value;
    mExplanation = document.getElementById("metaDescription").value;
    mId = document.getElementById("metaIdentifier").value;
}

function outputAll() {
    outputNoteNames();
    outputMidiCsv();
    outputMei();
    outputProv();
    outputLilypond();
    outputMeld();
}

function outputImage () {
    var image;

    // get width of bootsrap grid as displayed

    var width = document.getElementById("jumbo").clientWidth;

    if (width < 50) { return; }

    if (seqLen * cellWidth > width) {
        image = new Image(width - 30); // approximation
    } else {
        image = new Image();
    }

    // Create dataURL. Note this could be opened ina  new window.

    image.src = canvas.toDataURL("image/png");

    // put image into DOM

    var node = document.getElementById("rollimage");

    if (node.childNodes.length && node.firstChild instanceof HTMLImageElement) {
        node.replaceChild(image, node.firstChild);
    } else {
        node.appendChild(image);
    }
}

function outputNoteNames() {
    var imin = selected ? selleft : 0;
    var imax = selected ? selright : seqLen - 1;

    var notesequence = "";
    var par = [];

    for (var i=imin; i <= imax; i++) {
        par = [];
        for (j=0; j < nRows; j++) {
            if (roll[i][nRows - j - 1] > (selected ? 1 : 0)) {
                par.push(midiNoteName(midiNotes[j]));
            }
        }
        if (par.length > 1) {
            notesequence += " <" + par.join(" ") + ">";
        } else if (par.length == 1) {
            notesequence += par[0];
        } else {
            notesequence += "-";
        }
        notesequence += " ";
    }

    readMetadata();
    document.getElementById("notestext").value = notesequence;
}

function outputLilypond() {
    var uppernotes = "";
    var lowernotes = "";

    var jsplit = 0; // split point, bottom MIDI note number of upper staff

    while (jsplit < nRows) {
        if (midiNotes[jsplit] >= 72) { break; }
        jsplit++;
    }

    var imin = selected ? selleft : 0;
    var imax = selected ? selright : seqLen - 1;

    var par = [];
    var lcount = 0;
    var ucount = 0;
    var bar = "";

    var i = imin;
    while (i <= imax) {
	// upper (right hand)

        bar = "";
        for (var b=0; b < notesPerBeat; b++) {
            if ( i+b > imax ) { break; }
            par = [];
            for (j=jsplit; j < nRows; j++) {
                if (roll[i+b][nRows - j - 1] > (selected ? 1 : 0)) {
                    par.push(lilyNotename(midiNotes[j]));
                }
            }
            ucount += par.length;
            if (par.length > 1) {
                bar += " <" + par.join(" ") + ">";
            } else if (par.length == 1) {
                bar += par[0];
            } else {
                bar += "r";
            }
            bar += notesPerBeat;
            if (notesPerBeat == 8 && (b % 2 == 1)) {
                bar += "  ";
            } else {
                bar += " ";
            }
        }
        uppernotes += bar + "| ";

	// lower (left hand)

        bar = "";
        for (var b=0; b < notesPerBeat; b++) {
            if ( i+b > imax ) { break; }
            par = [];
            for (j=0; j < jsplit; j++) {
                if (roll[i+b][nRows - j - 1] > (selected ? 1 : 0)) {
                    par.push(lilyNotename(midiNotes[j]));
                }
            }
            lcount += par.length;
            if (par.length > 1) {
                bar += " <" + par.join(" ") + ">";
            } else if (par.length == 1) {
                bar += par[0];
            } else {
                bar += "r";
            }
            bar += notesPerBeat;
            if (notesPerBeat == 8 && (b % 2 == 1)) {
                bar += "  ";
            } else {
                bar += " ";
            }
        }
        lowernotes += bar + "| ";

        i += notesPerBeat;
    }

    readMetadata();

    var output =
           ["% " + mDate,
            "% id " + mId,
            "\\version \"2.16.2\"",
            "\\language \"english\"",
            "\\header {",
            "  title = \"" + mTitle + "\"",
            "  composer = \"" + mCreator + "\"",
            "}",
            "upper = {",
            "  \\clef treble",
            "  \\key c \\major",
            "  \\time 4/4",
            "  " + compressRests(uppernotes),
            "}",
            "lower = {",
            "  \\clef bass",
            "  \\key c \\major",
            "  \\time 4/4",
            "  " + compressRests(lowernotes),
            "}",
            "\\score {",
            "  \\new PianoStaff <<",
            "    \\set PianoStaff.instrumentName = #\"Piano  \"",
            ucount ? "    \\new Staff = \"upper\" \\upper" : "",
            lcount ? "    \\new Staff = \"lower\" \\lower" : "",
            "  >>",
            "  \\layout { }",
            "  \\midi { \\tempo " + notesPerBeat + " = " + bpm + " }",
            "}"];

    // output explanation as wordwrapped comment (10 words per line)

    var xa = mExplanation.split(" ");
    while (xa.length) {
        output.push("% " + xa.splice(0,10).join(" "));
    }

    // finish with the immutable guid

    output.push("");
    output.push("% NumbersIntoNotes ID " + mGuid);

    document.getElementById("lilytext").value = output.join("\n");
}

//    r8 r8  r8 r8  r8 r8  a8 b8
// -> r4 r4 r4 a8 b8
// -> r2 r4 a8 b8	correct

//    a8 b8  r8 r8  r8 r8  r8 r8
// -> a8 b8 r4 r4 r4
// -> a8 b8 r2 r4	but we want r4 r2, so pattern 2 overrides

function compressRests(str) {
    str = str.replace(/r8 r8  /g, "r4 ")
    str = str.replace(/r4 r4 \|/g, "r2 |")
    str = str.replace(/r4 r4 /g, "r2 ")
    str = str.replace(/r2 r2 /g, "r1 ")
    return str;
}

// Export roll in CSV notation for conversion by to Standard MIDI file format.
// This does not include duration changes, as these are left to
// the destination sequencer.
// Some metadata is exported here to help make the output repeatable.
//

function outputMidiCsv() {
    var time = 0;
    var bpm = Number(document.getElementById("bpm").value);
    var duration = bpm * notesPerBeat * 24 / 60; // 24 MIDI clock ticks per beat
    var output = [];

    var imin = selected ? selleft : 0;
    var imax = selected ? selright : seqLen - 1;
    var par = [];

    // Create metadata to help generate the sequence again

    readMetadata();

    var expt =  "s " + seq.slice(0, seqLen > 5 ? 5 : seqLen).join(",") +
               " l " + seqLen +		// number of columns
               " n " + nRows +		// number of rows
               " p " + pitch +		// zero mapped to this pitch
               " o " + octave +		// zero mapped to this octave
               " i " + scale.join(",");	// how scale is generated
               " v 1"; 			// metadata version number

    output = [ "0, 0, Header, 1, 2, 480",
               "1, 0, Start_track",
               "1, 0, Title_t, \"" + mTitle + "\"",
               "1, 0, Text_t, \"" + expt + "\"",
               "1, 0, Copyright_t, \"" + mGuid + "\"",
               "1, 0, Time_signature, 4, 2, 24, 8",
               "1, 0, Tempo, 500000",
               "1, 0, End_track",
               "2, 0, Start_track",
               "2, 0, Instrument_name_t, \"Acoustic Grand Piano\"",
	       "2, 0, Program_c, 1, 1" ];

    for (var i=imin; i <= imax; i++) {
        par = [];
        for (j=0; j < nRows; j++) {
            if (roll[i][nRows - j - 1] > (selected ? 1 : 0) &&
                midiNotes[modSeq[i]] < 128) {
                    par.push(midiNotes[j]);
            }
        }
        for (var n=0; n < par.length; n++) {
            output.push("2, " + time + ", Note_on_c, 1, " +
                        midiNotes[modSeq[i]] + ", 81 ");
        }
        for (var n=0; n < par.length; n++) {
            output.push("2, " + (time + duration) + ", Note_on_c, 1, " +
                        midiNotes[modSeq[i]] + ", 0 ");
        }
        time += duration;
    }

    output.push("2, " + time + ", End_track");
    output.push("0, 0, End_of_file");

    var rollbuffer = ""; // encodes text for copy and paste at client

    for (i=0; i < output.length; i++) {
        rollbuffer += output[i] + "\n";
    }
    document.getElementById("miditext").value = rollbuffer;
}

// Export roll in MEI notation 
// This does not include duration changes, as these are left to
// the destination sequencer.
// Some metadata is exported here to help make the output repeatable.
//

// These evalues are determined by outputMei but also used by outputMeld
// TODO pull the key id code out into separate function that can be called wherever

var tonic = -1;
var keysig = -1;

function outputMei() {
    var time = 0;
    var bpm = Number(document.getElementById("bpm").value);
    var duration = bpm * notesPerBeat * 24 / 60; // 24 MIDI clock ticks per beat
    var output = [];

    var imin = selected ? selleft : 0;
    var imax = selected ? selright : seqLen - 1;
    var par = [];

    // Create metadata to help generate the sequence again

    readMetadata();

    // The fragment will be mapped onto an MEI score.  If it came from a major scale etc
    // this will be straightforward. However any scale is possible, so for example a 
    // chromatic scale might map with many accidentals. So first we take the fragment and
    // try to find the key signature with the minimum number of accidentals, and we start
    // using the pitch specified in the user interface - so for example if the user specifies
    // C major then we should find and choose C major (as opposed to another key which also 
    // happens to map well for a given fragment).

    // Make list of all notes

    var allnotes = [];
    var minnote = Infinity;
    var maxnote = 0;

    for (var i=imin; i <= imax; i++) {
        for (j=0; j < nRows; j++) {
            if (roll[i][nRows - j - 1] > (selected ? 1 : 0)) {
                allnotes.push(midiNotes[j]);
                if (midiNotes[j] < minnote) { minnote = midiNotes[j]; }
                if (midiNotes[j] > maxnote) { maxnote = midiNotes[j]; }
            }
        }
    }

    // Sorted list of all notes to check vertical distribution

    allnotes.sort(function (a, b) {  return a - b;  });

    var sum = 0;
    var count = 0;

    if (allnotes.length < 12) {
      sum = allnotes.reduce(function(a, b) { return a + b; }); 
      count = allnotes.length;
    } else { // find interquartile mean

        var indexmin = Math.floor(allnotes.length / 4) - 1;
        var indexmax = Math.floor(allnotes.length * 3 / 4);
    
        for (var i = indexmin; i < indexmax; i++) {
            sum += allnotes[i];
            count++;
        }
    } 

    var mean = sum / count;

    // get first and last pith class for meld metadata

    var pitchclasses = allnotes.map(function (x) { return x % 12; });

    var firstnote = notes[midiNotes[pitchclasses[pitchclasses.length - 1]] % 12];
    var lastnote = notes[midiNotes[pitchclasses[0]] % 12];

    // remove duplicates

    pitchclasses = pitchclasses.filter(function(e, i) {
        return pitchclasses.indexOf(e) == i;
    })

    // try each major key to find key with smallest number of pitchclasses not in that key

    var min = Infinity;
    keysig = -1; // global for use by outputMeld
    var diatonic = [ 0, 2, 4, 5, 7, 9, 11 ];
    var accidentals = [];

    for (var k = 0; k < 12; k++) {
        kpc = diatonic.map(function (x) {
            return (pitch + x + k) % 12;
        });
        filtered = pitchclasses.filter(function(e) {
            return (kpc.indexOf(e) == -1); 
        });
        if (filtered.length < min) {
            min = filtered.length;
            keysig = (pitch + k) % 12;
            accidentals = filtered;
        }
    }

    tonic = -1; // global for use by outputMeld
    if (pitch == (keysig + 9) % 12) {
        tonic = pitch;
        keymode = "minor";
    } else {
        tonic = keysig;
        keymode = "major";
    }

    console.log(notes[tonic] + " " + keymode + " accidentals " + accidentals);

    // List of key signatures for MEI, to be indexed 0..11 with C = 11
    // These include some arbitrary choices because we don't have enharmonics in 
    // the UI; e.g. Gb would be 6 flats and F# would be 6 sharps, the UI uses F# so 
    // we use the latter, ditto C# is 7 sharps so we use that as opposed to 5 flats.
    // So range is asymmetric, 4 flats through to 7 sharps, to fix with improved UI.

    var keysigs = ["0s", "7s", "2s", "3f", "4s", "1f", "6s", "1s", "4f", "3s", "2f", "5s"];

    // Octave displacements, based on mean
    // Can also use maxnote and minnote but currently unused

    var displacement = "";

    if (mean > 108) { displacement = "clef.dis=\"22\" clef.dis.place=\"above\" "; }
    if (mean > 96) { displacement = "clef.dis=\"15\" clef.dis.place=\"above\" "; }
    if (mean > 84) { displacement = "clef.dis=\"8\" clef.dis.place=\"above\" "; }
    if (mean < 72) { displacement = "clef.dis=\"8\" clef.dis.place=\"below\" "; }
    if (mean < 60) { displacement = "clef.dis=\"15\" clef.dis.place=\"below\" "; }
    if (mean < 48) { displacement = "clef.dis=\"22\" clef.dis.place=\"below\" "; }

    output = [ 
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>",
    "<mei xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns=\"http://www.music-encoding.org/ns/mei\" meiversion=\"3.0.0\">",
    "<meiHead>",
    " <fileDesc>",
    "  <titleStmt>",
    "   <title>" + mTitle + "</title>",
    "   <title type=\"subordinate\">" + mGuid + "</title>",
    "  </titleStmt>",
    " </fileDesc>",
    " </meiHead>",
    " <music>",
    "  <body>",
    "   <mdiv>",
    "    <score>",
    "     <scoreDef meter.count=\"4\" meter.unit=\"4\" key.sig=\"" + keysigs[keysig] + "\" key.mode=\"" + keymode + "\">",   
    "      <staffGrp>",
    "       <staffDef n=\"1\" " + displacement + "clef.line=\"2\" clef.shape=\"G\" lines=\"5\"/>",
    "      </staffGrp>",
    "     </scoreDef>",
    "     <section>",
    "      <measure n=\"1\" xml:id=\"m1\">",
    "       <staff n=\"1\">",
    "        <layer n=\"1\">" ];

    // pnames and accidentals of pitch classes for MEI, indexed 0..11, one row per key
    // I've done this entirely by hand and it needs to be checked

    //              C    C#   D    Eb   E    F    F#   G    Ab   A    Bb   B
    var pnam  = [[ "c", "c", "d", "e", "e", "f", "f", "g", "a", "a", "b", "b" ],  // C
                 [ "c", "c", "d", "d", "e", "e", "f", "g", "g", "a", "a", "b" ],  // C# (F♯, C♯, G♯, D♯, A♯, E♯, B♯)
                 [ "c", "c", "d", "d", "e", "f", "f", "g", "g", "a", "a", "b" ],  // D (F♯, C♯)
                 [ "c", "d", "d", "e", "e", "f", "g", "g", "a", "a", "b", "b" ],  // Eb (B♭, E♭, A♭)
                 [ "c", "c", "d", "d", "e", "f", "f", "g", "g", "a", "a", "b" ],  // E (F♯, C♯, G♯, D♯)
                 [ "c", "d", "d", "e", "e", "f", "g", "g", "a", "a", "b", "b" ],  // F (B♭)
                 [ "c", "c", "d", "d", "e", "e", "f", "g", "g", "a", "a", "b" ],  // F# (F♯, C♯, G♯, D♯, A♯, E♯)
                 [ "c", "c", "d", "d", "e", "f", "f", "g", "g", "a", "a", "b" ],  // G (F♯)
                 [ "c", "d", "d", "e", "e", "f", "g", "g", "a", "a", "b", "b" ],  // Ab (B♭, E♭, A♭, D♭)
                 [ "c", "c", "d", "d", "e", "f", "f", "g", "g", "a", "a", "b" ],  // A (F♯, C♯, G♯)
                 [ "c", "d", "d", "e", "e", "f", "g", "g", "a", "a", "b", "b" ],  // Bb (B♭, E♭)
                 [ "b", "c", "d", "d", "e", "f", "f", "g", "g", "a", "a", "b" ]]; // B (F♯, C♯, G♯, D♯, A♯)

    //              C    C#   D    Eb   E    F    F#   G    Ab   A    Bb   B
    var acci  = [[ "" , "s", "" , "f", "" , "" , "s", "" , "f", "" , "f", ""  ], // C
                 [ "n", "" , "n", "" , "" , "" , "" , "n", "" , "n", "" , "n" ], // C# (F♯, C♯, G♯, D♯, A♯, E♯, B♯)
                 [ "n", "" , "" , "s", "" , "n", "" , "" , "s", "" , "s", ""  ], // D (F♯, C♯)
                 [ "" , "f", "" , "" , "n", "" , "s", "" , "" , "n", "" , "n" ], // Eb (B♭, E♭, A♭)
                 [ "n", "" , "n", "" , "" , "" , "" , "n", "" , "" , "s", ""  ], // E (F♯, C♯, G♯, D♯)
                 [ "" , "f", "" , "f", "" , "" , "f", "" , "f", "" , "" , "n" ], // F (B♭)
                 [ "n", "" , "n", "" , "n", "" , "" , "n", "" , "n", "" , ""  ], // F# (F♯, C♯, G♯, D♯, A♯, E♯)
                 [ "" , "s", "" , "s", "" , "n", "" , "" , "s", "" , "s", ""  ], // G (F♯)
                 [ "" , "" , "n", "" , "n", "" , "f", "" , "" , "n", "" , "n" ], // Ab (B♭, E♭, A♭, D♭)
                 [ "n", "" , "" , "s", "" , "n", "" , "n", "" , "" , "s", ""  ], // A (F♯, C♯, G♯)
                 [ "" , "f", "" , "" , "n", "" , "f", "" , "f", "" , "" , "n" ], // Bb (B♭, E♭)
                 [ "n", "" , "n", "" , "" , "" , "" , "n", "" , "n", "" , ""  ]]; // B (F♯, C♯, G♯, D♯, A♯)

    var bar = 1;
    var beat = 0;
    var accidentals = [];
    var restduration = 0;

    for (var i=imin; i <= imax; i++) {
        if (beat++ == 4) {
          bar++;
          output.push("        </layer>");
          output.push("       </staff>");
          output.push("      </measure>");
          output.push("      <measure n=\"" + bar + "\" xml:id=\"m" + bar + "\">");
          output.push("       <staff n=\"1\">");
          output.push("        <layer n=\"1\">");
          beat = 1;
          accidentals = [];
          restduration = 0;
        }

        par = [];
        for (j=0; j < nRows; j++) {
            if (roll[i][nRows - j - 1] > (selected ? 1 : 0) &&
                midiNotes[modSeq[i]] < 128) {
                    par.push(midiNotes[j]);
            }
        }

        // Needs code here to remember an accidental for the rest of the bar.
        // Until then this is faithful to the older comvention (e.g. Bach)
        // when accidental applied to the one note/group.  The Harvard 
        // Dictionary of Music says that the modern practice "is not well
	// established until the 19th century". 


        // Rests are stored up emited with the right duration before a note or end of bar.
        // Sepraate logic for each beat as we don't want a minum rest on beats 2 and 3.

        if (par.length == 0) {  //this is a rest
            if (beat == 1) { 
                restduration = 4; 
            } else if (beat == 2) {
                if (restduration == 4) {
                    restduration = 2;
                } else {
                    restduration = 4;
                }
             } else if (beat == 3) {
                if (restduration == 0) {
                    restduration = 4;
                } else
                if (restduration == 4) {
                    output.push("<rest dur=\"" + 4 + "\" xml:id=\"n" + i + "\"/>");
                    restduration = 4;
                } 
             } else if (beat == 4) { // end of bar
                if (restduration == 0) {
                    output.push("<rest dur=\"" + 4 + "\" xml:id=\"n" + i + "\"/>");
                } else
                if (restduration == 4) {
                    output.push("<rest dur=\"" + 2 + "\" xml:id=\"n" + i + "\"/>");
                } else
                if (restduration == 2) {
                    output.push("<rest dur=\"" + 1 + "\" xml:id=\"n" + i + "\"/>");
                } 
            } 
        } else { /* ASSUME NO CHORDS FOR NOW */
          if (restduration > 0) {
              if (beat == 4 && restduration == 2) {
                  output.push("<rest dur=\"" + 2 + "\" xml:id=\"n" + i + "\"/>");
                  output.push("<rest dur=\"" + 4 + "\" xml:id=\"n" + i + "\"/>");
              }  else {
                  output.push("<rest dur=\"" + restduration + "\" xml:id=\"n" + i + "\"/>");
                  restduration = 0;
              }
          }
          for (var n=0; n < par.length; n++) {
              var a = acci[pitch][ par[n] % 12 ];
              if (a != "") { a = "accid=\"" + a + "\" "; }
              output.push("<note pname=\"" + pnam[pitch][ par[n] % 12 ] + 
                       "\" " + a + "oct=\"" + 
                       (Math.floor(par[n] / 12) - 2).toString() + 
                       "\" xml:id=\"n" + i + "\" dur=\"4\"/>");
          }
        }
    }

    output.push("        </layer>");
    output.push("       </staff>");
    output.push("      </measure>");
    output.push("     </section>");
    output.push("    </score>");
    output.push("   </mdiv>");
    output.push("  </body>");
    output.push(" </music>");
    output.push("</mei>");

    /* metadata in XML comment */

    output.push("");
    output.push("<!-- MELD annotations");

    var meldBpm = document.getElementById("metaTempo").innerHTML;
    var meldTitle = document.getElementById("metaTitle").value;
    var meldId = document.getElementById("metaIdentifier").value;
    var meldKey = notes[tonic];
    var meldMode = keymode;
    var meldCreator = document.getElementById("metaCreator").value;

    if (meldCreator == "") { meldCreator = "Numbers Into Notes"; }

    output.push("!{");
    output.push("!  \"@type\": \"http://purl.org/ontology/mo/Score\",");
    output.push("!  \"http://localhost/NiN/firstNote\": \"" + firstnote + "\",");
    output.push("!  \"http://localhost/NiN/key\": \"" + meldKey + "\",");
    output.push("!  \"http://localhost/NiN/mode\": \"" + meldMode + "\",");
    output.push("!  \"http://localhost/NiN/lastNote\": \"" + lastnote + "\",");
    output.push("!  \"http://localhost/NiN/tempo\": \"" + meldBpm + "\",");
    output.push("!  \"http://purl.org/dc/elements/1.1/creator\": \"" + meldCreator + "\",");
    output.push("!  \"http://purl.org/dc/elements/1.1/title\": \"" + meldTitle + "\",");
    output.push("!  \"http://purl.org/ontology/mo/published_as\": { ");
    output.push("!    \"@id\": \"http://numbersintonotes.net/mei/" + meldId + ".mei\"");
    output.push("!  }");
    output.push("!}");

    output.push("-->");


    var rollbuffer = ""; // encodes text for copy and paste at client

    for (i=0; i < output.length; i++) {
        rollbuffer += output[i] + "\n";
    }
    document.getElementById("meitext").value = rollbuffer;
}

// Output MELD annotations (.rdf)

function outputMeld() {

    outputMei(); // force MEI to run as meld needs key informationd derived there

    // get first and last pitch class for meld metadata

    var imin = selected ? selleft : 0;
    var imax = selected ? selright : seqLen - 1;
    var allnotes = [];   // Make list of all notes as midi note numbers

    for (var i=imin; i <= imax; i++) {
        for (j=0; j < nRows; j++) {
            if (roll[i][nRows - j - 1] > (selected ? 1 : 0)) {
                allnotes.push(midiNotes[j]);
            }
        }
    }

    var firstnote = notes[allnotes[allnotes.length - 1] % 12];
    var lastnote = notes[allnotes[0] % 12];

    // get key info identified by outputMei

    var meldKey = notes[tonic];
    var meldMode = keymode;

    // read other metadata

    var meldBpm = document.getElementById("metaTempo").innerHTML;
    var meldTitle = document.getElementById("metaTitle").value;
    var meldId = document.getElementById("metaIdentifier").value;
    var meldCreator = document.getElementById("metaCreator").value;

    if (meldCreator == "") { meldCreator = "Numbers Into Notes"; }

    var output = [];

    output.push("{");
    output.push("  \"@type\": \"http://purl.org/ontology/mo/Score\",");
    output.push("  \"http://localhost/NiN/firstNote\": \"" + firstnote + "\",");
    output.push("  \"http://localhost/NiN/key\": \"" + meldKey + "\",");
    output.push("  \"http://localhost/NiN/mode\": \"" + meldMode + "\",");
    output.push("  \"http://localhost/NiN/lastNote\": \"" + lastnote + "\",");
    output.push("  \"http://localhost/NiN/tempo\": \"" + meldBpm + "\",");
    output.push("  \"http://purl.org/dc/elements/1.1/creator\": \"" + meldCreator + "\",");
    output.push("  \"http://purl.org/dc/elements/1.1/title\": \"" + meldTitle + "\",");
    output.push("  \"http://purl.org/ontology/mo/published_as\": { ");
    output.push("    \"@id\": \"http://numbersintonotes.net/meld/" + meldId + ".rdf\"");
    output.push("  }");
    output.push("}");


    var rollbuffer = ""; // encodes text for copy and paste at client

    for (i=0; i < output.length; i++) {
        rollbuffer += output[i] + "\n";
    }
    document.getElementById("meldtext").value = rollbuffer;
}

// W3C prov-n format

function outputProv() {

    var parameterString = "";
    for (var i=0; i < parameters.length; i++) {
        if (parameterString) { parameterString += ", "; }
        parameterString += "nin:" + parameters[i][0] + 
                           "=\"" + parameters[i][1] + "\"";
    }

    var output = [
        "// " + mTitle,
        "// " + mDate,
        "document",
        "// Stage 1 - Generate Integers",
        "prefix prov <http://www.w3.org/ns/prov#>",
        "prefix nin <http://www.nin.oerc.ox.ac.uk/var#>",
        "entity(nin:IntegerSequence)",
        "activity(nin:" + algorithm + (parameterString ? 
            ", [" + parameterString + "])" : ")"),
        "wasGeneratedBy(nin:IntegerSequence, nin:" + algorithm + ", -)",
        "// Stage 2 - Clock Arithmetic",
        "entity(nin:ModSequence)",
        "activity(nin:ReduceByModulus, [nin:mod=\"" + modulus + "\"])",
        "wasGeneratedBy(nin:ModSequence, nin:ReduceByModulus, -)",
        "used(nin:ReduceByModulus, nin:IntegerSequence, -)",
        "// Stage 3 - Play",
        "entity(nin:Selection)",
        "activity(nin:Select, [prov:type=\"edit\"" + 
            ", nin:count=\"" + mSelection_n + "\"" +
            ", nin:bl=\"" + mSelection_bl + "\"" +
            ", nin:tr=\"" + mSelection_tr + "\"])",
        "wasGeneratedBy(nin:Selection, nin:Select, -)",
        "used(nin:Select, nin:ModSequence, -)",
        "entity(nin:Composer)",
        "agent(nin:Composer, [prov:type=\"prov:Person\"])",
        "wasAssociatedWith(nin:Selection, nin:Composer, -)",
        "entity(nin:Notes)",
        "activity(nin:Map, [nin:pitch=\"" + pitch + "\", nin:octave=\"" 
                          + octave + "\", nin:scale=\"" + mScale + "\"])",
        "wasGeneratedBy(nin:Notes, nin:Map, -)",
        "used(nin:Map, nin:Selection, -)",
        "// Stage 4 - Export",
        "entity(nin:midi/" + mGuid + ", [prov:type=\"document\"])",
        "activity(nin:Export)",
        "wasGeneratedBy(nin:midi/" + mGuid + ", nin:Export, -)",
        "used(nin:Export, nin:Notes, -)",
        "endDocument",
        "// NumbersIntoNotes ID " + mGuid ];

    document.getElementById("provtext").value = output.join("\n");
}

// Output OAI-ORE annotations (.rdf)

// This is placeholder code for illustrative purposes only
// It is to be extended to be refined to use  Research Object formt or some other DMO format

function outputOre() {

    // read metadata

    var Id = document.getElementById("metaIdentifier").value;

    var output = [];

    output.push("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>");
    output.push("<rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"");
    output.push("         xmlns:ore=\"http://www.openarchives.org/ore/terms/\">");
    output.push("  <rdf:Description rdf:about=\"http://numbersintonotes.net/rdf/" + Id + ".rdf\">");
    output.push("    <ore:describes rdf:resource=\"http://numbersintonotes.net/dmo/" + Id + "\" />");
    output.push("  </rdf:Description>");
    output.push("  <rdf:Description rdf:about=\"http://numbersintonotes.net/dmo/" + Id + "\">");
    output.push("    <ore:isDescribedBy rdf:resource=\"http://numbersintonotes.net/midi/" + Id + ".mid\"/>");
    output.push("    <ore:isDescribedBy rdf:resource=\"http://numbersintonotes.net/mei/" + Id + ".rdf\"/>");
    output.push("    <ore:isDescribedBy rdf:resource=\"http://numbersintonotes.net/meld/" + Id + ".rdf\"/>");
    output.push("  </rdf:Description>");
    output.push("</rdf:RDF>");

    var rollbuffer = ""; // encodes text for copy and paste at client

    for (i=0; i < output.length; i++) {
        rollbuffer += output[i] + "\n";
    }
    document.getElementById("oretext").value = rollbuffer;
}

function doSubmit() {
    document.getElementById("exportform").submit();
}

function playNote(note) {
    piano.play(note, audioCtx.currentTime, 0.5);
}

// This createGuid code comes from 
// http://byronsalau.com/blog/how-to-create-a-guid-uuid-in-javascript/
// and was chosen for conciseness - there may be better solutions

function createGuid()
{
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

// initPage() is run when the body has loaded to reset textareas
// in case the browser reinstates them (e.g. loading a saved page).
// In principal the application state can be recovered from the DOM
// so exporting innerHTML may be a way of saving the experiment in
// future versions.

function initPage() {
    document.getElementById("sequence").innerHTML = "";
    document.getElementById("modsequence").value = "";
} 

// end of NotesIntoNumbers.js
// W3C prov-n format

function outputProv() {

    var parameterString = "";
    for (var i=0; i < parameters.length; i++) {
        if (parameterString) { parameterString += ", "; }
        parameterString += "nin:" + parameters[i][0] + 
                           "=\"" + parameters[i][1] + "\"";
    }

    var output = [
        "// " + mTitle,
        "// " + mDate,
        "document",
        "// Stage 1 - Generate Integers",
        "prefix prov <http://www.w3.org/ns/prov#>",
        "prefix nin <http://www.nin.oerc.ox.ac.uk/var#>",
        "entity(nin:IntegerSequence)",
        "activity(nin:" + algorithm + (parameterString ? 
            ", [" + parameterString + "])" : ")"),
        "wasGeneratedBy(nin:IntegerSequence, nin:" + algorithm + ", -)",
        "// Stage 2 - Clock Arithmetic",
        "entity(nin:ModSequence)",
        "activity(nin:ReduceByModulus, [nin:mod=\"" + modulus + "\"])",
        "wasGeneratedBy(nin:ModSequence, nin:ReduceByModulus, -)",
        "used(nin:ReduceByModulus, nin:IntegerSequence, -)",
        "// Stage 3 - Play",
        "entity(nin:Selection)",
        "activity(nin:Select, [prov:type=\"edit\"" + 
            ", nin:count=\"" + mSelection_n + "\"" +
            ", nin:bl=\"" + mSelection_bl + "\"" +
            ", nin:tr=\"" + mSelection_tr + "\"])",
        "wasGeneratedBy(nin:Selection, nin:Select, -)",
        "used(nin:Select, nin:ModSequence, -)",
        "entity(nin:Composer)",
        "agent(nin:Composer, [prov:type=\"prov:Person\"])",
        "wasAssociatedWith(nin:Selection, nin:Composer, -)",
        "entity(nin:Notes)",
        "activity(nin:Map, [nin:pitch=\"" + pitch + "\", nin:octave=\"" 
                          + octave + "\", nin:scale=\"" + mScale + "\"])",
        "wasGeneratedBy(nin:Notes, nin:Map, -)",
        "used(nin:Map, nin:Selection, -)",
        "// Stage 4 - Export",
        "entity(nin:midi/" + mGuid + ", [prov:type=\"document\"])",
        "activity(nin:Export)",
        "wasGeneratedBy(nin:midi/" + mGuid + ", nin:Export, -)",
        "used(nin:Export, nin:Notes, -)",
        "endDocument",
        "// NumbersIntoNotes ID " + mGuid ];

    document.getElementById("provtext").value = output.join("\n");
}

function doSubmit() {
    document.getElementById("exportform").submit();
}

function playNote(note) {
    piano.play(note, audioCtx.currentTime, 0.5);
}

// This createGuid code comes from 
// http://byronsalau.com/blog/how-to-create-a-guid-uuid-in-javascript/
// and was chosen for conciseness - there may be better solutions

function createGuid()
{
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

// initPage() is run when the body has loaded to reset textareas
// in case the browser reinstates them (e.g. loading a saved page).
// In principal the application state can be recovered from the DOM
// so exporting innerHTML may be a way of saving the experiment in
// future versions.

function initPage() {
    document.getElementById("sequence").innerHTML = "";
    document.getElementById("modsequence").value = "";
} 

// end of NotesIntoNumbers.js
