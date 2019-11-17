'use strict';

// default callback
const noop = () => {};

const hookNames = ['onSend', 'onRecv', 'onSkip', 'onDone'];
let globalControl;

function GlobalControl(prev={}) {
    // shallow copy parent
    hookNames.forEach(name => this[name] = prev[name] || noop);
    this.onError = prev.onError || (ex => console.log(ex));
    this.runId   = prev.runId   || 0;
    this.msgId   = 0;

    this.reset   = () => globalControl = prev;
}

globalControl = new GlobalControl();

/*
 * Message class, really dumb
 */

function Message( actor, target, args ) {
    this.id         = globalControl.runId+'.'+ ++globalControl.msgId;
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

Message.prototype.str = function() {
    return '['+this.id+'] '
        +(this.target ? this.target + '.' : '')
        +this.actor.handler+'('
        +this.args.map(x=>JSON.stringify(x)).join(', ')
        +')';
};

function GlobalState(...initial) {
    initial.forEach(globalControl.onSend);

    const stack = [];
    const queue = initial;
    const seen  = {};
    let   i     = 0;
    this.push = msg => {
        msg.context = stack[stack.length-1];
        queue.push(msg);
        globalControl.onSend(msg);
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
                globalControl.onSkip(item);
                continue;
            }

            globalControl.onRecv(item);

            let ret;
            try {
                stack.push( { message: item, actor: actor } );
                actor.onEnter(item);
                ret = actor.handler.apply(item.target, item.args);
                actor.onLeave(item);
            } catch (e) {
                globalControl.onError(e);
            } finally {
                stack.pop();
                item.resolve(ret);
                globalControl.onDone(item);
            }
        }
        globalControl.runId++;
        globalControl.msgId = 0;
    };
}

// TODO one global var is enough?
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

let actorId = 0;
function Actor(handler, spec = {}) {
    this.id      = ++actorId;
    this.handler = handler;
    this.allow   = makePolicy( spec );
    this.onEnter = spec.onEnter || noop;
    this.onLeave = spec.onLeave || noop;

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
actorify.control = () => globalControl = new GlobalControl(globalControl);

module.exports = actorify;

