import { Injectable, ApplicationRef } from '@angular/core';
import { IpcRenderer } from 'electron';
import { BehaviorSubject, config } from 'rxjs';

function getWindow (): any {
  return window;
}

@Injectable({
  providedIn: 'root'
})
export class IpcServiceService {
  win:any
  ipc: IpcRenderer | undefined
  availableSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([])
  availableObs = this.availableSubject.asObservable()
  interfaces: string[] = []
  hasInterfaces: boolean = false
  _error: boolean = false
  errorMsg: string = ""
  savedArr: any[]
  config: any
  current: any = {}
  overlay: boolean = false
  overlayType: string = "error"
  connected: boolean = false

  get error() {
    return this._error
  }
  set error(val) {
    this._error = val
    if(val) {
      this.overlay = true
      this.overlayType = "error"
      this.app.tick()
    }
  }

  constructor(public app: ApplicationRef) {
    if (window.require) {
      try {
        this.ipc = window.require('electron').ipcRenderer;
      } catch (e) {
        throw e;
      }
    } else {
      console.warn('Electron\'s IPC was not loaded');
    }
    this.on('scanned', function(event, ...args) {
      this.availableSubject.next(args[0])
    }.bind(this))

    this.on('hasInterfaces', function(event, ...args) {
      console.log(args)
      this.hasInterfaces = true
      this.interfaces = args[0]
      if(args[0].length < 1) {
        this.error = true
      }
    }.bind(this))
    this.on('hasSaved', function(event, ...args) {
      this.savedArr = args[0]
    })
    this.on('hasConfig', function(event, ...args) {
      
      this.config = args[0]
      console.log(this.config)
    }.bind(this))
    this.on('error', function(event, ...args) {
      this.error = true
      this.errorMsg = args[0]
    }.bind(this))

    this.send('getInterfaces')
    this.send('getSaved')
    this.send('getConfig')
    // this.win = getWindow()
    // this.ipc = this.win.require('electron').ipcRenderer;
  }

  public on(channel:string, listener) {
    this.ipc.on(channel, listener)
  }

  public send(channel: string, ...args) {
    this.ipc.send(channel, ...args)
  }

  public saveConfig() {
    this.send('saveConfig', this.config)
  }

  closeOverlay() {
    if(!this.error) {
      this.overlay = false
      this.overlayType = ""
    }
  }

}
