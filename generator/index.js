const struct = require('shared-structs')
const utf8 = require('utf8');
const interop = require('./build/Release/obj.target/module')
const path = require('path')
const fs = require('fs')

const buf = Buffer.alloc(Number(interop.sizeof_test))

// `-----BEGIN PUBLIC KEY-----
// MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAv/7u9bT5faCy36kYtwgM
// S34EXR85fSzn42bsl++IwpLCBr0e2oNjw7x0k0nXA2/87ak+Qxi5FwRhbMM32RJF
// wMGeN51wadNlkL3C/Xc13h20YM5oY7rs1ohTXRwzPD1c58t8PxYSJh3xSNdGUQ6Q
// jkVGtZProbP0ZwtioWo63fdlki+lVuwv3c6TD5v/7Mz63mHLrbJt9xLZ6crQ35p0
// i7bK1NFVoVSbKpigxVpiIZngdFnup8lLy+dbDB9oxbVJ6psSbuUlag9d66y1vSzt
// rPPiDMDb+tRTYP0A2yq05r23f8Q/RjmNLyy8pg9Hqj8I3IEn1gEZ4AxI6KYk17yC
// 6puYEg6LPqrXs5fcEhTRb0Woz5h3040ltYk9w44Cb+IlMMaHa3Ok76jCnOfMz04e
// xIoB54lrVtZYTnlqjxk9qgqqenFC+HMZcoScjWvOdr5gIwgdaPpMWUW5rhAHzuCz
// iEuP8GZtQeqIEGGit+5aa1GCTCJToFUxFtj5onWS8vbeiKIuzL4ZJCdZJ0jPubEW
// f0Zbg1NZ6CYJAq15lLAEzc84DJMrvtPuEh9EeIExrTd1pURpVSh01TVMBNlUs8Ut
// EMsxSDdH7ViIImK5Pp/NbvzGjlCEgLhUQgMG3wxOWPo4+1hwpjRqCEffog4t5iZA
// /BfQLVJymKLPycJFBmisIYcCAwEAAQ==
// -----END PUBLIC KEY-----`

const str = struct(`
struct shared {
    char station_key[8400];
    char vendor_key[8400];
    char params[512];
    char operation[64];
};
`)

console.log(fs.readFileSync('../keys2/pub_station.pem', {encoding: "utf-8"}).toString())

const test = str.shared()
test.operation.write("pair_gen", 0, "utf-8")
test.params.write("233322223311", 0, "utf-8")
test.station_key.write(fs.readFileSync('../keys2/pub_station.pem', {encoding: "utf-8"}).toString(), 0, "utf-8")
test.vendor_key.write(fs.readFileSync('../keys/pub_vendor.pem', {encoding: "utf-8"}).toString(), 0, "utf-8")


interop.generator(test.rawBuffer).then(console.log, console.error)

//pr.then((data) =>{
/*const test2 = struct(`
struct shared {
    char station_key[8400];
    char vendor_key[8400];
    char params[512];
    char operation[64];
};
`).shared()*/

//test2.params.write(data)
//test2.station_key.write(fs.readFileSync('../keys/priv_station.pem', {encoding: "utf-8"}), 0, "utf-8");
//test2.vendor_key.write(fs.readFileSync('../keys/priv_vendor.pem', {encoding: "utf-8"}), 0, "utf-8");
//interop.generator(test2.rawBuffer).then(console.log, console.error)
//})