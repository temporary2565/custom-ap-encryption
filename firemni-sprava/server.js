const express = require("express")
const path = require("path")
const crypto = require("crypto")
const EventEmitter = require('events')

class Main extends EventEmitter {
    constructor(_configRef) {
        this.configRef = _configRef
        this.startServer()
    }
    startServer() {
        this.app = express()
        app.use(express.static(path.join(__dirname, './mconweb/dist/mconweb')))
        app.use(express.json())
        this.app.listen(19321)
        this.app.get("/api", (req, resp) => {
            resp.status(200).send("f")
        })
        this.emit("serverStarted")
    }
}