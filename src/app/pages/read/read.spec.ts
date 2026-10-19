import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Read } from './read';
import { provideRouter } from '@angular/router';

describe('Read', () => {
  let component: Read;
  let fixture: ComponentFixture<Read>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Read],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Read);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
