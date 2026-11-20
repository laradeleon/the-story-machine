import { TestBed } from '@angular/core/testing';
import { StoryCard } from './story-card';

describe('StoryCard', () => {
  // the card shows the title and author and is a button so it can be clicked
  it("shows the story's title and author", async () => {
    await TestBed.configureTestingModule({ imports: [StoryCard] }).compileComponents();
    const fixture = TestBed.createComponent(StoryCard);
    fixture.componentRef.setInput('story', {
      story_id: 's1',
      title: 'Gerald Has Your Keys',
      author: 'Grader',
      author_id: 'a1',
      description: 'A goose steals your keys.',
      updatedAt: '2026-11-18T22:00:53.649Z',
    });
    await fixture.whenStable();

    const card = (fixture.nativeElement as HTMLElement).querySelector('button.story-card');
    expect(card?.querySelector('.story-title')?.textContent).toContain('Gerald Has Your Keys');
    expect(card?.querySelector('.story-author')?.textContent).toContain('Grader');
  });
});
