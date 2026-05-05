require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const socketio = require('socket.io');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { limiter } = require('./middleware/rateLimiter');

// Route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const paymentRoutes = require('./routes/payments');
const enrollmentRoutes = require('./routes/enrollments');
const messageRoutes = require('./routes/messages');
const testimonialRoutes = require('./routes/testimonials');
const notificationRoutes = require('./routes/notifications');
const videoRoutes = require('./routes/videos');
const adminRoutes = require('./routes/admin');
const promoVideoRoutes = require('./routes/promoVideos');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible to routes
app.set('io', io);

// CORS must be first — before body parser and routes
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (always on so production logs are visible on Render)
app.use(morgan('dev'));

// Rate limiting (Disabled for development)
// app.use('/api', limiter);

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/testimonials', testimonialRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/promo-videos', promoVideoRoutes);

// Error handler
app.use(errorHandler);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join user's room for private notifications
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Handle chat typing indicator
  socket.on('typing', (data) => {
    socket.to(data.receiverId).emit('user-typing', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
