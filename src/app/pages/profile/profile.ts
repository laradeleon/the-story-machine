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
  bio: string;
  username: string;
  joinedAt: string;
}

/**
 * Profile page
 *
 * The page at /profile/<user id>
 * - shows anyone's display name, username, bio and when they joined
 * - your own profile (signed in, your id)
 * - anyone else's comes from their public profile
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

  // someone else's public profile
  // not loaded for your ones own profile since as authservice already has it
  private person = resource({
    params: () => {
      if (this.isOwnProfile()) {
        return undefined;
      }
      return this.userId();
    },
    loader: ({ params }) => this.profiles.getPublicProfile(params),
  });

  protected isProfileLoading = computed(() => this.person.isLoading());
  protected hasProfileError = computed(() => this.person.error() !== undefined);

  // the stories this user has published, shown on every profile
  private stories = resource({
    params: () => this.userId(),
    loader: ({ params }) => this.profiles.getPublishedStories(params),
  });

  protected isStoriesLoading = computed(() => this.stories.isLoading());
  protected hasStoriesError = computed(() => this.stories.error() !== undefined);

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

    // still loading or it failed
    if (this.hasProfileError() || !this.person.hasValue()) {
      return undefined;
    }
    const person = this.person.value();
    if (!person) {
      return null; // no user with this id
    }
    return {
      displayName: person.displayName,
      bio: person.bio,
      username: person.username,
      joinedAt: person.createdAt,
    };
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
