/*
 * tar-test.js: Tests for working with tarballs.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    vows = require('vows'),
    utile = require('utile'),
    async = utile.async,
    rimraf = utile.rimraf,
    readDirFiles = require('read-dir-files'),
    quillTar = require('../lib/quill-tar');

var fixturesDir = path.join(__dirname, 'fixtures'),
    placeDir = path.join(fixturesDir, 'untar');

//
// Remove any existing untared directories for idempotency.
//
fs.readdirSync(placeDir).filter(function (file) {
  return fs.statSync(path.join(placeDir, file)).isDirectory();
}).forEach(function (dir) {
  try { rimraf.sync(path.join(placeDir, dir)); }
  catch (err) { }
});

function assertIncludesAll(base, target) {
  for (var i = 0; i < base.length; i++) {
    assert.include(base, target[i]);
  }
}

vows.describe('quill-tar').addBatch({
  "When using quill-tar": {
    "the unpack() method": {
      topic: function () {
        quillTar.unpack(
          path.join(fixturesDir, 'fixture-one.tgz'),
          placeDir,
          {
            modes: {
              exec: 0777 & (~022), 
              file: 0666 & (~022),
              umask: 022
            }
          },
          this.callback
        );
      },
      "should create the correct directory": function (err, target) {
        assert.isNull(err);
        assert.isTrue(target.indexOf('/fixture-one') !== -1)
      },
      "should extract the correct files": {
        topic: function () {
          async.map([
            path.join(placeDir, 'fixture-one'),
            path.join(fixturesDir, 'fixture-one')
          ], function (dir, next) {
            readDirFiles.list(dir, { normalize: false }, next)
          }, this.callback);
        },
        "which match the fixture files": function (err, lists) {
          assert.isNull(err);
          assertIncludesAll(lists[0], lists[1]);
        }
      }
    }
  }
}).export(module);