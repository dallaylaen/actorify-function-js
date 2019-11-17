'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const actorify = require('../lib/actorify.js');

describe( 'actotify.hooks', _ => {
    it ('has onSend, onRevc, onSkip, and onDone', done => {
        // Hooks are currently global, so must reset before testing :(
        const control = actorify.control();

        let trace = [];
        control.onSend = msg => trace.push( "send "+ msg.id+ " "+msg.args[0] );
        control.onRecv = msg => trace.push( "recv "+ msg.id+ " "+msg.args[0] );
        control.onSkip = msg => trace.push( "skip "+ msg.id+ " "+msg.args[0] );
        control.onDone = msg => trace.push( "done "+ msg.id+ " "+msg.args[0] );
        control.runId = 0;

        const obj = {};
        obj.rec = actorify( n => obj.rec(n-1) );
        obj.rec(42);

        expect( trace ).to.deep.equal([
            'send 0.1 42',
            'recv 0.1 42',
            'send 0.2 41',
            'done 0.1 42',
            'skip 0.2 41',
        ]);

        control.reset(); // don't leave hooks behind
        done();
    });
});
