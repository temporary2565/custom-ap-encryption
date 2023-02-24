import { Component, OnInit } from '@angular/core';
import { IpcServiceService } from '../ipc-service.service';

@Component({
  selector: 'app-saved',
  templateUrl: './saved.component.html',
  styleUrls: ['./saved.component.scss']
})
export class SavedComponent implements OnInit {

  constructor(public ipc: IpcServiceService) { }

  ngOnInit() {
  }

  isUndef(item) {
    return typeof item == "undefined" || item === null
  }

  remove(item, index) {
    this.ipc.config.saved.splice(index, 1)
    this.ipc.saveConfig()
  }

}
