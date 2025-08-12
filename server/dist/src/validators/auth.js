"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResendVerificationDTO = exports.VerifyEmailDTO = exports.ErrorResponseDTO = exports.AuthResponseDTO = exports.LoginUserDTO = exports.RegisterUserDTO = void 0;
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.RegisterUserDTO = zod_1.z.object({
    email: zod_1.z.string().email().openapi({
        example: 'alice@example.com',
        description: 'Valid email address for the user account'
    }),
    password: zod_1.z.string().min(8).openapi({
        example: 'S3curePass!',
        description: 'Password must be at least 8 characters long'
    }),
    forename: zod_1.z.string().min(1).openapi({
        example: 'Alice',
        description: 'User\'s first name'
    }),
    surname: zod_1.z.string().min(1).openapi({
        example: 'Johnson',
        description: 'User\'s last name'
    }),
}).openapi({
    title: 'RegisterUserDTO',
    description: 'Data required to register a new user'
});
exports.LoginUserDTO = zod_1.z.object({
    email: zod_1.z.string().email().openapi({
        example: 'alice@example.com',
        description: 'Valid email address for login'
    }),
    password: zod_1.z.string().min(8).openapi({
        example: 'S3curePass!',
        description: 'User\'s password'
    }),
}).openapi({
    title: 'LoginUserDTO',
    description: 'Data required to login'
});
exports.AuthResponseDTO = zod_1.z.object({
    token: zod_1.z.string().openapi({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'JWT token for authentication'
    })
}).openapi({
    title: 'AuthResponseDTO',
    description: 'Authentication response containing JWT token'
});
exports.ErrorResponseDTO = zod_1.z.object({
    error: zod_1.z.string().openapi({
        example: 'email exists',
        description: 'Error message describing what went wrong'
    })
}).openapi({
    title: 'ErrorResponseDTO',
    description: 'Error response'
});
exports.VerifyEmailDTO = zod_1.z.object({
    email: zod_1.z.string().email().openapi({
        example: 'alice@example.com',
        description: 'Email address to verify'
    }),
    code: zod_1.z.string().length(6).openapi({
        example: '123456',
        description: '6-digit verification code'
    }),
}).openapi({
    title: 'VerifyEmailDTO',
    description: 'Data required to verify email address'
});
exports.ResendVerificationDTO = zod_1.z.object({
    email: zod_1.z.string().email().openapi({
        example: 'alice@example.com',
        description: 'Email address to resend verification code to'
    }),
}).openapi({
    title: 'ResendVerificationDTO',
    description: 'Data required to resend verification code'
});
