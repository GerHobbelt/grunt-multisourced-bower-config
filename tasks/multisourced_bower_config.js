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

  function norm_submodule_path(dir, options) {
    if (grunt.file.isPathAbsolute(dir)) {
      return dir;
    }
    return path.normalize(options.gitmodules_basedir + '/' + dir).replace(/\\/g, '/');
  }

  function apply_mapping(obj, mapping, options) {
    if (!obj) { 
      return;
    }

    for (var idx in obj) {
      if (obj.hasOwnProperty(idx)) {
        var m = mapping[idx];
        var v, rev;
        if (m) {
          // A mapping exists for the given entry!
          // 
          // Now see whether the local path in the mapping does exist, i.e. is non-empty:
          v = null;
          //console.log('testing: ', m);
          if (grunt.file.isDir(m.local_path)) {
            // Also make sure the directory which allegedly contains the local clone of the repo
            // is non-empty:
            var list = grunt.file.expand(path.normalize(m.local_path + '/*'));
            //console.log('CHECK: ', m.local_path, list);
            if (list && list.length) {
              v = m.local_path;
            }
          }
          if (!v) {
            v = m.git_url;
          }

          // Pick up the version/revision bit from the template ( http://bower.io/docs/api/#install )
          rev = /#.+$/.exec(obj[idx]);
          if (rev) {
            rev = rev[0];
          } else {
            // template may spec a straight version or version range *without* a path/uri
            rev = /^[~><=^]?\d+\./.exec(obj[idx]);
            if (rev) {
              // version expression
              rev = '#' + obj[idx];
            } else {
              // direct version
              rev = /^\d+\.\d+\.\d+$/.exec(obj[idx]);
              if (rev) {
                rev = '#' + obj[idx];
              } else {
                rev = '';
              }
            }
          }
        } else {
          v = obj[idx];
          rev = '';
        }

        // Patch the bower JSON config file
        obj[idx] = options.custom_map_function(obj, idx, v, rev, options);
      }
    }
  }

  // Default 'custom mapper' function
  function default_mapper(obj, idx, v, rev, options) {
    return v + rev;
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
      gitmodules_basedir: null,     // base directory for the relative local paths in the .gitmodules mapping file; default: path to the gitmodules_file itself
      custom_mappings: null,        // NULL or OBJECT which contains key-value pairs: key=package_name, value = { local_path: ..., git_url: ... }
      custom_map_function: default_mapper
    });

    // Set the gitmodules_basedir if it wasn't set already:
    if (!options.gitmodules_basedir) {
      options.gitmodules_basedir = (options.gitmodules_file || '').replace('\\', '/').replace(/[^\/]+$/, '');
      if (options.gitmodules_basedir === '') {
        options.gitmodules_basedir = '.';
      }
    }

    // Fix/set default map function when the custom mapping function has not been specified
    if (typeof options.custom_map_function !== 'function') {
      grunt.log.warn('Invalid option.custom_map_function value; using the default mapper.');
      options.custom_map_function = default_mapper;
    }

    //console.log('options: ', options);

    // Iterate over all specified file groups.
    this.files.forEach(function(f) {
      var mapping = {};

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
            //console.log('mname: ', mname, ', mpath: ', mpath && mpath[1], ', murl: ', murl && murl[1]);
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
                local_path: norm_submodule_path(mpath[1], options),
                git_url: murl[1]
              };
              if (mname_alt) {
                mapping[mname_alt] = {
                  local_name: mname,
                  name: mname_alt || mname,
                  local_path: norm_submodule_path(mpath[1], options),
                  git_url: murl[1]
                };
              }
            }
          }
        } while (a1 && a1.length);
      }
      //console.log('mapping hashtable: ', mapping);

      // Add the custom mappings, if any
      for (var idx in options.custom_mappings) {
        if (options.custom_mappings.hasOwnProperty(idx)) {
          mapping[idx] = options.custom_mappings[idx];
        }
      }

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
      apply_mapping(bower_cfg.dependencies, mapping, options);
      apply_mapping(bower_cfg.devDependencies, mapping, options);

      // Write the destination file.
      grunt.file.write(f.dest, grunt.util.normalizelf(JSON.stringify(bower_cfg, null, 4)));

      // Print a success message.
      grunt.log.writeln('File "' + f.dest + '" created.');
    });
  });

};
