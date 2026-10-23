import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Writer } from './writer';

describe('Writer', () => {
  let component: Writer;
  let fixture: ComponentFixture<Writer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Writer],
    }).compileComponents();

    fixture = TestBed.createComponent(Writer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
