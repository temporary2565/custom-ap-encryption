const path = require('path')
const fs = require('fs')

class Configuration {
    constructor() {
        this.appdata = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + "/.config")
        this.defaultConfig = {
            "saved": [],
            "server": "localhost:4000",
            "token": "",
            "interface": "wlan0"
        }
        this.data = Object.assign({}, this.defaultConfig)
        console.log(this.appdata)
        if(!fs.existsSync(path.join(this.appdata, "resonance"))) fs.mkdirSync(path.join(this.appdata, 'resonance'))
        if(fs.existsSync(path.join(this.appdata, "resonance", "main.cfg"))) this.read()
        else this.save()
    }

    save() {
        if(fs.existsSync(path.join(this.appdata, "resonance", "main.cfg")))
            fs.unlinkSync(path.join(this.appdata, "resonance", "main.cfg"))
        fs.writeFileSync(path.join(this.appdata, "resonance", "main.cfg"), JSON.stringify(this.data))
    }

    read() {
        let data = null
        try{
            if(fs.existsSync(path.join(this.appdata, "resonance", "main.cfg")))
            data = JSON.parse(fs.readFileSync(path.join(this.appdata, "resonance", "main.cfg")))
        } catch(err) {}
        if(data !== null)
            this.data = data
    }
}

module.exports = {Configuration}
