import { ComponentFixture, TestBed } from '@angular/core/testing';
import { resource } from '@angular/core';
import { Landing } from './landing';
import { provideRouter } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { StoryDetails } from '../../../models/story-details';

// fake stories for the landing page to show
const mockStories: StoryDetails[] = [
  {
    story_id: '1',
    title: 'The Lighthouse Keeper',
    author: 'Ada Lovelace',
    description: 'A storm, a stranger, and three doors you should not open.',
    updatedAt: '2026-10-21T21:28:00.000Z',
  },
  {
    story_id: '2',
    title: 'Escape From Room 404',
    author: 'Ada Lovelace',
    description: 'Three paths, four endings.',
    updatedAt: '2026-10-22T04:08:10.000Z',
  },
];

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]), // gives the test a router with no routes, fails otherwise as routerlink needs routes to exist
        // fake story service so the test doesnt try to get the stories from the backend
        {
          provide: StoryService,
          useValue: {
            getStories: () => resource({ defaultValue: [], loader: async () => mockStories }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show a card for each story', () => {
    const titles = Array.from(compiled.querySelectorAll('.story-title')).map(
      (title) => title.textContent,
    );
    expect(titles).toEqual(['The Lighthouse Keeper', 'Escape From Room 404']);
  });

  it('should open the preview for a story when its card is clicked', async () => {
    const cards = compiled.querySelectorAll('.story-card');
    (cards[1] as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(compiled.querySelector('#preview-title')?.textContent).toContain('Escape From Room 404');

    // the read story link should take you to the reader for that story
    const links = Array.from(compiled.querySelectorAll('a'));
    const readLink = links.find((link) => link.textContent?.includes('Read Story'));
    expect(readLink?.getAttribute('href')).toBe('/read/2');
  });
});
