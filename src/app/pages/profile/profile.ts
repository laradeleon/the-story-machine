import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { AccountMenu } from '../../components/account-menu/account-menu';

// what the page shows about someone. username, profileUrl and joinedAt are null when
interface ProfileDetails {
  displayName: string;
  username: string | null;
  profileUrl: string | null;
  joinedAt: string | null;
}

/**
 * Profile page
 *
 * The page at /profile/<user id>
 * - your own profile (signed in, your id) shows your username, profile link and when you joined
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
        username: user.username,
        profileUrl: user.profileUrl,
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
    return { displayName, username: null, profileUrl: null, joinedAt: null };
  });

  protected profileLinkText = computed(() => {
    const url = this.profile()?.profileUrl ?? '';
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  });
}
