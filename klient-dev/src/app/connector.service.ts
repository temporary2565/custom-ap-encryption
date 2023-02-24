import { Injectable } from '@angular/core';
import { IpcServiceService } from './ipc-service.service';

export interface IDevice {
  
}

@Injectable({
  providedIn: 'root'
})
export class ConnectorService {
  devices: IDevice[] = []

  constructor(public _i: IpcServiceService) { }

  connect(item, index) {
    //this._i.on()
  }
  
}
