"use strict";
// Mock nanoid to avoid ES module issues in Jest
jest.mock('nanoid', () => ({
    nanoid: jest.fn(() => 'test-id-12345')
}));
