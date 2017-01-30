'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
    create: createFileReader
}


function createFileReader(path) {
    let cache = ''

    return read

    function read() {
        if (cache) {
            return Promise.resolve(cache)
        }

        return new Promise((resolve, reject) => {
            fs.readFile(path, (err, data) => {
                if (err) {
                    reject(err)
                } else {
                    cache = data
                    resolve(data)
                }
            })
        })
    }
}