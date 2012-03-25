# quill-tar

`quill-tar` contains utility functions for packing and unpacking quill `system` tarballs. 

## Motivation

Unpacking `system` tarballs is a fundamental piece of functionality that will be reused in multiple parts of [conservatory][0]

## Usage

There are two core methods:

* `quillTar.pack(tarball, dir, files, callback)`

``` 
@tarball {string|Stream} Location of the tarball to create or stream to pipe to.
@dir {string} Base directoty the tarball is being created from.
@files {Array} List of files to include in the tarball
@callback {function} Continuation to respond to when complete.
```

* `quillTar.unpack(tarball, target, options, callback)`

```
@tarball {string} Path to the tarball to untar.
@target {string} Parent directory to untar into
@options {Object} Options for untaring
@callback {function} Continuation to respond to when complete
```  
  
Lets take a look at some sample usage:

``` js
  var quillTar = require('quill-tar');
  
  quillTar.unpack(
    '/path/to/some/tarball.tgz',
    '/parent/dir/to/untar/into,
    {
      modes: {
        exec: 0777 & (~022), 
        file: 0666 & (~022),
        umask: 022
      }
    },
    function (err, target) {
      //
      // This will output the absolute path of the directory
      // processed by `quill-tar`
      //
      console.dir(target);
    }
  );
```

## Installation

### Installing npm (node package manager)

``` bash
  $ curl http://npmjs.org/install.sh | sh
```

### Installing quill-tar

``` bash
  $ npm install quill-tar
```

## Tests

All tests are written with [vows][1]:

``` bash
  $ npm test
```

## Authors
[Nodejitsu Inc][2]

## License Attribution

* (C) 2011, Isaac Schlueter
* (C) 2012, Nodejitsu Inc. 
* Adapted from [npm][3] under MIT. 
* Adapted License: **Private and not Open Source**

[0]: http://github.com/nodejitsu/conservatory
[1]: http://vowsjs.org
[2]: http://nodejitsu.com
[3]: http://npmjs.org