import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StoryPreview } from './story-preview';

describe('StoryPreview', () => {
  let component: StoryPreview;
  let fixture: ComponentFixture<StoryPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoryPreview],
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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
