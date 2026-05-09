/**
 * Unit tests for the `noSpaces` prop on the shared Input component.
 *
 * Two-layer guarantee:
 *  - keydown: blocks the space key live (no cursor jump, no value change)
 *  - change:  strips any whitespace that arrives via paste / autofill / IME
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input — noSpaces', () => {
  it('blocks the space key on keydown', () => {
    render(<Input noSpaces aria-label="id" />);
    const el = screen.getByLabelText('id') as HTMLInputElement;

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('does NOT block space when noSpaces is absent', () => {
    render(<Input aria-label="id" />);
    const el = screen.getByLabelText('id') as HTMLInputElement;

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('strips whitespace from pasted/typed values before forwarding onChange', () => {
    const onChange = vi.fn();
    render(<Input noSpaces onChange={onChange} aria-label="id" />);
    const el = screen.getByLabelText('id') as HTMLInputElement;

    fireEvent.change(el, { target: { value: 'AB CD EF' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target.value).toBe('ABCDEF');
  });

  it('strips tabs and newlines too (any whitespace, not just space)', () => {
    const onChange = vi.fn();
    render(<Input noSpaces onChange={onChange} aria-label="id" />);
    const el = screen.getByLabelText('id') as HTMLInputElement;

    fireEvent.change(el, { target: { value: 'AB\tCD\nEF' } });

    expect(onChange.mock.calls[0][0].target.value).toBe('ABCDEF');
  });

  it('passes values through untouched when noSpaces is absent', () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} aria-label="name" />);
    const el = screen.getByLabelText('name') as HTMLInputElement;

    fireEvent.change(el, { target: { value: 'John Doe' } });

    expect(onChange.mock.calls[0][0].target.value).toBe('John Doe');
  });

  it('still calls a user-supplied onKeyDown handler', () => {
    const onKeyDown = vi.fn();
    render(<Input noSpaces onKeyDown={onKeyDown} aria-label="id" />);
    const el = screen.getByLabelText('id') as HTMLInputElement;

    fireEvent.keyDown(el, { key: 'A' });
    fireEvent.keyDown(el, { key: ' ' });

    expect(onKeyDown).toHaveBeenCalledTimes(2);
  });
});
