const gpraphql = require('graphql')
const apollo = require("apollo")
const request = require("request")
const net = require('net')

class Sync {
    constructor(_servers) {
        this.servers = _servers
        this.processed = []
        this.status = []
        this.beacons = []
        this.beaconErrors = []

        this.enumErrors = Object.freeze({"key": 0, "query": 1})
    }

    syncAll() {
        this.servers.forEach(function(x) {
            this.sync(x)
        }.bind(this));
    }

    retrieveBeacons(server) {
        let client = apollo.client({
            uri: 'http://' + this.servers.address + ":" + this.servers.port
                + "/emc"
        })
        let https = false;
        let checkForHttps = new Promise((resolveW, rejectW) => {
            let socket = new net.Socket({
                allowHalfOpen: false,
            })
            socket.connect(4454, server.address, () => {
                socket.write("info")
                socket.pipe()
            })
            let checkForHttpsInner = new Promise((resolve, reject) => {
                request.get("https://" + server.address + ":" + server.port +  "/emc?action=check", (error, response, body) => {
                    if(response.statusCode == 200 && JSON.parse(body).available) resolve(false)
                    else reject("https")
                })
            }).then((result) => {success = true}).catch((reason) => {
                success = false
            })
            let checkForHttp = new Promise((resolve, reject) => {
                request.get("https://" + server.address + ":" + server.port +  "/emc?action=check", (error, response, body) => {
                    if(response.statusCode == 200 && JSON.parse(body).available) resolve(false)
                    else reject("https")
                })
            })
        })
        client.query({query: gpraphql`{
            data(${server.key}, sync-retrieve-beacons) {
                success
                beacons
            }
        }`}).then(x => {
            if(x.data.success) {
                this.beacons.push({key: server.key, beacons: Array.from(x.beacons)})
            } else {
                this.beaconErrors.push({key: server.key, code: this.beaconErrors.query})
            }
        })
    }

    getCredentials() {

    }
    
}