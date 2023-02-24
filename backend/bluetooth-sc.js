const noble = require('noble')
const bleno = require('bleno')

noble.on("stateChange", (state) => {
    if(state == "poweredOn") {
        noble.startScanning();
    }
})

noble.on("discover", (peripheral) => {
    
})