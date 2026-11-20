import { Component, input, output, signal } from '@angular/core';
import { allowed_type_names, allowed_types } from '../../services/image.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import {
  clamp_offset,
  clamp_zoom,
  max_zoom,
  min_zoom,
  number_from_box,
  Placement,
  placement_style,
} from '../../rules/placement';

// a picture area to drop, upload, move and zoom an image. keeps no data, the parent stores it
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
  guide_visible = input(true); // whether the guide is drawn now, held by the parent

  image_chosen = output<File>(); // a file was dropped or picked, the parent checks and reads it
  placement_changed = output<Placement>(); // the picture was moved, zoomed or typed in
  image_deleted = output<void>(); // the delete was confirmed, the parent removes the picture

  // for the template, so the slider, file picker and hint match the rules they come from
  protected readonly min_zoom = min_zoom;
  protected readonly max_zoom = max_zoom;
  protected readonly accepted_types = allowed_types.join(',');
  protected readonly accepted_type_names = allowed_type_names;

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

  picture_style(): string {
    return placement_style(this.placement());
  }

  on_drag_over(event: DragEvent) {
    event.preventDefault(); // lets the browser accept the drop
    this.dragging.set(true);
  }

  // clears the highlight, unless the pointer only moved onto a child of the area
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

  // passes the picked file up, clearing the input so the same file can be picked again
  on_upload(picker: HTMLInputElement) {
    const file = picker.files?.[0];
    picker.value = '';
    if (file) {
      this.image_chosen.emit(file);
    }
  }

  // remembers where a drag of the picture started
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

  // moves the held picture by the distance the pointer moved
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

  on_pointer_up() {
    this.pan_start = null;
  }

  // sets the zoom from the slider or box, ignoring non-numbers
  set_zoom(value: string) {
    const zoom = number_from_box(value);
    if (zoom === null) {
      return;
    }
    this.placement_changed.emit({ ...this.placement(), zoom: clamp_zoom(zoom) });
  }

  // sets Offset X or Y from its box, ignoring non-numbers
  set_offset(axis: 'x' | 'y', value: string) {
    const offset = number_from_box(value);
    if (offset !== null) {
      this.placement_changed.emit({ ...this.placement(), [axis]: clamp_offset(offset) });
    }
  }

  confirm_delete() {
    this.image_deleted.emit();
  }
}
