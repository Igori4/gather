import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gather API',
      version: '1.0.0',
      description: 'REST API for the Gather social group outing planner',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id:        { type: 'string' },
            email:     { type: 'string', format: 'email' },
            name:      { type: 'string' },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
        Group: {
          type: 'object',
          properties: {
            id:          { type: 'string' },
            name:        { type: 'string' },
            description: { type: 'string', nullable: true },
            createdBy:   { type: 'string' },
            createdAt:   { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
