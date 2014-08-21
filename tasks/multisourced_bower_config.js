/*
 * grunt-multisourced-bower-config
 * https://github.com/GerHobbelt/grunt-multisourced-bower-config
 *
 * Copyright (c) 2014 Ger Hobbelt
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var path = require('path');

  function apply_mapping(obj, mapping, options) {
    if (!obj) { 
      return;
    }

    for (var idx in obj) {
      if (obj.hasOwnProperty(idx)) {
        var m = mapping[idx];
        var v;
        if (m) {
          // A mapping exists for the given entry!
          // 
          // Now see whether the local path in the mapping does exist, i.e. is non-empty:
          v = null;
          if (grunt.file.isDir(m.local_path)) {
            // Also make sure the directory which allegedly contains the local clone of the repo
            // is non-empty:
            var list = grunt.file.expand(path.normalize(m.local_path + '/*'));
            if (list && list.length) {
              v = m.local_path.replace('\\', '/');
            }
          }
          if (!v) {
            v = m.git_url;
          }

          // Pick up the version/revision bit from the template ( http://bower.io/docs/api/#install )
          var rev = /#.+$/.exec(obj[idx]);
          if (rev) {
            v = v + rev[0];
          } else {
            // template may spec a straight version or version range *without* a path/uri
            rev = /^[^~><=]*\d+\./.exec(obj[idx]);
            if (rev) {
              // version expression
              v = v + '#' + obj[idx];
            } else {
              // direct version
              rev = /^\d+\.\d+\.\d+$/.exec(obj[idx]);
              v = v + '#' + obj[idx];
            }
          }

          // Patch the bower JSON config file
          obj[idx] = v;
        }
      }
    }
  }

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('multisourced_bower_config', 
        'Generate the bower configuration file from a template, ' +
        'picking local or remote source git submodule repository for each dependency. ' +
        'This enables you to create a working bower config file whether or not you have ' +
        'your set of submodules~dependencies cloned locally.', 
        function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      gitmodules_file: null,        // '.gitmodules',
      gitmodules_basedir: '.',      // base directory for the relative local paths in the .gitmodules mapping file
      custom_mapper: null,
      separator: ', '
    });

    // Iterate over all specified file groups.
    this.files.forEach(function(f) {
      var mapping = {};
      var mapping_size = 0;

      // Load the gitsubmodules file and decode it into a mapping hashtable, if it is specified:
      if (options.gitmodules_file) {
        if (!grunt.file.exists(options.gitmodules_file)) {
          grunt.log.error('Git Submodules file "' + options.gitmodules_file + '" not found.');
          return;
        }
        var submodulesdata = grunt.file.read(options.gitmodules_file);
        /*
        One entry looks like this:

        ```
        [submodule "php/lib/ultimatemysql"]
          path = php/lib/ultimatemysql
          url = git@github.com:Visyond/ultimatemysql.git
          ignore = dirty
        ```
        */
        var re1 = /\[submodule \"([^\"]+)\"\]([^\[]+)/gm;
        var re2 = /^\s*path\s*=\s*(.+)$/m;
        var re3 = /^\s*url\s*=\s*(.+)$/m;
        var re_getname = /.*?\/([^\/]+)$/m;
        var re_getname_alt = /.*?\/([^\/]+?)\.git$/m;
        var a1, mpath, mname, murl, mname_alt;
        do {
          a1 = re1.exec(submodulesdata);
          if (a1 && a1.length) {
            mname = re_getname.exec(a1[1])[1];
            mpath = re2.exec(a1[2]);
            murl = re3.exec(a1[2]);
            console.log('mname: ', mname, ', mpath: ', mpath && mpath[1], ', murl: ', murl && murl[1]);
            if (mname && mpath && mpath[1] && murl && murl[1]) {
              mname_alt = re_getname_alt.exec(murl[1]);
              if (mname_alt && mname_alt[1]) {
                mname_alt = mname_alt[1];
                if (mname_alt === mname) {
                  mname_alt = null;
                }
              } else {
                mname_alt = null;
              }
              mapping[mname] = {
                local_name: mname,
                name: mname_alt || mname,
                local_path: path.normalize(options.gitmodules_basedir + '/' + mpath[1]),
                git_url: murl[1]
              };
              if (mname_alt) {
                mapping[mname_alt] = {
                  local_name: mname,
                  name: mname_alt || mname,
                  local_path: path.normalize(options.gitmodules_basedir + '/' + mpath[1]),
                  git_url: murl[1]
                };
              }
              mapping_size++;
            }
          }
        } while (a1 && a1.length);
      }
      console.log('mapping hashtable: ', mapping);

      // Concat specified files.
      var src = f.src.filter(function(filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      }).map(function(filepath) {
        // Read file source.
        return grunt.file.read(filepath);
      }).join('\n\n');

      // Parse the result as JSON:
      var bower_cfg = JSON.parse(src);

      // Apply the mapping, if any:
      if (mapping_size) {
        apply_mapping(bower_cfg.dependencies, mapping);
        apply_mapping(bower_cfg.devDependencies, mapping);
      }

      // Write the destination file.
      grunt.file.write(f.dest, grunt.util.normalizelf(JSON.stringify(bower_cfg, null, 4)));

      // Print a success message.
      grunt.log.writeln('File "' + f.dest + '" created.');
    });
  });

};
