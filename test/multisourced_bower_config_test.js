'use strict';

var grunt = require('grunt');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports.multisourced_bower_config = {
  setUp: function(done) {
    // setup here if necessary
    done();
  },
  default_options: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/default_options/bower.json');
    var expected = grunt.file.read('test/expected/default_options/bower.json');
    test.equal(actual, expected, 'should describe what the default behavior is.');

    test.done();
  },
  custom_options: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/custom_options/bower.json');
    var expected = grunt.file.read('test/expected/custom_options/bower.json');
    test.equal(actual, expected, 'should describe what the custom option(s) behavior is.');

    test.done();
  },
  custom_mapper_options: function(test) {
    test.expect(1);

    var actual = grunt.file.read('tmp/custom_mapper_options/bower.json');
    var expected = grunt.file.read('test/expected/custom_mapper_options/bower.json');
    test.equal(actual, expected, 'should describe what the custom option(s) behavior is when the custom mapping function is used.');

    test.done();
  },
};
