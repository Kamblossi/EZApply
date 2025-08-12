"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDTO = void 0;
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.UserDTO = zod_1.z.object({
    id: zod_1.z.string().uuid().openapi({
        description: 'Unique identifier for the user',
        example: '123e4567-e89b-12d3-a456-426614174010'
    }),
    email: zod_1.z.string().email().openapi({
        description: 'User email address',
        example: 'john.smith@example.com'
    }),
    role: zod_1.z.enum(['user', 'admin']).openapi({
        description: 'User role in the system',
        example: 'user'
    }),
    created_at: zod_1.z.coerce.date().openapi({
        description: 'Date when the user account was created',
        example: '2024-01-01T10:00:00Z'
    }),
}).openapi({
    title: 'UserDTO',
    description: 'User account information'
});
