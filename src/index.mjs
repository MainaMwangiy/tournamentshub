import express from "express"
import helmet from "helmet"
import cors from "cors"
import compression from "compression"
import rateLimit from "express-rate-limit"
import "express-async-errors"
import dotenv from "dotenv"
import swaggerJsdoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"
import usersRoutes from "./routes/user.routes.js"
import authRouter from './routes/auth.routes.js'
import tournamentsRoutes from "./routes/tournament.routes.js"
import { errorHandler } from "./middleware/errorHandler.js"
import {runSetUp} from "./database/runSetup.js"
import bodyParser from "body-parser"

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// IMPORTANT: Trust proxy when deployed (Vercel, Heroku, AWS Lambda, etc.)
// This must be set BEFORE any rate limiting middleware
// Vercel automatically sets VERCEL=1 when deployed
if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
  app.set("trust proxy", 1)
}

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Tournament Management API",
      version: "1.0.0",
      description: "Professional Tournament Management System API",
    },
    servers: [
      {
        url: process.env.PROD_BASE_URL || `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"],
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
)

app.use(
  cors({
    origin: [
      "https://tournament-app.vercel.app",
      "http://localhost:3000",
      "https://tournaments-lime.vercel.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// app.use(bodyParser.json())
// app.use(express.json())
// app.use(bodyParser.urlencoded({ extended: true }))

// Rate limiting
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use("/api/", limiter)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.post("/migrate", runSetUp)

// API Routes
const apiRouter = express.Router()

// Authentication routes
apiRouter.use("/auth", authRouter)

// Tournament management routes
apiRouter.use("/users", usersRoutes)
apiRouter.use("/tournaments", tournamentsRoutes)

app.use("/api/v1", apiRouter)

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Tournament Management API",
    documentation: "Visit /api-docs for API documentation",
    version: "1.0.0",
    endpoints: {
      users: "/api/v1/users",
      tournaments: "/api/v1/tournaments",
      entries: "/api/v1/tournament-entries",
      matches: "/api/v1/matches",
      auth: "/api/v1/auth",
    },
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("[Tournament API Error]:", error.stack); // Log full stack trace
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
    errors: error.errors || [],
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined, // Include stack in dev
  });
});
// Global error handler
app.use(errorHandler)

async function startServer() {
  try {
    console.log("Starting Tournament Management Server...")

    // Start server
    app.listen(PORT, () => {
      console.log(`🏆 Tournament Management Server running on port ${PORT}`)
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`)
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`)
    })
  } catch (error) {
    console.error("Failed to start tournament server:", error)
    process.exit(1)
  }
}

startServer()

export default app
