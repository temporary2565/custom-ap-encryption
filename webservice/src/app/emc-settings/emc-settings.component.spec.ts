import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EmcSettingsComponent } from './emc-settings.component';

describe('EmcSettingsComponent', () => {
  let component: EmcSettingsComponent;
  let fixture: ComponentFixture<EmcSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EmcSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EmcSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
