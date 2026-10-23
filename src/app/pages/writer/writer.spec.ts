import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Writer } from './writer';

describe('Writer', () => {
  let component: Writer;
  let fixture: ComponentFixture<Writer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Writer],
      providers: [provideRouter([])], // the back button and preview() both need a router
    }).compileComponents();

    fixture = TestBed.createComponent(Writer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
