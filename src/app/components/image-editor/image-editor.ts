import { Component, input, output, signal } from '@angular/core';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { clamp_offset, clamp_zoom, number_from_box, Placement, placement_style } from './placement';

// a picture area you can drop an image into, pick one with Upload, move the picture around and zoom it.
// it reports what the user did and keeps no data of its own, so the parent decides what to store.
// used for character portraits, and for backgrounds later
@Component({
  imports: [ConfirmDialog],
  selector: 'app-image-editor',
  styleUrl: './image-editor.css',
  templateUrl: './image-editor.html',
})
export class ImageEditor {
  image_url = input<string | null>(null); // the picture to show, null when there isn't one yet
  placement = input.required<Placement>(); // where the picture sits and how big it is
  alt_text = input<string>(''); // a description of the picture, for screen readers
  guide = input(false); // whether the see-through person guide can be shown (portraits only)
  guide_visible = input(true); // whether the guide is drawn right now. the parent holds this, so its button can sit beside the name

  image_chosen = output<File>(); // a file was dropped or picked, the parent checks and reads it
  placement_changed = output<Placement>(); // the picture was moved, zoomed or typed in
  image_deleted = output<void>(); // the delete was confirmed, the parent removes the picture
  guide_visible_changed = output<boolean>(); // the parent's outline button asked for the guide to be shown or hidden

  dragging = signal(false); // true while a file is dragged over the area
  confirm_delete_open = signal(false); // whether the "delete this image?" popup is showing

  // where a drag of the picture started: the pointer, the box size and the placement at that moment
  private pan_start: {
    pointer_x: number;
    pointer_y: number;
    width: number;
    height: number;
    placement: Placement;
  } | null = null;

  // the CSS that places the picture inside the area
  picture_style(): string {
    return placement_style(this.placement());
  }

  // a file dragged over the area is highlighted. preventDefault lets the browser accept the drop
  on_drag_over(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  // leaving for a child of the area (the picture, the hint, the guide) is not leaving the area,
  // so the highlight stays until the pointer really leaves
  on_drag_leave(event: DragEvent, area: HTMLElement) {
    const target = event.relatedTarget as Node | null;
    if (target && area.contains(target)) {
      return;
    }
    this.dragging.set(false);
  }

  // a file dropped on the area is passed up to the parent
  on_drop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.image_chosen.emit(file);
    }
  }

  // the Upload button: passes the chosen file up, then clears the input so the same file can be picked again
  on_upload(picker: HTMLInputElement) {
    const file = picker.files?.[0];
    picker.value = '';
    if (file) {
      this.image_chosen.emit(file);
    }
  }

  // the pointer is down on the picture: remember where it started, so the move can be worked out
  on_pointer_down(event: PointerEvent, area: HTMLElement) {
    if (!this.image_url()) {
      return;
    }
    this.pan_start = {
      pointer_x: event.clientX,
      pointer_y: event.clientY,
      width: area.clientWidth,
      height: area.clientHeight,
      placement: this.placement(),
    };
    area.setPointerCapture(event.pointerId); // keeps tracking the pointer even if it leaves the area
  }

  // the pointer moved while the picture is held: move it by the same distance on screen
  on_pointer_move(event: PointerEvent) {
    const start = this.pan_start;
    if (!start) {
      return;
    }
    const x = ((event.clientX - start.pointer_x) / start.width) * 100;
    const y = ((event.clientY - start.pointer_y) / start.height) * 100;
    this.placement_changed.emit({
      ...start.placement,
      x: clamp_offset(start.placement.x + x),
      y: clamp_offset(start.placement.y + y),
    });
  }

  // the pointer was let go, so stop moving the picture
  on_pointer_up() {
    this.pan_start = null;
  }

  // the zoom slider or number box: kept between 50% and 300%. a box that isn't a number is ignored
  set_zoom(value: string) {
    const zoom = number_from_box(value);
    if (zoom === null) {
      return;
    }
    this.placement_changed.emit({ ...this.placement(), zoom: clamp_zoom(zoom) });
  }

  // the Offset X box, given as a % of the area, kept within the clamp. a box that isn't a number is ignored
  set_offset_x(value: string) {
    const x = number_from_box(value);
    if (x !== null) {
      this.placement_changed.emit({ ...this.placement(), x: clamp_offset(x) });
    }
  }

  // the Offset Y box, given as a % of the area, kept within the clamp. a box that isn't a number is ignored
  set_offset_y(value: string) {
    const y = number_from_box(value);
    if (y !== null) {
      this.placement_changed.emit({ ...this.placement(), y: clamp_offset(y) });
    }
  }

  // asks the parent to show or hide the see-through person guide
  toggle_outline() {
    this.guide_visible_changed.emit(!this.guide_visible());
  }

  // the picture is removed once the user confirms
  confirm_delete() {
    this.image_deleted.emit();
  }
}
