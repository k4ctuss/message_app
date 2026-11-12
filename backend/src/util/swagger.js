const swaggerAutogen = require("swagger-autogen")({
    openapi: "3.0.0",
});

const outputFile = "swagger_output.json";
const endpointsFiles = ["src/routes/protected.js", "src/routes/connection.js"];

swaggerAutogen(outputFile, endpointsFiles, {
    components: {
        securitySchemes: {
            cookieAuth: {
                type: "apiKey",
                in: "cookie",
                name: "ACCESS_TOKEN_AUTH",
                description: "Cookie HttpOnly contenant le token JWT",
            },
        },
    },
});
