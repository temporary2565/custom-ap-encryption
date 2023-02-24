import { Component, OnInit, ApplicationRef } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IpcServiceService } from '../ipc-service.service';

export enum connectionState {
  connectingBluetooth,
  connectingWifi,
  connected,
  disconnected
}

export interface Status {
  state: connectionState,
  rssi?: number,
  mac?: string,
  name?: string
}

@Component({
  selector: 'app-connect',
  templateUrl: './connect.component.html',
  styleUrls: ['./connect.component.scss']
})
export class ConnectComponent implements OnInit {
  iconSize: number = 30
  status$: Observable<Status>
  availableArr = [
    {type: 3, name: "Network 1", info: "BT-RSSI: -64, WIFI-DBM: -68, 74:04:2b:3f:91:a3"},

  ]

  constructor(public ipc: IpcServiceService, public ar: ApplicationRef) {
    this.ipc.send("scan")
    /*this.ipc.availableObs.subscribe(x=>{
      this.availableArr = []
      for(let item of x) {
        this.availableArr.push({
          type: item.enctype,
          name: item.wifiSsid,
          info: `BT RSSI: ${item.rssi}, WIFI RSSI: ${item.wifiRssi}, ${item.mac}`
        })
        ar.tick()
      }
    })*/
  }

  refresh() {
    this.ipc.send("scan-r")
  }

  ngOnInit() {
    this.status$ = of({
      state: connectionState.disconnected,
       rssi: 80,
       mac: "",
       name: ""
    });
  }

  isEmpty(item) {
    return typeof item == "undefined" || item === null && item == ""
  }

  connect(item) {
    this.ipc.current = item
    if(item.type == "personal" || item.type == "enterprise") {
    this.ipc.overlay = true
    this.ipc.overlayType = item.type == 2 ? "personal" : "enterprise"
    } else {
      this.ipc.send('connect', item)
    }
  }

}
