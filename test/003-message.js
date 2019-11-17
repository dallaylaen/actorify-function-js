
'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const actorify = require('../lib/actorify.js');

describe( 'actorify.Message', _ => {
    it( 'can toString', done => {
        actorify.demolish();

        const actor = new actorify.Actor( x => x );
        const msg   = new actorify.Message( actor, null, [ 42 ] );
    
        expect( msg.id ).to.equal( '0.1' );
        expect( msg.str() ).to.match(/\[0.1\].*\(42\)/);
        
        actorify.demolish();
        done();
    });
});


