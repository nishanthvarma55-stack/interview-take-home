import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ResponseTable from '../src/components/ResponseTable';

const makeResponse = (overrides = {}) => ({
  id: 1,
  timestamp: '2026-05-19T10:00:00Z',
  status_code: 200,
  response_time_ms: 150,
  is_anomaly: 0,
  z_score: null,
  payload_sent: '{"requestId":"abc"}',
  response_body: '{"url":"https://httpbin.org/anything"}',
  ...overrides
});

describe('ResponseTable', () => {
  it('renders empty state message when responses array is empty', () => {
    render(<ResponseTable responses={[]} />);
    expect(screen.getByText(/No data yet/)).toBeInTheDocument();
  });

  it('renders a row for each response', () => {
    render(<ResponseTable responses={[makeResponse({ id: 1 }), makeResponse({ id: 2 })]} />);
    expect(screen.getAllByText('View')).toHaveLength(2);
  });

  it('displays status code badge', () => {
    render(<ResponseTable responses={[makeResponse({ status_code: 200 })]} />);
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('displays response time with ms suffix', () => {
    render(<ResponseTable responses={[makeResponse({ response_time_ms: 287 })]} />);
    expect(screen.getByText('287ms')).toBeInTheDocument();
  });

  it('shows ANOMALY label for anomalous responses', () => {
    render(<ResponseTable responses={[makeResponse({ is_anomaly: 1, z_score: 3.5 })]} />);
    expect(screen.getByText('ANOMALY')).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('does not show ANOMALY label for normal responses', () => {
    render(<ResponseTable responses={[makeResponse({ is_anomaly: 0 })]} />);
    expect(screen.queryByText('ANOMALY')).not.toBeInTheDocument();
  });

  it('expands payload details when View button is clicked', () => {
    render(<ResponseTable responses={[makeResponse()]} />);
    fireEvent.click(screen.getByText('View'));
    expect(screen.getByText('Hide')).toBeInTheDocument();
  });

  it('collapses payload details when Hide button is clicked', () => {
    render(<ResponseTable responses={[makeResponse()]} />);
    fireEvent.click(screen.getByText('View'));
    fireEvent.click(screen.getByText('Hide'));
    expect(screen.getByText('View')).toBeInTheDocument();
  });
});
