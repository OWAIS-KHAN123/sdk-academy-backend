require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const connectDB = require('../config/database');

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany();
    await Course.deleteMany();

    console.log('Cleared existing data...');

    // Create Admin Users
    const admin1 = await User.create({
      name: 'Owais Khan',
      email: 'admin@sdkacademy.com',
      password: 'admin123456',
      role: 'admin',
      phoneNumber: '+1234567890',
      profileImage: 'https://i.pravatar.cc/150?img=1',
    });

    const admin2 = await User.create({
      name: 'Haris Ahmed',
      email: 'haris@sdkacademy.com',
      password: 'admin123456',
      role: 'admin',
      phoneNumber: '+1234567891',
      profileImage: 'https://i.pravatar.cc/150?img=2',
    });

    console.log('Admin users created...');

    // Create Student Users
    const student1 = await User.create({
      name: 'John Doe',
      email: 'student@test.com',
      password: 'student123',
      role: 'student',
      phoneNumber: '+1234567892',
      profileImage: 'https://i.pravatar.cc/150?img=3',
    });

    const student2 = await User.create({
      name: 'Jane Smith',
      email: 'jane@test.com',
      password: 'student123',
      role: 'student',
      phoneNumber: '+1234567893',
      profileImage: 'https://i.pravatar.cc/150?img=4',
    });

    const student3 = await User.create({
      name: 'Mike Wilson',
      email: 'mike@test.com',
      password: 'student123',
      role: 'student',
      phoneNumber: '+1234567894',
      profileImage: 'https://i.pravatar.cc/150?img=5',
    });

    console.log('Student users created...');

    // Create Sample Courses
    const course1 = await Course.create({
      title: 'Complete React Native Development',
      description: 'Learn React Native from scratch and build real-world mobile applications. This comprehensive course covers everything from basics to advanced topics including navigation, state management, API integration, and deployment.',
      instructor: 'Dr. Sarah Johnson',
      category: 'Mobile Development',
      price: 99.99,
      discountedPrice: 49.99,
      isFree: false,
      isFeatured: true,
      thumbnail: 'https://picsum.photos/400/300?random=1',
      promotionalVideo: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
      modules: [
        {
          title: 'Introduction to React Native',
          description: 'Understanding the basics of React Native and setting up development environment',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1200,
          order: 1,
          thumbnail: 'https://picsum.photos/200/150?random=11',
        },
        {
          title: 'Components and Props',
          description: 'Learn about React Native components and how to use props',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1500,
          order: 2,
          thumbnail: 'https://picsum.photos/200/150?random=12',
        },
        {
          title: 'State Management with Redux',
          description: 'Deep dive into Redux for state management',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1800,
          order: 3,
          thumbnail: 'https://picsum.photos/200/150?random=13',
        },
        {
          title: 'Navigation in React Native',
          description: 'Implementing navigation using React Navigation',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1600,
          order: 4,
          thumbnail: 'https://picsum.photos/200/150?random=14',
        },
        {
          title: 'API Integration',
          description: 'Connecting to REST APIs and handling data',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 2000,
          order: 5,
          thumbnail: 'https://picsum.photos/200/150?random=15',
        },
      ],
      assignments: [
        {
          title: 'Build a Todo App',
          description: 'Create a complete todo application using React Native',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          maxScore: 100,
        },
      ],
      createdBy: admin1._id,
      rating: 4.8,
      totalRatings: 245,
    });

    const course2 = await Course.create({
      title: 'Node.js Backend Development Masterclass',
      description: 'Master backend development with Node.js, Express, and MongoDB. Build scalable REST APIs and learn best practices for production applications.',
      instructor: 'Prof. Michael Chen',
      category: 'Backend Development',
      price: 89.99,
      discountedPrice: 39.99,
      isFree: false,
      isFeatured: false,
      thumbnail: 'https://picsum.photos/400/300?random=2',
      modules: [
        {
          title: 'Introduction to Node.js',
          description: 'Getting started with Node.js and understanding its architecture',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1400,
          order: 1,
          thumbnail: 'https://picsum.photos/200/150?random=21',
        },
        {
          title: 'Express.js Framework',
          description: 'Building web applications with Express.js',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1700,
          order: 2,
          thumbnail: 'https://picsum.photos/200/150?random=22',
        },
        {
          title: 'MongoDB Database',
          description: 'Working with MongoDB and Mongoose ODM',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1900,
          order: 3,
          thumbnail: 'https://picsum.photos/200/150?random=23',
        },
      ],
      createdBy: admin1._id,
      rating: 4.6,
      totalRatings: 189,
    });

    const course3 = await Course.create({
      title: 'Free JavaScript Fundamentals',
      description: 'Learn JavaScript basics absolutely free! Perfect for beginners starting their programming journey.',
      instructor: 'Emma Rodriguez',
      category: 'Programming',
      price: 0,
      isFree: true,
      isFeatured: false,
      thumbnail: 'https://picsum.photos/400/300?random=3',
      modules: [
        {
          title: 'Variables and Data Types',
          description: 'Understanding JavaScript variables and data types',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 900,
          order: 1,
          thumbnail: 'https://picsum.photos/200/150?random=31',
        },
        {
          title: 'Functions in JavaScript',
          description: 'Learn how to create and use functions',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1100,
          order: 2,
          thumbnail: 'https://picsum.photos/200/150?random=32',
        },
        {
          title: 'Arrays and Objects',
          description: 'Working with arrays and objects in JavaScript',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1300,
          order: 3,
          thumbnail: 'https://picsum.photos/200/150?random=33',
        },
      ],
      createdBy: admin2._id,
      rating: 4.9,
      totalRatings: 567,
    });

    const course4 = await Course.create({
      title: 'Python for Data Science',
      description: 'Complete Python course focused on data science and machine learning applications.',
      instructor: 'Dr. Robert Taylor',
      category: 'Data Science',
      price: 79.99,
      discountedPrice: 29.99,
      isFree: false,
      thumbnail: 'https://picsum.photos/400/300?random=4',
      modules: [
        {
          title: 'Python Basics',
          description: 'Introduction to Python programming',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1500,
          order: 1,
          thumbnail: 'https://picsum.photos/200/150?random=41',
        },
        {
          title: 'NumPy and Pandas',
          description: 'Data manipulation with NumPy and Pandas',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1800,
          order: 2,
          thumbnail: 'https://picsum.photos/200/150?random=42',
        },
      ],
      createdBy: admin2._id,
      rating: 4.7,
      totalRatings: 334,
    });

    const course5 = await Course.create({
      title: 'UI/UX Design Principles',
      description: 'Learn professional UI/UX design principles and create beautiful user interfaces.',
      instructor: 'Lisa Anderson',
      category: 'Design',
      price: 69.99,
      discountedPrice: 34.99,
      isFree: false,
      thumbnail: 'https://picsum.photos/400/300?random=5',
      modules: [
        {
          title: 'Design Fundamentals',
          description: 'Understanding basic design principles',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1200,
          order: 1,
          thumbnail: 'https://picsum.photos/200/150?random=51',
        },
        {
          title: 'Color Theory',
          description: 'Mastering color in design',
          videoUrl: 'https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          duration: 1400,
          order: 2,
          thumbnail: 'https://picsum.photos/200/150?random=52',
        },
      ],
      createdBy: admin1._id,
      rating: 4.5,
      totalRatings: 156,
    });

    console.log('Sample courses created...');

    console.log('\n✅ Database seeded successfully!\n');
    console.log('='.repeat(50));
    console.log('DEFAULT TEST CREDENTIALS:');
    console.log('='.repeat(50));
    console.log('\n📱 ADMIN ACCOUNTS:');
    console.log('   Email: admin@sdkacademy.com');
    console.log('   Password: admin123456');
    console.log('   Name: Owais Khan');
    console.log('   ---');
    console.log('   Email: haris@sdkacademy.com');
    console.log('   Password: admin123456');
    console.log('   Name: Haris Ahmed');
    
    console.log('\n👤 STUDENT ACCOUNTS:');
    console.log('   Email: student@test.com');
    console.log('   Password: student123');
    console.log('   Name: John Doe');
    console.log('   ---');
    console.log('   Email: jane@test.com');
    console.log('   Password: student123');
    console.log('   Name: Jane Smith');
    console.log('   ---');
    console.log('   Email: mike@test.com');
    console.log('   Password: student123');
    console.log('   Name: Mike Wilson');
    
    console.log('\n📚 COURSES CREATED: 5');
    console.log('   - Complete React Native Development (Featured, $49.99)');
    console.log('   - Node.js Backend Development Masterclass ($39.99)');
    console.log('   - Free JavaScript Fundamentals (FREE)');
    console.log('   - Python for Data Science ($29.99)');
    console.log('   - UI/UX Design Principles ($34.99)');
    
    console.log('\n' + '='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
