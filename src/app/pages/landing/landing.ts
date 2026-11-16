import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoryService } from '../../services/story.service';
import { AuthService } from '../../services/auth.service';

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
