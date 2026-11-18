import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, readApiError } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { AccountMenu } from '../../components/account-menu/account-menu';
import { StoryCard } from '../../components/story-card/story-card';
import { StoryPreview } from '../../components/story-preview/story-preview';
import { StoryDetails } from '../../../models/story-details';

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
 * - everyone's shows the stories they've published, clicking one opens the same popup as the landing page
 * - a profile we can't find shows a not found message
 * - everyone gets the same profile picture for now
 */
@Component({
  imports: [AccountMenu, RouterLink, DatePipe, StoryCard, StoryPreview],
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

  // the stories this user has published, shown on every profile
  // on someone else's profile it's also where their name comes from
  private stories = resource({
    params: () => this.userId(),
    loader: ({ params }) => this.profiles.getPublishedStories(params),
  });

  protected isLoading = computed(() => this.stories.isLoading());
  protected hasError = computed(() => this.stories.error() !== undefined);

  // the stories to show as cards, empty while they're loading or if they couldn't be loaded
  protected publishedStories = computed(() => {
    if (!this.stories.hasValue()) {
      return [];
    }
    return this.stories.value();
  });

  // the story shown in the preview popup, null when it's closed
  protected selectedStory = signal<StoryDetails | null>(null);

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

    if (this.hasError() || !this.stories.hasValue()) {
      return undefined;
    }
    const stories = this.stories.value();
    if (stories.length === 0) {
      return null;
    }
    return { displayName: stories[0].author, bio: null, username: null, joinedAt: null };
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
