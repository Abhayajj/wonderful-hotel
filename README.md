# 🏨 Wonderlust — Premium Hotel Booking & Discovery Platform

Wonderlust is a full-featured, responsive hotel booking and room discovery web application. Designed to offer a premium customer reservation experience, it implements interactive room listing searches, dynamic rating reviews, secure multi-provider authentication, real-time messaging, and admin analytics.

---

## 🌟 Key Features

### 🔑 Advanced Authentication
- **Local Auth:** Traditional username and password sign-ups secured with Passport Local.
- **Social Logins:** One-click registration using **Google OAuth 2.0** and **Facebook OAuth**.

### 🛎️ Hotel Listings & Reservations
- **Room Listings:** Add, update, delete, or inspect hotel properties with descriptions, photos, pricing, and locations.
- **Dynamic Pricing:** Interactive calculation widget for bookings.
- **Reviews & Ratings:** Five-star scale comment modules for property reviews.

### 💬 Real-Time Messaging & Chat (Socket.io)
- Integrated real-time messaging between guests and hotel administrators.
- Supports live typing indicators, delivery statuses, and read notifications.

### 🛡️ Production-Grade Security
- **Helmet Middleware:** Strict Content Security Policies (CSP) to block malicious scripts and cross-site scripting (XSS).
- **Mongo Sanitize:** Prevents MongoDB query injection attacks.
- **Session Persistence:** Persistent Express sessions backed by Mongoose database store (`connect-mongo`).

---

## 🛠️ Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js (MVC Pattern)
- **Database:** MongoDB (via Mongoose ODM)
- **View Engine:** EJS (Embedded JavaScript) with EJS Mate Layouts
- **Real-Time Websockets:** Socket.io
- **Auth Systems:** Passport.js (Local, Google, Facebook)
- **Payment Processing:** Integrated script hooks for Razorpay

---

## 📁 Repository Structure

```text
wonderful-hotel/
├── init/              # Database seeder scripts and mock listings data
├── models/            # Mongoose schemas (User, Listing, Review, Message)
├── public/            # Client-side static resources (CSS, JS, Fonts, Images)
├── routes/            # Express route groups (Listing, Booking, Admin, Chat)
├── utils/             # Custom error handlers and wrapper functions
├── views/             # EJS templates and page layouts
├── app.js             # Express application initialization & WebSocket handlers
└── schema.js          # Joi data validation schemas
```

---

## ⚙️ Local Setup Guide

### Prerequisites
- Node.js (v16+)
- MongoDB (Local instance or Cloud Atlas Connection URI)

### 1. Installation
1. Clone the repository and navigate to the directory:
   ```bash
   cd wonderful-hotel
   ```
2. Install npm packages:
   ```bash
   npm install
   ```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
ATLASDB_URL=your_mongodb_connection_uri
SESSION_SECRET=your_express_session_secret

# Google OAuth Setup
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth Setup
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

### 3. Run the App
- Run the server in development mode:
  ```bash
  npm run dev
  ```
  *(or `node app.js` if the dev script is not defined).*
- Open `http://localhost:8080` in your web browser.

---

## 🤝 Contributing
Feel free to fork the repository, open issues, and submit pull requests to help improve features and layouts.

---

*Built with ❤️ by Abhay Gupta. Revolutionizing hotel reservation discovery.*
