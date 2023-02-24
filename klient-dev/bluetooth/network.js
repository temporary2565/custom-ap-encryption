const process = require('process')
const EventEmitter = require('events')
let nmDbus = null, winWifi = null
if(process.platform == "linux" || process.platform == "freebsd")
    nmDbus = require('nm-dbus-native')
else if(process.platform == "win32")
    winWifi = require('wifi-list-windows')

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
        } else if(process.platform === 'win32') {
            winWifi(function(err, networks) {
                let tmp = []
                if(!err) {
                    for(let item of networks) {
                        //tmp.push({HwAddress: })
                    }
                }
            })
        }
    }

    connect() {
        
    }
    getNMInterfaces() {
            this.interval = setInterval(function(){
                if(!this.hasInterfaces) {
                    try{
                        if(nmready) {
                            this.hasInterfaces = true
                            console.log([Object.assign({},nmDbus.interfaces), Object.keys(Object.assign({},nmDbus.interfaces))])
                            let tmp = Object.assign({}, nmDbus.interfaces)
                            this.interfaces = Object.keys(tmp).filter(x=>x!="lo")
                            console.log(Object.keys(tmp).indexOf('lo'))
                            console.log("here")
                            this.emit('hasInterfaces', this.interfaces)
                            console.log(this.interfaces)
                            clearInterval(this.interval)
                            this.interval = null
                        }
                    } catch (err) {console.log(err)} 
                }
            }.bind(this), 200)
        }
}

if(process.platform === "linux" || process.platform === "freebsd")
nmDbus.dbusConnect((input) => {
    nmready = true
})

module.exports = {Connection}
