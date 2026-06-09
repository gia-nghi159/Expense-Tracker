# 💰 Expense Tracker

A full-stack MERN (MongoDB, Express.js, React, Node.js) application designed to help users track their personal finances. Users can easily monitor their income and expenses, view visual representations of their spending habits, and download their financial data.

## ✨ Features

* **User Authentication:** Secure registration and login using JWT (JSON Web Tokens) and bcrypt password hashing.
* **Comprehensive Dashboard:** An interactive overview of total balance, total income, and total expenses.
* **Expense & Income Tracking:** Add, view, and delete individual income and expense transactions.
* **Data Visualization:** Interactive charts built with Recharts, including:
    * Pie charts for financial overviews and source breakdowns.
    * Area charts for analyzing expense trends over time.
    * Bar charts for analyzing income trends.
* **Excel Export:** Download expense and income transaction histories as `.xlsx` files.
* **Customization:** Assign emojis to specific transactions using an integrated emoji picker.

## 🛠️ Tech Stack

** 💻 Frontend**
* React.js
* React Router DOM (Routing)
* Tailwind CSS (Styling)
* Recharts (Data Visualization)
* React Icons (UI Elements)
* Axios (HTTP client)
* Moment.js (Date formatting)
* React Hot Toast (Notifications)

** ⚙️ Backend**
* Node.js & Express.js
* MongoDB & Mongoose
* JSON Web Token (JWT) (Authentication)
* Bcryptjs (Password encryption)
* Multer (File uploading)
* XLSX (Excel file generation)

## 🚀 Getting Started

### 📋 Prerequisites
* Node.js installed on your local machine
* A running MongoDB instance (local or MongoDB Atlas)

### 🔧 Installation

1.  **Clone the repository** (or download the source code).

2.  **Setup the Backend**
    * Navigate to your backend directory:
      ```bash
      cd backend
      ```
    * Install dependencies:
      ```bash
      npm install
      ```
    * Create a `.env` file in the backend root and configure the following variables:
      ```env
      PORT=5000
      MONGO_URI=your_mongodb_connection_string
      JWT_SECRET=your_jwt_secret_key
      CLIENT_URL=http://localhost:3000
      ```
    * Start the server:
      ```bash
      npm start
      ```

3.  **Setup the Frontend**
    * Navigate to your frontend directory:
      ```bash
      cd ../frontend
      ```
    * Install dependencies:
      ```bash
      npm install
      ```
    * Ensure your `axiosInstance` or `apiPaths` utility is pointing to the backend URL (e.g., `http://localhost:5000/api/v1`).
    * Start the React application:
      ```bash
      npm start
      ```

## 🔌 API Reference

### 🔐 Authentication (`/api/v1/auth`)
* `POST /register` - Register a new user
* `POST /login` - Authenticate a user and return a token
* `GET /getUser` - Get current authenticated user details

### 🏠 Dashboard (`/api/v1/dashboard`)
* `GET /` - Retrieve aggregated dashboard data (totals, recent transactions, 30/60-day breakdowns)

### 📈 Income (`/api/v1/income`)
* `POST /add` - Add a new income record
* `GET /get` - Retrieve all income records for the user
* `DELETE /:id` - Delete a specific income record
* `GET /download` - Generate and download an Excel file of income records

### 📉 Expense (`/api/v1/expense`)
* `POST /add` - Add a new expense record
* `GET /get` - Retrieve all expense records for the user
* `DELETE /:id` - Delete a specific expense record
* `GET /download` - Generate and download an Excel file of expense records

## 📂 Folder Structure

A high-level overview of the project's architecture:

```text
├── backend
│   ├── config/          # Database configuration and connection
│   ├── controllers/     # Logic handling for routes
│   ├── middleware/      # Custom middleware (auth checks, file uploads)
│   ├── models/          # Mongoose database schemas
│   ├── routes/          # Express API endpoints
│   └── server.js        # Backend entry point
└── frontend/expensetracker
    ├── public/          # Public assets
    ├── src/
    │   ├── assets/      # Static files, images, and SVGs
    │   ├── components/  # Reusable UI components (Charts, Cards, Forms)
    │   ├── context/     # React context providers
    │   ├── hooks/       # Custom React hooks (e.g., useUserAuth)
    │   ├── pages/       # Main views (Auth, Dashboard)
    │   ├── utils/       # Helper functions and Axios API config
    │   ├── App.jsx      # Main React application component
    │   └── main.jsx     # Frontend entry point
    ├── package.json
    └── vite.config.js   # Vite configuration
