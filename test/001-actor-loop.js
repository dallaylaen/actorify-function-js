'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const Actor = require('../lib/actor.js');

console.log( Actor );

describe( 'Actor', _=>{
    it( 'can call smth', done => {
        const trace = [];
        const actor = new Actor({ foo : function(txt) { trace.push(txt) } });
        actor.call( "foo", [ 42 ] );
        expect( trace ).to.deep.equal([42]);
        done();
    });

});

