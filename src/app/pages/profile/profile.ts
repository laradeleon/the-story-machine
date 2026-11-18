import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, readApiError } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { AccountMenu } from '../../components/account-menu/account-menu';

// what the page shows about someone
interface ProfileDetails {
  displayName: string;
  bio: string | null; // an empty string means they haven't written one
  username: string | null;
  joinedAt: string | null;
}

/**
 * Profile page
 *
 * The page at /profile/<user id>
 * - your own profile (signed in, your id) shows your username, bio and when you joined
 * - anyone else's shows their display name only
 * - a profile we can't find shows a not found message
 * - everyone gets the same profile picture for now
 */
@Component({
  imports: [AccountMenu, RouterLink, DatePipe],
  selector: 'app-profile',
  styleUrl: './profile.css',
  templateUrl: './profile.html',
})
export class Profile {
  private auth = inject(AuthService);
  private profiles = inject(ProfileService);

  // the page updates if the url changes while it's open
  private userId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('userId') ?? '')),
    { requireSync: true },
  );

  // true when a signed in user is looking at their own profile
  protected isOwnProfile = computed(
    () => this.auth.isSignedIn() && this.auth.currentUser()._id === this.userId(),
  );

  // someone else's profile has to be looked up
  private otherProfile = resource({
    params: () => {
      if (this.isOwnProfile()) {
        return undefined;
      }
      return this.userId();
    },
    loader: ({ params }) => this.profiles.getDisplayName(params),
  });

  protected isLoading = computed(() => this.otherProfile.isLoading());
  protected hasError = computed(() => this.otherProfile.error() !== undefined);

  // everything the page shows
  protected profile = computed((): ProfileDetails | null | undefined => {
    if (this.isOwnProfile()) {
      const user = this.auth.currentUser();
      return {
        displayName: user.displayName,
        bio: user.bio,
        username: user.username,
        joinedAt: user.createdAt,
      };
    }

    if (this.hasError() || !this.otherProfile.hasValue()) {
      return undefined;
    }
    const displayName = this.otherProfile.value();
    if (displayName === null) {
      return null;
    }
    return { displayName, bio: null, username: null, joinedAt: null };
  });

  // editing your bio, on your own profile only
  protected readonly bioMaxLength = 500;
  protected editingBio = signal(false); // whether the bio box in edit mode is showing instead of the bio
  protected bioDraft = signal(''); // what's typed in the box so far
  protected savingBio = signal(false); // while the save is on its way to the backend
  protected bioError = signal<string | null>(null); // why the last save didn't work

  // for editing current bio (if it exists)
  protected startEditingBio() {
    this.bioDraft.set(this.auth.currentUser().bio);
    this.bioError.set(null);
    this.editingBio.set(true);
  }

  // goes back to showing the bio without saving anything that was typed
  protected cancelEditingBio() {
    this.editingBio.set(false);
  }

  protected async saveBio() {
    this.savingBio.set(true);
    this.bioError.set(null);
    try {
      await this.auth.updateProfile({ bio: this.bioDraft().trim() });
      this.editingBio.set(false); // the new bio shows straight away
    } catch (error) {
      // the backend's message about the bio if it gave one otherwise a general one
      const { message, fieldErrors } = readApiError(error);
      if (fieldErrors['bio']) {
        this.bioError.set(fieldErrors['bio']);
      } else {
        this.bioError.set(message);
      }
    } finally {
      this.savingBio.set(false);
    }
  }
}
