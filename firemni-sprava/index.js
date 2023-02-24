const client = require("./client")
const config = require("./config")
const express = require("express")
const xpu = require('express-fileupload')
const j2x = require('json2xls')
const yamljs = require('yamljs')
const xmljs = require('xml-js')
const path = require("path")
const rss = require("rss-generator")

let configInstance = new config("./")
process.on("uncaughtException", function(x) {})
//process.on("uncaughtException", function(x) {configInstance.errors.push("Uncaught exception in the backend process, details: "+x.toString()+", origin: config")}.bind(this))

let app = express()

app.use(j2x.middleware)
app.use(xpu({
limits: { fileSize: 50 * 1024 },
}));
app.use(express.static(path.join(__dirname, './mconweb/dist/mconweb')))
app.use(express.json())
app.post("/api", (req, resp) => {
    if(typeof req.body.action != 'undefined') {
        resp.status(200).send(configInstance.relayCommand(req.body.session, req.body.action, typeof req.body.value != "undefined" ? req.body.value : null))
    } else {
        resp.status(200).send({ authenticated: false })
    }
})
app.get("/export", (req,resp)=>{
    if(typeof req.query.session!="undefined"&&typeof req.query.format!="undefined")
        if(configInstance.isAuthenticated(req.query.session)) {
            switch(req.query.format) {
                case "xml":
                    resp.send(xmljs.json2xml(JSON.stringify(configInstance.mainConfig.essential)), {compact:true})
                    break;
                case "json":
                    resp.set("Content-Disposition", "attachment;filename=export.json");
                    resp.send(JSON.stringify(configInstance.mainConfig.essential));
                    break;
                case "xls":
                    resp.xls("export.xls", configInstance.mainConfig.essential);
                    break;
                case "yaml":
                    resp.set("Content-Disposition", "attachment;filename=export.yaml");
                    resp.send(YAML.stringify(configInstance.mainConfig.essential));
                    break;
                default:
                    resp.status(200).send("Neznámý formát<script type='text/javascript'>window.close()</script>")
                    break;
            }
        } else {
            resp.status(200).send({authenticated: false})
        }
    else resp.status(200).send("Neznámý formát<script type='text/javascript'>window.close()</script>")
})

app.post("/import", (req,resp)=>{
    if(typeof req.body.session!="undefined"&&configInstance.isAuthenticated(req.body.session))
        if(typeof req.body.format!="undefined"&&req.files.length == 1) {
            try {
                let data 
                switch(req.body.format) {
                    case "xml":
                        data = xmljs.xml2js(req.files[0].data.toString("utf-8"), {compact: true})
                        if(!(typeof data["automatic-deployment"]!= 'undefined' && typeof data["enclaves"]!="undefined")) throw new Error("Conversion failed")
                        configInstance.mainConfig.essential = data
                        configInstance.saveConfigAsync()
                        break;
                    case "yaml":
                        data = yamljs.parse(req.files[0].data.toString("utf-8"))
                        if(!(typeof data["automatic-deployment"]!= 'undefined' && typeof data["enclaves"]!="undefined")) throw new Error("Conversion failed")
                        configInstance.mainConfig.essential = data
                        configInstance.saveConfigAsync()
                        break;
                    case "json":
                        data = JSON.parse(req.files[0].data.toString("utf-8"))
                        if(!(typeof data["automatic-deployment"]!= 'undefined' && typeof data["enclaves"]!="undefined")) throw new Error("Conversion failed")
                        configInstance.mainConfig.essential = data
                        configInstance.saveConfigAsync()
                        break;
                    default:
                        resp.status(200).send({authenticated: true, success:false})
                        break;
                }
                resp.status(200).send({authenticated: true, success:true})
            } catch(err) {resp.status(200).send({authenticated: true, success:false})}
        } else resp.status(200).send({authenticated: true, success:false})
    else resp.status(200).send({authenticated: false})
})

app.get('/'+configInstance.mainConfig["api-connection"].sync["notification-rss-path"], (req, resp) => {
    if(configInstance.mainConfig["api-connection"].sync.notify && configInstance.mainConfig["api-connection"].sync["notification-type"] == configInstance.enumNotificationType.rss) {
        let feed = new rss({
            title: "Mcon events and alerts",
        })
        for(let item of configInstance.log) {
            feed.item({
                title: "Event",
                description: item.toString()
            })
        }
        for(let item of configInstance.errors)
        {
            feed.item({
                title: "Error",
                description: item.toString()
            })
        }
        resp.set('Content-Type', 'application/rss+xml');
        resp.status(200).send(feed.xml({indent:true}));
    }
})

app.post('/data', (req, resp) => {
    let r = req.body
    resp.status(200).send(configInstance.GetGlobalData(r.session))
})

app.post('/update-data', (req,resp) => {
    let r = req.body
    if(typeof r.value == "undefined" || typeof r.username == "undefined" || typeof r.value.enclaves == "undefined" || typeof r.value.enclaves[Symbol.iterator] == "undefined" || r.value.beacons == "undefined") return {authenticated: true, success: false}
    //let tmp = Object.assign([], r.value.enclaves)
    //for(let item of tmp.enclaves) {
    //    item.name = item.uid
    //}
    resp.status(200).send(configInstance.updateEnclave(r.username, {enclaves: r.value.enclaves, beacons: r.value.beacons}, r.session))
})

app.post('/subaction', (req, resp)=> {
    let r = req.body
    if(typeof r.action != "undefined") {
        resp.status(200).send(configInstance.subaction(r))
    }
})

app.post('/check-status', (req, resp) => {
    let r = req.body
    if(configInstance.isAuthenticated(r.session)) {
        resp.status(200).send({authenticated: true, success: true, value: {log: configInstance.log, errors: configInstance.errors, sync: configInstance.communicator.syncStatusArr}})
    } else {
        resp.status(200).send({authenticated: false, success: false})
    }
})

app.listen(configInstance.mainConfig.management.port)