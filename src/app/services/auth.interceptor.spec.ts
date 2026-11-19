import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { getToken, saveToken } from './auth-token';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])), // the same setup as app.config.ts
        provideHttpClientTesting(), // so nothing actually gets sent
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify()); // fails if a request was sent that the test didn't expect

  it('should add the token to requests to our backend when signed in', () => {
    saveToken('abc123');
    http.get('/api/v1/story').subscribe();

    const request = httpMock.expectOne('/api/v1/story');
    expect(request.request.headers.get('Authorization')).toBe('Bearer abc123');
    request.flush({});
  });

  it('should not add a token when nobody is signed in', () => {
    http.get('/api/v1/story').subscribe();

    const request = httpMock.expectOne('/api/v1/story');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  // the token should never leak to other websites
  it('should not add the token to requests outside our backend', () => {
    saveToken('abc123');
    http.get('https://example.com/data').subscribe();

    const request = httpMock.expectOne('https://example.com/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  // e.g. the token ran out after an hour, the username shouldn't stay on the button
  it('should sign out when the backend no longer accepts the token', () => {
    saveToken('abc123');
    const logout = vi.spyOn(TestBed.inject(AuthService), 'logout');
    http.get('/api/v1/story').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/v1/story')
      .flush({ success: false, message: 'Login has expired' }, { status: 401, statusText: '' });

    expect(logout).toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it('should stay signed in for other errors', () => {
    saveToken('abc123');
    http.get('/api/v1/story').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/v1/story')
      .flush({ success: false, message: 'Forbidden' }, { status: 403, statusText: '' });

    expect(getToken()).toBe('abc123');
  });
});
