import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { AuthService } from '../../services/auth.service';
import { ReadingProgressService } from '../../services/reading-progress.service';

import { StoryDetails } from '../../../models/story-details';
import { StoryPreview } from '../../components/story-preview/story-preview';
import { AuthFormMode, SignInPopup } from '../../components/sign-in-popup/sign-in-popup';

@Component({
  imports: [StoryPreview, RouterLink, SignInPopup],
  selector: 'app-landing', //html tag for this component
  styleUrl: './landing.css',
  templateUrl: './landing.html',
  host: {
    // closes the profile menu when you click somewhere else or press Esc
    '(document:click)': 'closeMenuOnOutsideClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
})
export class Landing {
  protected stories = inject(StoryService).getStories();
  protected selectedStory = signal<StoryDetails | null>(null); // the story shown in the popup. this is null when it's closed
  protected showSignIn = signal(false); // whether to show the sign in popup
  protected signInMode = signal<AuthFormMode>('signIn'); // which form the popup opens on
  protected menuOpen = signal(false); // whether the profile menu is showing
  private auth = inject(AuthService);
  private profileMenu = viewChild.required<ElementRef<HTMLElement>>('profileMenu');
  private progress = inject(ReadingProgressService);

  // stories this reader started but hasnt finished, with the chapter they're on, for the continue reading list
  // most recently read first
  protected inProgressStories = computed(() => {
    if (!this.stories.hasValue()) {
      return []; // still loading or failed to load, so there's nothing to match the progress against yet
    }
    // look up stories by id, so the list can follow the progress order instead of the story list's order
    const storiesById = new Map(this.stories.value().map((story) => [story.story_id, story]));

    const items: { story: StoryDetails; chapter: number }[] = [];
    for (const storyId of this.progress.inProgressStoryIds()) {
      const story = storiesById.get(storyId);
      if (!story) {
        continue; // they have progress for it but it was deleted or unpublished so leave it out
      }
      items.push({
        story,
        chapter: (this.progress.get(storyId)?.chapterIndex ?? 0) + 1, // prevent chapter 0 from showing, as chapterIndex starts at 0
      });
    }
    return items;
  });

  protected isSignedIn = this.auth.isSignedIn;
  protected username = computed(() => this.auth.currentUser().username);
  protected email = computed(() => this.auth.currentUser().email);
  // usernames are cut to 9 characters so the button stays small
  protected shortUsername = computed(() => {
    const name = this.username();
    return name.length < 10 ? name : `${name.slice(0, 9)}…`;
  });

  protected toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  // closes the menu and opens the popup on the form that was picked
  protected openSignIn(mode: AuthFormMode) {
    this.menuOpen.set(false);
    this.signInMode.set(mode);
    this.showSignIn.set(true);
  }

  protected signOut() {
    this.menuOpen.set(false);
    this.auth.logout(); // the button goes back to "Guest"
  }

  protected closeMenuOnOutsideClick(event: MouseEvent) {
    if (!this.profileMenu().nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }
}
