import { describe, it, expect } from 'vitest';
import { createErrorResponse } from './api';

describe('createErrorResponse', () => {
  it('retorna Response con status y message correctos', async () => {
    const res = createErrorResponse('Faltan datos', 400);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Faltan datos');
  });

  it('retorna Response con status 500', async () => {
    const res = createErrorResponse('Error servidor', 500);
    expect(res.status).toBe(500);
  });
});
