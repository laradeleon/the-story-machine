import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthFormMode, SignInPopup } from '../sign-in-popup/sign-in-popup';

/**
 * AccountMenu
 *
 * The account button in the top right corner, with its dropdown and the sign in popup.
 * Shows "Guest" until someone signs in, then their username.
 * - guests get sign in and create account
 * - signed in users get their username and email, my profile, and sign out
 *
 * Used on every page that needs it (landing and profile so far), so it lives in its own component.
 */
@Component({
  imports: [RouterLink, SignInPopup],
  selector: 'app-account-menu',
  styleUrl: './account-menu.css',
  templateUrl: './account-menu.html',
  host: {
    // closes the menu when you click somewhere else or press esc
    '(document:click)': 'closeMenuOnOutsideClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
})
export class AccountMenu {
  private auth = inject(AuthService);
  private router = inject(Router);
  private profileMenu = viewChild.required<ElementRef<HTMLElement>>('profileMenu');

  protected menuOpen = signal(false); // whether the dropdown is showing
  protected showSignIn = signal(false); // whether the sign in popup is showing
  protected signInMode = signal<AuthFormMode>('signIn'); // which form the popup opens on

  protected isSignedIn = this.auth.isSignedIn;
  protected userId = computed(() => this.auth.currentUser()._id); // for the my profile link
  protected username = computed(() => this.auth.currentUser().username);
  protected email = computed(() => this.auth.currentUser().email);
  protected MAX_USERNAME_DISPLAY_LIMIT = 10; // so long usernames dont stretch the button

  // what the button says, which is either "Guest or the username of user whos signed in
  protected buttonLabel = computed(() => {
    if (!this.isSignedIn()) {
      return 'Guest';
    }
    const name = this.username();
    if (name.length < this.MAX_USERNAME_DISPLAY_LIMIT) {
      return name;
    }
    return `${name.slice(0, this.MAX_USERNAME_DISPLAY_LIMIT - 1)}…`;
  });

  // hovering the button shows the full username in case it got cut short
  protected buttonTitle = computed(() => {
    if (this.isSignedIn()) {
      return this.username();
    }
    return null;
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

  // go back to the landing page after sign out
  protected signOut() {
    this.menuOpen.set(false);
    this.auth.logout(); // the button goes back to "Guest"
    this.router.navigate(['/']);
  }

  protected closeMenuOnOutsideClick(event: MouseEvent) {
    if (!this.profileMenu().nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }
}
