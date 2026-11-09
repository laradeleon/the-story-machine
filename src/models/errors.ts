// our own error types

// thrown when a story has no chapter at the position the reader asked for
export class ChapterNotFoundError extends Error {
  constructor(storyId: string, chapterIndex: number) {
    super(`Story ${storyId} has no chapter at position ${chapterIndex}`);
    this.name = 'ChapterNotFoundError';
  }
}
