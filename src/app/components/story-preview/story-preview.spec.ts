import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StoryPreview } from './story-preview';

describe('StoryPreview', () => {
  let component: StoryPreview;
  let fixture: ComponentFixture<StoryPreview>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoryPreview],
      providers: [provideRouter([])], // the read story link uses routerLink so it needs a router
    }).compileComponents();

    fixture = TestBed.createComponent(StoryPreview);
    fixture.componentRef.setInput('story', {
      story_id: '1',
      title: 'Test story',
      author: 'Test author',
      description: 'A test description',
      updatedAt: '2026-10-19T11:03:46.435Z',
    });

    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the title, author and description', () => {
    expect(compiled.textContent).toContain('Test story');
    expect(compiled.textContent).toContain('by Test author');
    expect(compiled.textContent).toContain('A test description');
  });

  it('should have a read story link that goes to the reader for this story', () => {
    const links = Array.from(compiled.querySelectorAll('a'));
    const readLink = links.find((link) => link.textContent?.includes('Read Story'));
    expect(readLink?.getAttribute('href')).toBe('/read/1');
  });
});
