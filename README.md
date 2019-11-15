# NAME

`actorify` - convert function calls to message passing, transparently.

# DESCRIPTION

Suppose we have a collection of variables and a change in one of them
may or may not affect the state of the others.
How to make sure that change propagation terminates?

Message passing is one of the possible ways.
_(The best, ofcourse, being not using interconnected mutable state at all.)_

This module allows to replace a function with a message-passing _proxy_
that ensures that the same message is not being processed again.

# A STUPID EXAMPLE

Consider the following object:

```javascript
    const actorify = require('./lib/actorify.js');

    /* Let's add some unneeded complexity & data duplication */
    /* Invariant: `word` is always `prefix`+':'+`suffix` */
    const obj = {
        prefix: "foo",
        suffix: "bar",
        word:   "foo:bar",
        setPrefix: function(s) { 
             this.prefix = s; 
             this.setWord( s + ":" + this.suffix );
        },
        setSuffix: function(s) {
             this.suffix = s;
             this.setWord( this.prefix + ":" + s );
        },
        setWord: function(s) {
            const parts = s.match(/^(.*):(.*)$/);
            if (!parts)
                throw "Word must have a colon in it";
            this.word = s;
            // note the circular references
            this.setPrefix(parts[1]);
            this.setSuffix(parts[2]);
        },
    };

    // If this line is commented out, the next line hangs
    obj.setWord = actorify( obj.setWord );

    obj.setSuffix(42);
    console.log(obj);
```

_Note that this `obj` is designed poorly because it contains
the same information twice.
However, state deduplication may be tricky or downright impossible
if there are more objects, and the internals of them are out of control._

What happens here is that `setWord` is replaced by a message-passing proxy
function. Upon receiving an argument, instead of executing immediately,
it will enqueue a _message_.
The same message will not be processed twice, and thus the circular calls
to `setWord` by `setPrefix` and `setSuffix` will be ignored.

# LICENSE AND COPYRIGHT

Copyright (c) 2019, Konstantin Uvarin.

This program is free software, available under MIT license.

