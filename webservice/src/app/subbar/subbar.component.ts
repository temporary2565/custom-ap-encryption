import { Component, OnInit, OnDestroy } from '@angular/core';
import { StructureService } from '../structure.service';
import { LoginService } from '../login.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-subbar',
  templateUrl: './subbar.component.html'
})
export class SubbarComponent implements OnInit {
  public highlighted: string;
  public category: string;
  //public subcategoryStructure: string[];
  public appStructure: any;
  public categorySub: Subscription;
  public highlightedSub: Subscription;

  constructor(public _structureService: StructureService, public _loginService: LoginService) {
    this.categorySub = this._structureService.highlightedObs.subscribe(msg => this.highlighted = msg.split(" ")[1]);
    this.highlightedSub = this._structureService.highlightedObs.subscribe(msg => this.category = msg.split(" ")[0]);
    //_structureService.preloadHiding("wan-role", "select", this._loginService.defaultConfig["wan"]["wan-role"]);
  }

  // Highlighting
  isHighlighted(item: string) {
    return this.highlighted == item;
  }

  highlight(item: string) {
    this._structureService.highlight(`${this.category} ${item}`);
  }
  
  getSubcategoryStructure() {
    return this._structureService.getStructure("subcategory", this.category);
  }

  ngOnInit() {

  }

  ngOnDestroy() {
    this.categorySub.unsubscribe();
    this.highlightedSub.unsubscribe();
  }
}
