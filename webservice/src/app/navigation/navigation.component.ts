import { Component, OnInit, EventEmitter } from '@angular/core';
import { StructureService } from '../structure.service';
import { LoginService } from '../login.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html'
})
export class NavigationComponent implements OnInit {
  // Navigace bude navigovat skrze strukturu aplikace
  public iconSize = 60;
  public highlighted: string;
  public categoryStructure: string[];
  public appStructure: any;

  constructor(public _loginService: LoginService, public _structureService: StructureService) {
    this._structureService.highlightedObs.subscribe(msg => this.highlighted = msg.split(" ")[0]);

    // Category structure
    this.categoryStructure = this._structureService.getStructure("category", "");
    this.appStructure = this._structureService.appStructure;
  }
  // Highlighting
  highlight(item: string) {
    this._structureService.highlight(`${item} ${this.getFirstChild(item)}`);
  }
  isHighlighted(item: string) {
    return this.highlighted == item;
  }

  getFirstChild(category) {
    return (typeof this.appStructure[category]['children'] != "undefined") ? Object.keys(this.appStructure[category]['children'])[0] : "wifi";
  }

  ngOnInit() {
  }
}
