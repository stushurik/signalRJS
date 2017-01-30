var fs = require('fs');
var path = require('path');
var assert = require('assert');
var hubScriptFactory = require('../../lib/hubs/hubScriptFactory');

function removeLineBreaksAndSpaces(str) {
    return str.replace(/(\n|\s|\t)/gm, '')
}

describe('', function () {
    it('', function (done) {
        const hubDefin = {
            name: 'hubName',
            functions: {
                func1: function () {
                },
                func2: function () {
                }
            }
        };
        hubScriptFactory.create([hubDefin]).then(function (script) {
            //fs.writeFileSync(path.resolve(__dirname)+'/actual.js',script);
            fs.readFile(path.resolve(__dirname + '/expectedHubOutput.js'), function (err, data) {
                assert.equal(removeLineBreaksAndSpaces(script), removeLineBreaksAndSpaces(data.toString()));
                done(err);
            });
        });
    });
});