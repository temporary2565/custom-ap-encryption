import { Component, OnInit } from '@angular/core';
import { LoginService } from '../login.service';
import { StructureService } from '../structure.service'

@Component({
  selector: 'app-status',
  templateUrl: './status.component.html'
})
export class StatusComponent implements OnInit {

  constructor(public _loginService: LoginService, public _structureService: StructureService) {
    _loginService.getStatus();
  }

  getNetworkMap(service, param) {
    if(!(typeof this._loginService.status["network-map"][service] == ('undefined' || 'null'))) {
      return this._loginService.status["network-map"][service][param];
    } else if(!((typeof this._loginService.status["usage"][service] || typeof this._loginService.status["usage"][service][param]) == ('undefined' || 'null'))) {
      return this._loginService.status["usage"][service][param];
    } else {
      return 'none';
    }
  }

  ngOnInit() {
    // Zvýraznění
    this._structureService.highlight('none none');
  }

}
