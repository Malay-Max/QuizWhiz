
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QuizCraft API',
      version: '1.0.0',
      description:
        'A comprehensive RESTful API for programmatically managing the QuizCraft application. ' +
        'This API allows for the creation and management of categories, questions, and quiz sessions, ' +
        'making it suitable for integration with external systems like an AI agent or a management console.',
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Firebase ID token prefixed with "Bearer ".',
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
  },
  apis: ['./src/app/api/**/*.ts'], // Path to the API docs
};

export const getApiDocs = () => {
    try {
        const spec = swaggerJsdoc(options);
        return spec;
    } catch(e) {
        console.error("Error generating swagger docs", e)
        return null
    }
}
