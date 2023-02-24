const struct = require('shared-structs')
const interop = require('./build/Release/obj.target/module')

class Interop {
    constructor() {
        this.struct = struct(`
        struct shared {
            char station_key[8400];
            char vendor_key[8400];
            char params[512];
            char operation[64];
        };
        `).shared()
        this.error = null
        this.done = false
        this.result = null
    }
    customAction(action, params, station_key = null, vendor_key = null) {
        this.struct.operation.write(action, 0, "utf-8")
        this.struct.params.write(params, 0, "utf-8")
        if(station_key != null) this.struct.station_key.write(station_key, 0, "utf-8")
        if(vendor_key != null) this.struct.vendor_key.write(vendor_key, 0, "utf-8")
    }

    async execSync() {
        this.error = false
        console.log('here4')
        await interop.generator(this.struct.rawBuffer).then((result) => {
            console.log(result+ "here3")
            this.result = result
        }, (err) => {
            this.error = true
        })
        return this.result
    }
}
module.exports = {Interop}
