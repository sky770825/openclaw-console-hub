import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';

describe('Example Test', () => {
  it('should render without crashing', () => {
    render(<h1>Hello Vitest</h1>);
    expect(screen.getByText('Hello Vitest')).toBeInTheDocument();
  });
});
