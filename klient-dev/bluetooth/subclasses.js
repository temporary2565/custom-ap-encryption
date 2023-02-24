const {spawnSync} = require("child_process")
const {Interop} = require("./interop")

class RetrievedTime {
    constructor() {
        this.hasHash = false
        this.hasResult = false
        this.hash = null
        this.result = null
        this.difficulty = 3
        this.variance = 0
    }
    computeTime() {
        if(!this.hasHash) return
        let tmp
        let tmpjson
        try {
            /*tmp = spawnSync(this.generatorPath ,["time_parse", this.hash.hash+",000000000,0"+this.difficulty], {stdio:'pipe', encoding:'utf-8'}).output
            console.log([["time_parse", this.hash.hash+",000000000,0"+this.difficulty],tmp,"here2"])*/

            let tmpInScope2 = new Interop()
            tmpInScope2.customAction("time_parse", this.hash.hash+",000000000,0"+this.difficulty)
            tmp = tmpInScope2.execSync();
            console.log(tmpInScope2)
            tmpjson = JSON.parse(tmp)
        } catch(err) {console.log(err)}
        if(typeof tmpjson == "undefined" ||
        typeof tmpjson.value == 'undefined' ||
        typeof tmpjson.value.result == 'undefined' ||
        tmpjson.value.error) return
        this.result = tmpjson.value.result
        this.hasResult = true
    }
}

module.exports = {RetrievedTime: RetrievedTime}