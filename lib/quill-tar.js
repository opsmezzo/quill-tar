/*
 * tar.js: Common utility functions for handling tarballs.
 *
 * (C) 2011, Isaac Schlueter
 * (C) 2012, Nodejitsu Inc.
 * Adapted from `npm` under MIT.
 *
 */

var events = require('events'),
    fs = require('fs'),
    path = require('path'),
    zlib = require('zlib'),
    async = require('utile').async,
    fstream = require('fstream'),
    Ignore = require('fstream-ignore'),
    readDirFiles = require('read-dir-files'),
    tar = require('tar'),
    uidnumber = require('uid-number');

//
// ### function pack (tarball, dir, files, callback)
// #### @options {Object} Options for creating this tarball.
// ####   @options.dir         {string} Directory to create tarball from
// ####   @options.ignoreFiles {Array} Set of additional ignore files
// ####   @options.ignoreRules {Object|Array} Set of additional ignore rules
//
// Returns a new tar+gzip stream for the specified `options`. By default
// will add `.gitignore` and `.quillignore` to the set of ignored files.
//
// Remark: Adapted from `npm` under MIT.
//
exports.pack = function (options) {
  if (!options || !options.dir) {
    throw new Error('options.dir is required to package a quill system tarball');
  }

  options.ignoreFiles = options.ignoreFiles || [];
  options.ignoreRules = options.ignoreRules || [];

  var called = false,
      ignore;

  function done(err) {
    if (called) {
      return;
    }

    called = true;
    callback(err);
  }

  function logErr(msg) {
    return function (err) {
      err.log = msg;
      done(err);
    }
  }

  var ignore = Ignore({
    path: options.dir,
    ignoreFiles: options.ignoreFiles.concat([
      '.quillignore',
      '.gitignore'
    ])
  });

  if (!Array.isArray(options.ignoreRules)
      && typeof options.ignoreRules === 'object') {
    options.ignoreRules = Object.keys(options.ignoreRules)
      .reduce(function (all, key) {
        all = all.concat(options.ignoreRules[key]);
        return all;
      }, []);
  }

  ignore.addIgnoreRules(options.ignoreRules, 'ignoreRules');

  return ignore
    .on('error', logErr('error reading ' + options.dir))
    //
    // By default, quill includes some proprietary attributes in the
    // package tarball.  This is sane, and allowed by the spec.
    // However, quill *itself* excludes these from its own package,
    // so that it can be more easily bootstrapped using old and
    // non-compliant tar implementations.
    //
    .pipe(tar.Pack({ noProprietary: true }))
    .on('error', logErr('tar creation error'))
    .pipe(zlib.Gzip())
    .on('error', logErr('gzip error'))
};

//
// ### function untar (tarball, target, options, callback)
// #### @tarball {string} Path of the tarball to untar.
// #### @target {string} Parent directory to untar into
// #### @options {Object} Options for untaring
// #### @callback {function} Continuation to respond to when complete
//
// Executes an `untar` operation on the specified `tarball` and places it
// in the `target` directory.
//
// Remark: Adapted from `npm` under MIT.
//
exports.unpack = function (tarball, target, options, callback) {
  var modes = options.modes,
      uid = options.uid,
      gid = options.gid,
      called = false,
      extractOptions,
      outputDir;

  //
  // Invokes the `callback` once.
  //
  function done(err) {
    if (!called) {
      called = true;
      return !err
        ? callback(null, path.join(target, outputDir))
        : callback(err);
    }
  }

  //
  // Logging macro.
  //
  function logErr(msg) {
    return function (err) {
      err.log = msg;
      done(err);
    }
  }

  //
  // Helper function for properly setting modes on files that
  // are extracted.
  //
  function extractEntry (entry) {
    if (!outputDir) {
      outputDir = entry.props && entry.props.path.split('/').shift();
    }

    //
    // never create things that are user-unreadable,
    // or dirs that are user-un-listable. Only leads to headaches.
    //
    var originalMode = entry.mode = entry.mode || entry.props.mode
    entry.mode = entry.mode | (entry.type === "Directory" ? modes.exed : modes.file)
    entry.mode = entry.mode & (~modes.umask)
    entry.props.mode = entry.mode

    if (originalMode !== entry.mode) {
      //
      // Should probably log this
      //
    }

    // if there's a specific owner uid/gid that we want, then set that
    if (process.platform !== "win32" &&
        typeof uid === "number" &&
        typeof gid === "number") {
      entry.props.uid = entry.uid = uid
      entry.props.gid = entry.gid = gid
    }
  }

  extractOptions = { type: 'Directory', path: target };

  if (process.platform !== "win32" &&
      typeof uid === "number" &&
      typeof gid === "number") {
    extractOptions.uid = uid
    extractOptions.gid = gid
  }

  fs.createReadStream(tarball)
    .on('error', logErr('Error reading: ' + tarball))
    .pipe(zlib.Unzip())
    .on('error', logErr('Unzip error: ' + tarball))
    .pipe(tar.Extract(extractOptions))
    .on('entry', extractEntry)
    .on('error', logErr('Failed unpacking: ' + tarball))
    .on('close', done);
};