const nmDbus = require('nm-dbus-native')
const process = require('process')
const EventEmitter = require('events')
let nmready = false

class Connection extends EventEmitter {
    constructor() {
      super();
       this.completed = false
       this.toFind = []
       this.list = []
       this.hasData = false
       this.interfaces = []
       this.interface = ""
       this.hasInterfaces = false
       this.interval = null
    }

    scan() {
        this.list = []
        if(process.platform === "linux" || process.platform === "freebsd") {
            let var1 = nmDbus.getWifi()
            for(let item of var1) {
                if(toFind.map(x=>x.toString().toUpperCase().replace(':', '')).includes(item.HwAddress.toString().toUpperCase().replace(':', ''))) {
                    this.list.push(item)
                }
            }
            completed = true
        } else if(process.platform === 'win32') {}
    }

    connect() {
        
    }
    getNMInterfaces() {
        if(nmready == true) {
            this.interval = setInterval(function(){
                if(!this.hasInterfaces) {
                    try{
                        if(nmready) {
                            this.hasInterfaces = true
                            this.interfaces = Object.keys(nmDbus.interfaces).inludes('lo') ? Object.keys(nmDbus.interfaces).splice(Object.keys(nmDbus.interfaces).indexOf('lo'), 1) : Object.keys(nmDbus.interfaces)
                            this.emit('hasInterfaces', this.interfaces)
                        }
                    } catch (err) {} 
                }
            }.bind(this), 200)
        }
    }
}

if(process.platform === "linux" || process.platform === "freebsd")
nmDbus.dbusConnect((input) => {
    nmready = true
})

module.exports = {Connection}
