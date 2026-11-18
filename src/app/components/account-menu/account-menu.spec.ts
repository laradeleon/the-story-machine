import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AccountMenu } from './account-menu';
import { AuthService } from '../../services/auth.service';
import { GUEST_USER, User } from '../../../models/auth';

const ada: User = {
  ...GUEST_USER,
  _id: '6afb4da918c4151edefe4593',
  username: 'ada_writes',
  email: 'ada@example.com',
};

describe('AccountMenu', () => {
  let fixture: ComponentFixture<AccountMenu>;
  let compiled: HTMLElement;
  const currentUser = signal<User>(GUEST_USER); // whos signed in

  beforeEach(async () => {
    currentUser.set(GUEST_USER);
    await TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        provideRouter([]), // my profile link needs a router
        // fake auth
        {
          provide: AuthService,
          useValue: {
            currentUser,
            isSignedIn: computed(() => currentUser()._id !== GUEST_USER._id),
            logout: () => currentUser.set(GUEST_USER),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AccountMenu);
    compiled = fixture.nativeElement as HTMLElement;
  });

  async function openMenu() {
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('.profile-button')!.click();
    await fixture.whenStable();
  }

  // the text of everything in the dropdown
  function menuItems() {
    return Array.from(
      compiled.querySelectorAll('.profile-dropdown a, .profile-dropdown button'),
    ).map((item) => item.textContent?.trim());
  }

  it('says Guest and offers sign in when nobody is signed in', async () => {
    await openMenu();
    expect(compiled.querySelector('.profile-button')?.textContent).toContain('Guest');
    expect(menuItems()).toEqual(['Sign in', 'Create account']);
  });

  // my profile is the way to your own profile page
  it('offers my profile when signed in, linking to your own profile', async () => {
    currentUser.set(ada);
    await openMenu();

    expect(menuItems()).toEqual(['My Profile', 'Sign out']);
    const link = compiled.querySelector('.profile-dropdown a');
    expect(link?.getAttribute('href')).toBe(`/profile/${ada._id}`);
  });

  // if someone has a really long username, cut it so the button doesnt stretch
  it('shortens long usernames on the button', async () => {
    currentUser.set({ ...ada, username: 'averyveryverylongname' });
    await fixture.whenStable();

    const button = compiled.querySelector('.profile-button');
    expect(button?.textContent).toContain('averyvery…');
    expect(button?.getAttribute('title')).toBe('averyveryverylongname');
  });
});
