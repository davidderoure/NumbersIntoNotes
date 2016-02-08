// ada-bernoulli
// From https://gist.github.com/terotil/3f83a473f372d31f55d5
// "Calculate Bernoulli numbers using the same algorightm Ada Lovelace 
// used 1842 in the first ever computer program"
// By Tero Tilus
// MIT License
// Uses lb-ratio https://github.com/LarryBattle/Ratio.js

/**
 * Calculate n:th Bernoulli number using the same algorightm Ada
 * Lovelace used 1842 in the first ever computer program.
 *
 * Examples:
 *
 *     adaBernoulliNumber(0);
 *     // => -0.5
 *
 * @param {Number} n
 * @return {Ratio}
 * @api public
 */
function adaBernoulliNumber(n) {
  var termArgument, termBnIndex, termCount, termIndex, termSum, termVal;
  switch (false) {
    case !(n <= 0):
      throw "Positive index expected, got " + n;
    case !((n % 2) === 0):
      // All even (in Ada's indexing) Bernoulli numbers are zero
      return Ratio();
    default:
      // count of non-zero terms in addition to A0 in Ada's formula (8.)
      termCount = (n - 1) / 2;

      // value for which the n:th polynomial term equals 1 in Ada's formula (8.)
      termArgument = termCount + 1;

      // value of polynomial term A0
      termSum = Ratio(-1, 2).multiply(Ratio(2 * termArgument - 1,
                                            2 * termArgument + 1));

      // sum the polynomial term values of further terms
      for (termIndex = 0; termIndex <= termCount - 1; ++termIndex) {
        termBnIndex = 2 * termIndex + 1; // the index of term's Bernoulli number
        termVal = polynomialTerm(termBnIndex, termArgument);

        termSum = termSum.add(adaBernoulliNumber(termBnIndex).multiply(termVal));
      }
      // Finding Bn using the equation (8.) results in all the terms
      // on opposite side of Bn, thus the switch of sign.
      return termSum.negate().simplify();
  }
}

/**
 * Calculate value of the polynomial multiplier term of given `degree`
 * for given value of `n`.
 */
function polynomialTerm(degree, n) {
  var denominator, i, numerator;
  numerator = 1;
  denominator = 1;
  for (i = 0; i < degree; ++i) {
    numerator *= 2 * n - i;
    denominator *= 2 + i;
  }
  return Ratio(numerator, denominator).simplify();
}
