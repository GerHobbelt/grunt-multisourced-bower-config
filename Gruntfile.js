/*
 * grunt-multisourced-bower-config
 * https://github.com/GerHobbelt/grunt-multisourced-bower-config
 *
 * Copyright (c) 2014 Ger Hobbelt
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp']
    },

    // Configuration to be run (and then tested).
    multisourced_bower_config: {
      default_options: {
        options: {
        },
        files: {
          'tmp/default_options/bower.json': ['test/fixtures/bower-template.json']
        }
      },
      custom_options: {
        options: {
          // Use the gitmodules file as a mapping source
          gitmodules_file: 'test/fixtures/gitmodules-file',
          custom_mappings: {
          }
        },
        files: {
          'tmp/custom_options/bower.json': ['test/fixtures/bower-template.json']
        }
      },
      custom_mapper_options: {
        options: {
          // Use the gitmodules file as a mapping source
          gitmodules_file: 'test/fixtures/gitmodules-file',
          custom_mappings: {
            "jquery": {
              local_path: "lib/local.yokel",
              git_url: 'git:nada'
            }            
          },
          custom_map_function: function cmf(obj, idx, v, rev, options) {
            var rv = v + rev;
            return rv.replace('2', '. .blubba.blob. .');
          }
        },
        files: {
          'tmp/custom_mapper_options/bower.json': ['test/fixtures/bower-template.json']
        }
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js']
    }
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'multisourced_bower_config', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);
};
