'use strict';

/*
 * Message class, really dumb
 */

let msgId = 0;
function Message( actor, target, args ) {
    this.id         = ++msgId;
    this.actor      = actor;
    this.target     = target;
    this.args       = args;
    this.context    = undefined;

    const me = this;
    this.promise    = new Promise(done => {
        // squash promises
        me.resolve = arg => (arg instanceof Promise) ? arg.then(done) : done(arg);
    });
}

/*
 *  Convert a spec object into function that returns true
 *  if message is worth processing
 */
function makePolicy(spec) {
    // only one for now
    const maxdepth = spec.maxdepth || 1;
    return function(seen) {
        if (seen.count !== undefined)
            return ++seen.count < maxdepth;
        seen.count = 0;
        return true;
    };
}

function GlobalState(...initial) {
    const stack = [];
    const queue = initial;
    const seen  = {};
    let   i     = 0;
    this.push = msg => {
        msg.context = stack[stack.length-1];
        queue.push(msg);
    };
    this.run = function() {
        for (; i< queue.length; i++) {
            const item  = queue[i];
            const actor = item.actor;

            // check if the message should be let through
            if (!seen[actor.id])
                seen[actor.id] = {};
            if (!actor.allow( seen[actor.id], item )) {
                item.resolve();
                continue;
            }

            try {
                stack.push( { message: item, actor: actor } );
                actor.onEnter(item);
                const ret = actor.handler.apply(item.target, item.args);
                actor.onLeave(item);
                item.resolve(ret);
            } finally {
                stack.pop();
            }
        }
    };
}

let globalState;
function propagate(msg) {
    if (globalState !== undefined) {
        globalState.push(msg);
    } else {
        globalState = new GlobalState(msg);
        try {
            globalState.run();
        } finally {
            globalState = undefined;
        }
    }

    return msg.promise;
}

const I = x => x; // I combinator - used as default noop

let actorId = 0;
function Actor(handler, spec = {}) {
    this.id      = ++actorId;
    this.handler = handler;
    this.allow   = makePolicy( spec );
    this.onEnter = spec.onEnter || I;
    this.onLeave = spec.onLeave || I;

    const me = this;

    this.proxy = function(...args) {
        const msg = new Message( me, this, args );
        return propagate(msg);
    };
}

// TODO better name?
function actorify(fun, spec) {
    return new Actor(fun, spec).proxy;
}
actorify.Actor = Actor;
actorify.Message = Message;

module.exports = actorify;

