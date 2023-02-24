const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const {Configuration} = require("./config")
let scanner = require('./bluetooth/index')

let config = new Configuration()

//const scanner = new Scanning()

let win;

function createWindow() {
  win = new BrowserWindow({ width: 800, height: 600 });
  win.setMenuBarVisibility(false)

  // load the dist folder from Angular
  win.loadURL(
    url.format({
        pathname: path.join(__dirname, `/dist/index.html`),
        protocol: "file:",
        slashes: true,
        skipTaskbar: true,
        toolbar: false
    })
  );

  // The following is optional and will open the DevTools:
  // win.webContents.openDevTools()

  win.on("closed", () => {
    win = null;
  });

  // startup
  scanner.scan.token = config.data.token

  // events
  ipcMain.on('getInterfaces', (...args) => {
    scanner.scan.getInterfaces()
  })

  scanner.scan.on('hasInterfaces', (...args) => {
    win.webContents.send("hasInterfaces", args[0])
  })

  ipcMain.on("scan", function(event, ...args) {
    scanner.scan.stopScanning()
    scanner.scan.startScanning()
  })
  
  scanner.scan.on("scanned", (...args)=> {
    win.webContents.send("scanned", args[0])
  })
  
  ipcMain.on("scan-r", function(event, ...args) {
    scanner.scan.stopScanning()
    scanner.scan.startScanning()
  })
  
  ipcMain.on("connect", function(event, ...args) {
    scanner.scan.connect(args[0], args[1])
  })

  scanner.scan.on("cError", (event, ...args) => {
    
  })

  ipcMain.on("disconnect", function(event, ...args) {
    
  })

  ipcMain.on("saveConfig", function(event, ...args) {
    config.data = args[0]
    config.save()
  })

  ipcMain.on('getConfig', (e, ...a) => {
    win.webContents.send("hasConfig", config.data)
  })

  ipcMain.on('removeSaved', (e, index) => {
    config.data.saved = config.data.saved.splice(index, 1)
  })

  ipcMain.on('getState', (e, ...args) => {
    scanner.scan.getState()
  })

  scanner.scan.on('stateChange', (...args) => {
    win.webContents.send("stateChange", args[0])
  })

  ipcMain.on('coldLogin', (e, ...args) => {
    scanner.scan.login= true
    if(args[0] == "token") {
      scanner.scan.token = args[1]
    } else if(args[0] == "login") {
      scanner.scan.username = args[1]
      scanner.scan.password = args[2]
    } else {
      scanner.scan.login= false
    }
  })

  scanner.scan.on('error', (...args) => {

  })
}

app.on("ready", createWindow);

// on macOS, closing the window doesn't quit the app
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// initialize the app's main window
app.on("activate", () => {
  if (win === null) {
    createWindow();
  }
});

/*define(["require", "exports", "electron", "url", "process"], function (require, exports, electron_1, url, process) {
    var win;
    function createWindow() {
        win = new electron_1.BrowserWindow({ width: 800, height: 600 });
        // load the dist folder from Angular
        win.loadURL(url.format({
            pathname: "./dist/index.html",
            protocol: "file:",
            slashes: true
        }));
        // The following is optional and will open the DevTools:
        // win.webContents.openDevTools()
        win.on("closed", function () {
            win = null;
        });
    }
    electron_1.app.on("ready", createWindow);
    // on macOS, closing the window doesn't quit the app
    electron_1.app.on("window-all-closed", function () {
        if (process.platform !== "darwin") {
            electron_1.app.quit();
        }
    });
    // initialize the app's main window
    electron_1.app.on("activate", function () {
        if (win === null) {
            createWindow();
        }
    });
});
*/
